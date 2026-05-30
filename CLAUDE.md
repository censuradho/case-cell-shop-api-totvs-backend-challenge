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

## Comandos

```bash
pnpm start:dev          # desenvolvimento com watch
pnpm test               # vitest
pnpm test:cov           # cobertura
pnpm prisma:generate    # regenerar Prisma client após mudança no schema
npx prisma migrate dev  # criar e aplicar migration
```
