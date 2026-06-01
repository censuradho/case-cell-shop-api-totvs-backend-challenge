# CaseCellShop API

API backend para o desafio técnico CaseCellShop — Nível Pleno.

> Os critérios de aceite, escopo e regras de negócio estão descritos em [DESAFIO.md](./DESAFIO.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | NestJS 11 + Fastify |
| ORM | Prisma 7 + PostgreSQL |
| Cache | Redis via `@keyv/redis` + `@nestjs/cache-manager` |
| Fila | BullMQ + Redis |
| Testes | Vitest + vitest-mock-extended |

---

## Como rodar

### Opção 1 — Docker (recomendado para avaliação)

Apenas [Docker](https://www.docker.com/) instalado. Sobe tudo automaticamente: banco, cache, migrations, seed e API.

```bash
docker compose -f docker-compose.prod.yml up --build
```

Aguardar a mensagem `Starting application...` nos logs. Swagger disponível em: `http://localhost:3333/docs`

| Interface | URL |
|---|---|
| Swagger (API docs) | `http://localhost:3333/docs` |
| Bull Board (filas) | `http://localhost:3333/admin/queues` |

> **Nota:** a documentação Swagger está exposta sem autenticação exclusivamente para fins de avaliação. Em produção real, o `/docs` estaria no mínimo protegido por HTTP Basic Auth ou desabilitado completamente.

Para encerrar:
```bash
docker compose -f docker-compose.prod.yml down -v
```

---

### Opção 2 — Local (desenvolvimento)

### Pré-requisitos

- Node.js 20+
- pnpm
- Docker + Docker Compose

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://ccs_user:ccs_pass@localhost:5423/ccs_db
REDIS_URL=redis://localhost:6397
PORT=3333
```

### 2. Subir serviços

```bash
docker compose up -d
```

### 3. Instalar dependências

```bash
pnpm install
```

### 4. Migrations + seed

```bash
npx prisma migrate dev
pnpm seed
```

### 5. Iniciar

```bash
pnpm start:dev
```

Swagger disponível em: `http://localhost:3333/docs`

### Testes

```bash
pnpm test        # unitários
pnpm test:cov    # cobertura
```

### Testes de integração

Requerem containers dedicados (porta `5435` para postgres e `6399` para redis — não conflitam com o ambiente de dev).

```bash
# 1. Subir containers de teste
pnpm test:integration:up

# 2. Rodar os testes (migrations aplicadas automaticamente via globalSetup)
pnpm test:integration

# 3. Derrubar e limpar os containers
pnpm test:integration:down
```

Cenários cobertos:
- **Concorrência de estoque** — `N + 3` checkouts simultâneos para um produto com `stock = N`; valida que exatamente `N` pedidos são criados e o estoque final é `0`
- **Cache-aside** — valida cache miss → dado persistido no Redis → segunda chamada servida do cache mesmo com banco vazio; e que resultado vazio `[]` também é cacheado

---

## Endpoints

### Health

| Método | Rota | Descrição |
|---|---|---|
| GET | `/v1/health` | Verifica conectividade com banco e Redis. Retorna `200` se tudo ok, `503` se degradado |

### Products

| Método | Rota | Descrição |
|---|---|---|
| GET | `/v1/products` | Lista todos os produtos (cache-aside, TTL 1 min) |
| GET | `/v1/products/paginated` | Lista paginada via cursor (cache-aside por cursor+limit, TTL 1 min) |
| GET | `/v1/products/:id` | Produto por ID (cache-aside, TTL 1 min) |

### Orders

| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/checkout` | Inicia checkout assíncrono → 202 Accepted |
| GET | `/v1/orders/:id/status` | Consulta status do pedido |

**Header obrigatório no checkout:**
```
Idempotency-Key: <uuid>
```

**Fluxo de status:** `PENDING → PROCESSING → COMPLETED / FAILED`

---

## Arquitetura

Clean Architecture com NestJS modular. Cada módulo é isolado em quatro camadas:

```
src/modules/<modulo>/
├── domain/           # Entidades, portas (interfaces), erros de domínio
├── application/      # Use cases, queries, DTOs
├── infrastructure/   # Prisma, BullMQ (implementações concretas)
└── presentation/     # Controllers
```

A camada `application` nunca importa de `infrastructure`. A inversão de dependência é feita via tokens NestJS.

### Fluxo do checkout

```
POST /v1/checkout
  │
  ├── Valida Idempotency-Key (retorna pedido existente se duplicado)
  ├── findManyById (1 query para todos os produtos)
  ├── $transaction {
  │     ├── UPDATE products SET stock = stock - qty WHERE stock >= qty (atômico)
  │     └── INSERT order + order_items
  │   }
  └── BullMQ.add({ orderId, requestId }) → 202 Accepted
        │
        └── CheckoutProcessor
              ├── PENDING → PROCESSING
              ├── simulateErpCall (~800ms)
              └── PROCESSING → COMPLETED / FAILED (retry automático)
```

---

## Observabilidade

### Logs estruturados

Todo log segue o formato:

```json
{
  "requestId": "abc123",
  "orderId": "order-xyz",
  "message": "Pedido criado e publicado na fila",
  "context": "CreateOrderUseCase"
}
```

O `requestId` é gerado por request no `RequestIdMiddleware` e propagado até o worker via payload do job BullMQ — criando um trace distribuído de ponta a ponta.

### Métricas

Emitidas como logs estruturados com campo `metric`:

| Métrica | Quando |
|---|---|
| `cache.hit` | Produto encontrado no Redis |
| `cache.miss` | Produto não encontrado no Redis |
| `queue.job.success` | Worker completou com sucesso |
| `queue.job.failure` | Worker falhou após todas as tentativas |

### Exemplo de dashboard Datadog

```
Widget 1 — Cache hit rate
  Query: sum:cache.hit / (sum:cache.hit + sum:cache.miss) * 100
  Alerta: < 70% por 5 min → warning | < 50% → critical

Widget 2 — Checkout success rate
  Query: sum:queue.job.success / (sum:queue.job.success + sum:queue.job.failure) * 100
  Alerta: < 95% por 10 min → critical

Widget 3 — Latência p99 GET /products
  SLO: p99 < 200ms (cache hit) | < 1000ms (cache miss)

Widget 4 — Pedidos por status
  Query: count:order.status{*} by {status}
```

### Runbook — Job failure no checkout

1. Verificar logs com `metric:queue.job.failure` no último intervalo
2. Identificar `orderId` e `requestId` do job com falha
3. Verificar `order.status` no banco — se `FAILED`, confirmar com cliente
4. Reprocessar manualmente: novo `checkoutQueue.add` com mesmo `orderId`
5. Monitorar transição `PENDING → PROCESSING → COMPLETED` nos logs

---

## Parte 1.A — Respostas Conceituais

### Pergunta 1 — Diagnóstico, trade-offs e arquitetura alvo

#### Problema 1: Performance da vitrine

**Causa raiz:** chamadas síncronas ao ERP a cada acesso sem camada de cache. Cada pageview é uma query ao MySQL do ERP.

**Impacto:** alta latência para o cliente, sobrecarga no ERP, risco de indisponibilidade em picos de tráfego.

**Caminhos de solução:**

| Solução | Latência | Consistência | Complexidade |
|---|---|---|---|
| Cache-aside Redis (escolhida) | Baixa (< 10ms hit) | Eventual (TTL) | Baixa |
| Read-through cache | Baixa | Eventual | Média |
| CDN + Edge Cache | Muito baixa | Eventual | Alta |
| Banco próprio sincronizado | Baixa | Eventual | Alta |

**Escolha:** cache-aside com TTL de 1 minuto no Redis. Simples de implementar, tolerável para dados de catálogo. Dado desatualizado por até 1 minuto é aceitável para capinhas de celular.

#### Problema 2: Consistência de estoque

**Causa raiz:** checagem de estoque em dois passos (SELECT + UPDATE) cria race condition TOCTOU. Dois requests simultâneos passam na verificação antes de qualquer um decrementar.

**Impacto:** overselling, cancelamentos pós-venda, prejuízo financeiro e reputacional.

**Caminhos de solução:**

| Solução | Consistência | Throughput | Complexidade |
|---|---|---|---|
| Atomic UPDATE condicional (escolhida) | Forte | Alto | Baixa |
| Lock pessimista (SELECT FOR UPDATE) | Forte | Baixo | Média |
| Reserva de estoque (saga) | Forte | Alto | Alta |
| Distributed lock (Redis) | Forte | Médio | Alta |

**Escolha:** `UPDATE products SET stock = stock - qty WHERE stock >= qty`. Atômico no Postgres, sem overhead de lock explícito. Verifica-e-decrementa em uma única operação.

#### Problema 3: Resiliência do checkout

**Causa raiz:** chamada síncrona ao ERP para faturamento sem timeout/retry. Lentidão ou queda do ERP bloqueia o checkout.

**Impacto:** timeouts para o cliente, perda de vendas, ERP como ponto único de falha.

**Caminhos de solução:**

| Solução | Resiliência | UX | Complexidade |
|---|---|---|---|
| Fila assíncrona + status (escolhida) | Alta | Boa | Média |
| Circuit breaker síncrono | Média | Boa | Média |
| Saga pattern | Alta | Boa | Alta |
| Timeout + retry síncrono | Baixa | Ruim | Baixa |

**Escolha:** BullMQ com retry exponencial (3 tentativas). O cliente recebe 202 imediatamente e consulta o status. O pedido existe no banco desde o início — sem pedido fantasma.

#### Visão de arquitetura 30–90 dias

```
Cliente
  │
  ▼
[ NestJS API ] ←── Redis Cache (vitrine)
  │     │
  │     └──→ [ BullMQ ] ──→ [ CheckoutWorker ] ──→ ERP (faturamento)
  │
  ▼
[ PostgreSQL ] ← banco próprio da loja (products, orders)
  │
  └── Job de reconciliação (cron) ←── ERP MySQL (read-only)
```

**Reconciliação:** job agendado que sincroniza estoque do ERP MySQL para o PostgreSQL local — garante que a reserva atômica local reflete a realidade do ERP.

---

### Pergunta 2 — Cache, invalidação e performance da vitrine

**Onde colocar cache:** camada de query (`GetProductsQuery`) no Redis, chaves `products:all` e `products:{id}`. Evita queries ao banco sem passar pelo controller.

**TTL e estratégia:**
- TTL de 1 minuto: catálogo de baixa mutabilidade
- **Cache-aside:** miss → busca no banco → popula cache → retorna. Hit → retorna direto
- **Sem invalidação manual neste escopo:** expiração natural via TTL. Para estoque crítico (< 5 unidades), invalidação explícita via `cache.del` seria o próximo passo

**Cache stampede:** com alto volume, um lock distribuído (`SET NX EX` no Redis) antes da query ao banco previne múltiplos requests simultâneos reconstruindo o mesmo cache entry.

**Fallback:** se o Redis estiver indisponível, `cacheManager.get` pode ser capturado para fallthrough direto ao banco — degradação graciosa.

**Métricas para validar ganho sem dado obsoleto:**

| Métrica | Target | Propósito |
|---|---|---|
| `cache.hit rate` | > 80% | Cache está sendo útil |
| `p99 GET /products` | < 50ms (hit) | Ganho de latência confirmado |
| `cache.miss spike` | Monitorar pico | Prevenção de stampede |
| `stock_mismatch_rate` | < 0.1% | Dado do cache não diverge do banco |

---

### Pergunta 3 — Observabilidade

**Logs estruturados — campos obrigatórios:**

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "requestId": "req-abc123",
  "orderId": "order-xyz",
  "context": "CheckoutProcessor",
  "message": "Job received — starting checkout processing",
  "attemptsMade": 0
}
```

**Métricas:**

```
# Cache
counter: cache_hits_total{endpoint}
counter: cache_misses_total{endpoint}

# Checkout / Fila
counter: checkout_jobs_success_total
counter: checkout_jobs_failure_total
histogram: checkout_job_duration_ms

# ERP
counter: erp_calls_total
counter: erp_errors_total
histogram: erp_response_time_ms
```

**Traces — GET /products:**
```
[HTTP Request] requestId=abc123
  └── [GetProductsQuery]
        ├── [cache.get] → hit/miss
        └── [IProductRepository.findAll] (se miss)
```

**Traces — POST /checkout:**
```
[HTTP Request] requestId=abc123
  └── [CreateOrderUseCase]
        ├── [findByIdempotencyKey]
        ├── [findManyById]
        ├── [$transaction] { reserveStock × N, createOrder }
        └── [BullMQ.add] jobId=order-xyz, requestId=abc123
              └── [CheckoutProcessor] requestId=abc123 (propagado via payload)
                    └── [simulateErpCall]
```

**SLI/SLO:**

| SLI | SLO | Alerta |
|---|---|---|
| p99 GET /products | < 200ms | > 500ms por 2 min |
| Checkout success rate | > 99% | < 95% por 5 min |
| Cache hit rate | > 75% | < 50% por 5 min |
| Job failure rate | < 1% | > 5% por 10 min |

---

### Pergunta 4 — Concorrência, estoque e idempotência

**Por que checagem simples é insuficiente:**

```
T1: SELECT stock WHERE id='p1' → 1 (ok)
T2: SELECT stock WHERE id='p1' → 1 (ok)
T1: UPDATE stock = stock - 1    → 0
T2: UPDATE stock = stock - 1    → -1  ← overselling
```

**Comparativo:**

| Abordagem | Funcionamento | Trade-off |
|---|---|---|
| Atomic UPDATE (escolhida) | `UPDATE WHERE stock >= qty` — atômico | Sem overhead de lock, ideal para alta concorrência |
| Lock pessimista | `SELECT FOR UPDATE` | Consistência forte, throughput reduzido |
| Reserva de estoque | Reserve → Pay → Confirm | Mais robusto, complexidade alta para este escopo |
| Distributed lock (Redis) | `SET NX EX` | Adiciona latência e ponto de falha extra |

**Idempotência:** `Idempotency-Key` no header + `@unique` no banco. Retry ou duplo clique retorna o pedido existente sem reprocessar — protege contra cobrança duplicada e reserva dupla.

**Como testar:** N requests simultâneos para produto com `stock = N/2`. Após todos completarem: exatamente `N/2` pedidos criados e `stock = 0`.

---

### Pergunta 5 — Mensageria, resiliência, contrato e IA

**Publicar antes ou depois de gravar o pedido:** sempre **depois**. O pedido é persistido com status `PENDING`, depois o job é publicado. Se a fila cair antes do banco persistir, o worker processaria um pedido inexistente (**pedido fantasma**). Na ordem correta, se a fila cair após persistir, temos um pedido `PENDING` sem processamento — recuperável por reconciliação.

**Prevenção de pedido fantasma:** o worker atualiza o status do pedido — se o `orderId` não existir no banco, o job falha sem efeito colateral.

**Prevenção de mensagem fantasma:** `jobId: orderId` no BullMQ garante deduplicação — mesmo que `checkoutQueue.add` seja chamado duas vezes com o mesmo `orderId`, apenas um job é enfileirado.

**Retry:** 3 tentativas com backoff exponencial (1s, 2s, 4s). Após esgotar, `onFailed` marca o pedido como `FAILED` e emite métrica.

**Rastreabilidade:** `requestId` viaja como payload do job — cada log do worker referencia o request HTTP original sem necessidade de OpenTelemetry.

**OpenAPI:** documentação completa via Swagger em `/docs` com schemas de sucesso e erro para todos os endpoints.

---

## Decisões e trade-offs

| Decisão | Alternativa considerada | Motivo da escolha |
|---|---|---|
| Atomic UPDATE para estoque | SELECT FOR UPDATE | Menor overhead, sem bloqueio de linha |
| Idempotency-Key no header | idempotencyKey no body | Padrão de mercado (Stripe, AWS), separa concerns |
| BullMQ com Redis | RabbitMQ, SQS | Redis já usado para cache, infraestrutura compartilhada |
| TTL-based cache invalidation | Event-driven invalidation | Simples e suficiente para catálogo de baixa mutabilidade |
| requestId no payload do job | OpenTelemetry | Trace distribuído sem adicionar SDK pesado |
| Publicar na fila após persistir | Outbox pattern | Outbox seria ideal em produção; risco aceitável no escopo |

## Limitações

- Sem autenticação/autorização
- ERP simulado por `setTimeout` no worker (sem integração real)
- Sem invalidação explícita de cache ao atualizar estoque
- Sem Outbox Pattern (publicação na fila pode falhar após o commit)
- Sem rate limiting
- Sem paginação nos pedidos

---

## Uso de IA

Prompts relevantes utilizados durante o desenvolvimento estão documentados em [PROMPTS.md](./PROMPTS.md).
