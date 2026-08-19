# syntax=docker/dockerfile:1

FROM docker.io/oven/bun:1.3.11 AS build

WORKDIR /app

ENV NITRO_PRESET=node-server

RUN apt-get update \
    && apt-get install --no-install-recommends -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM docker.io/library/node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DB_FILE_NAME=/data/solan.sqlite \
    BETTER_AUTH_SECRET=solan_default_secret_please_change

WORKDIR /app

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app app \
    && mkdir -p /data \
    && chown -R app:app /data /app

COPY --from=build --chown=app:app /app/.output /app/.output
COPY --from=build --chown=app:app /app/drizzle /app/drizzle

USER app

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
