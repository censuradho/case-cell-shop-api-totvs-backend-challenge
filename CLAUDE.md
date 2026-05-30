# nicell-api

API de gestão de assistência técnica. Gerencia ordens de serviço, orçamentos, parceiros, produtos, vendas, financeiro e notificações.

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS 11 com Fastify
- **ORM:** Prisma 7 + PostgreSQL (driver `@prisma/adapter-pg`)
- **Cache:** Redis via `@keyv/redis` + `@nestjs/cache-manager`
- **IDs:** `nanoid` (strings) — nunca auto-increment do banco para IDs primários
- **Testes:** Vitest + `vitest-mock-extended`

## Arquitetura

Clean Architecture com NestJS. Cada módulo é isolado em quatro camadas:

```
src/modules/<modulo>/
├── domain/             # Entidades, tipos, constantes de domínio
├── application/
│   ├── dtos/           # Request/Response DTOs
│   ├── ports/          # Interfaces abstratas (repositórios, unit of work)
│   ├── queries/        # Leitura sem efeito colateral (sufixo Query)
│   └── use-cases/      # Escrita / orquestração (sufixo UseCase)
├── infrastructure/
│   └── prisma/         # Implementações concretas dos repositórios
└── presentation/
    └── <modulo>.controller.ts
```

A camada de `application` nunca importa de `infrastructure`. A inversão de dependência é feita via tokens NestJS nos módulos.

## Módulos


## Padrões

### Repositório + Unit of Work
Operações de leitura simples usam o repositório diretamente (`IServiceOrderRepository`).
Operações que envolvem múltiplas entidades em transação usam `UnitOfWork` — o contexto transacional expõe repos transacionais (`IServiceOrderUnitOfWork → IServiceOrderTransactionContext`).

### Queries vs Use Cases
- Leitura sem efeito: classe com sufixo `Query` (ex: `GetPartnerKpiQuery`)
- Escrita/orquestração: classe com sufixo `UseCase` (ex: `CreateServiceOrderUseCase`)

### DTOs de resposta
Response DTO **só deve ser criado** quando o retorno difere da entidade — campos omitidos, renomeados ou computados. Se o retorno é 1:1 com a entidade, retorna a entidade diretamente sem criar um DTO intermediário.

### Nomenclatura de variáveis
Sempre nomes completos e descritivos. Nunca abreviações como `p`, `r`, `v`, `i`, `arr`.

### IDs
Chaves primárias são strings geradas com `nanoid()`.

### Testes unitários
Toda classe que contém lógica de negócio **deve** ter arquivo `.spec.ts` correspondente:
- `UseCase`: sempre tem teste — cobrir caminho feliz, cada erro de negócio e casos de borda
- `Query`: só tem teste se contiver lógica observável — cache-aside, validação de existência, transformação de dados. Query que apenas delega ao repositório não precisa de teste
- Dependências externas (repositórios, cache, fila) devem ser mockadas com `vitest-mock-extended`
- Os testes ficam em `test/` na raiz do projeto, espelhando a estrutura de pastas do módulo correspondente (ex: `test/modules/products/application/queries/get-products.query.spec.ts`)
- Nomenclatura de `describe`/`it` em português, descrevendo o comportamento esperado (ex: `it('deve lançar erro quando estoque for insuficiente')`)
- Nunca testar detalhes de implementação — testar comportamento observável
- Mínimo de cobertura esperado: todos os branches de negócio (condicionais de domínio)

### Testes de Integração (Concorrência e Cache)
- **Cenários obrigatórios**: Pelo menos um teste deve validar a consistência de estoque sob concorrência e o comportamento de cache-aside.
- **Ambiente**: Diferente dos testes unitários, os testes de integração **não** devem usar mocks para o banco de dados (Prisma) ou cache (Redis). Eles devem interagir diretamente com containers reais de teste (utilizando o Docker Compose).
- **Limpeza**: Garantir que cada teste limpe as tabelas do banco e dê `FLUSHALL` no Redis antes ou depois de rodar (`beforeEach`/`afterEach`) para evitar interferência entre os cenários.
- **Nomenclatura**: Arquivos de integração devem usar a extensão `.integration.spec.ts` para separação clara na execução do Vitest.

### Swagger
Todo novo endpoint deve ter documentação Swagger completa:
- `@ApiTags` no controller
- `@ApiOperation` com `summary` e `description` explicando o que o endpoint faz
- `@ApiResponse` para cada status possível (sucesso, erros de negócio, validação, não encontrado)
- `@ApiParam` / `@ApiQuery` para parâmetros de rota e query string
- `@ApiHeader` para headers obrigatórios (ex: `Idempotency-Key`)
- DTOs de request e response com `@ApiProperty` em todos os campos, incluindo `description`, `example` e `required`
- Enums documentados com `@ApiProperty({ enum: MyEnum })`

### Valores monetários
Sempre usar o tipo `Decimal` nativo do Prisma (`@db.Decimal(10, 2)` no schema). Nunca usar `Float` ou `Int` para representar dinheiro.

## Comandos

```bash
pnpm start:dev          # desenvolvimento com watch
pnpm test               # vitest
pnpm test:cov           # cobertura
pnpm prisma:generate    # regenerar Prisma client após mudança no schema
npx prisma migrate dev  # criar e aplicar migration
```
