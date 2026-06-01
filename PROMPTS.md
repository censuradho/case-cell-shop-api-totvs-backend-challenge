# Uso de IA

Este projeto foi desenvolvido com auxílio do **Claude Code** (Anthropic) como assistente de desenvolvimento. O uso foi conversacional, discutindo decisões de arquitetura, revisando trade-offs e implementando funcionalidades em conjunto, não por prompts isolados.

## Como a IA foi utilizada

### Decisões de arquitetura

O uso de **abstract classes como tokens de DI** no NestJS em vez de string constants foi discutido e implementado aproveitando `emitDecoratorMetadata` para eliminar `@Inject` explícitos. A estratégia de **cache-aside** com TTL de 1 minuto e invalidação explícita após reserva de estoque também foi definida em conjunto, assim como a escolha do padrão **atomic UPDATE condicional** (`UPDATE WHERE stock >= qty`) para consistência de estoque sob concorrência.

### Testes

A estruturação dos **testes de integração** com Vitest, containers reais via Docker Compose e separação entre unit/integration via configs distintas foi feita com auxílio da IA. Bugs nos testes unitários também foram diagnosticados e corrigidos em conjunto, incluindo o argumento `cacheManager` ausente no construtor e o TTL divergente entre código e spec.

### Infraestrutura e CI/CD

A otimização do **Dockerfile multi-stage** envolveu discussões sobre corepack, `--mount=type=cache` para o pnpm store, separação do `prisma:generate` do `pnpm build` para melhor cache de layers e stage `prod-deps` com `--prod`. A configuração do **GitHub Actions** com jobs sequenciais (unit → integration → docker build), cache do pnpm e serviços Docker para testes de integração também foi estruturada com apoio da IA.

### Diferenciais de produção

O **health endpoint** (`GET /v1/health`) com deep check em banco e Redis, a integração do **Bull Board** (`/admin/queues`) para visualização dos jobs BullMQ em tempo real e o **graceful shutdown** via `app.enableShutdownHooks()` e `OnModuleDestroy` no `PrismaService` foram implementados como diferenciais sugeridos e discutidos durante o desenvolvimento.

## Postura de uso

Todas as sugestões foram revisadas, questionadas quando necessário e adaptadas ao contexto do desafio. A IA foi usada como par de desenvolvimento, acelerando implementação e discutindo trade-offs, não como substituto do raciocínio técnico.
