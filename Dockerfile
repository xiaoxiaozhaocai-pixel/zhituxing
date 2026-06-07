FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_LINT=false
ENV SENTRY_AUTH_TOKEN=dummy

RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=0 /app/.next/standalone ./
COPY --from=0 /app/.next/static ./.next/static
COPY --from=0 /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
