FROM node:24.18-alpine

ARG port
ARG service

ENV SERVICE=$service
ENV PORT=$port

RUN corepack enable

USER node

WORKDIR /home/node

COPY --chown=node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node apps/files/src/env/load-env.ts ./apps/files/src/env/load-env.ts

RUN pnpm install --frozen-lockfile

COPY --chown=node . .

RUN pnpm run build:${SERVICE}

EXPOSE ${PORT}

CMD npm run start:${SERVICE}