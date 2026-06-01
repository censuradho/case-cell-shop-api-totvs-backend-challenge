FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---- dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

# ---- builder ----
FROM deps AS builder
COPY . .
RUN pnpm prisma:generate && pnpm build

# ---- production ----
FROM base AS production
ENV NODE_ENV=production

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/src/generated ./src/generated
COPY --chown=node:node package.json ./
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh

RUN chmod +x entrypoint.sh

USER node

EXPOSE 3333
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
