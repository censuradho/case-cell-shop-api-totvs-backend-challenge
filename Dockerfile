FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# ---- dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --shamefully-hoist

# ---- prod dependencies ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --shamefully-hoist --prod

# ---- builder ----
FROM deps AS builder
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm prisma:generate

COPY . .
RUN pnpm build

# ---- production ----
FROM base AS production
ENV NODE_ENV=production

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/src/generated ./src/generated
COPY --chown=node:node package.json ./
COPY --chown=node:node --chmod=755 docker/entrypoint.sh ./entrypoint.sh

USER node

EXPOSE 3333
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
