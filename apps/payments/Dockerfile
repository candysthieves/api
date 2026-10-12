FROM node:24.18-alpine

ARG port=3003

ENV PORT=$port

RUN corepack enable

USER node

WORKDIR /home/node

COPY --chown=node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node apps/payments/src/env/load-env.ts ./apps/payments/src/env/load-env.ts

RUN pnpm install --frozen-lockfile

COPY --chown=node . .

RUN pnpm run build:payments

EXPOSE ${PORT}

CMD ["pnpm", "run", "payments:start:prod"]
