# ---- Base ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY app/package.json ./app/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --filter app

# ---- Build ----
FROM deps AS build
WORKDIR /app
COPY app/ ./app/
RUN pnpm --filter app run build

# ---- Production ----
FROM node:22-slim AS production
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nuxtuser

WORKDIR /app
COPY --from=build --chown=nuxtuser:nodejs /app/app/.output ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000
USER nuxtuser

CMD ["node", "server/index.mjs"]
