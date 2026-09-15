# Check out https://hub.docker.com/_/node to select a new base image
FROM node:24.18-alpine
ARG port=3001
ARG service=main
ENV SERVICE=$service
ENV PORT=$port

RUN corepack enable

USER node

# Create app directory (with user `node`)
RUN mkdir -p /home/node/dist/${SERVICE}

WORKDIR /home/node/dist/${SERVICE}

COPY --chown=node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node apps/main/prisma ./apps/main/prisma
COPY --chown=node apps/main/prisma.config.ts ./apps/main/prisma.config.ts
COPY --chown=node apps/main/src/env/load-env.ts ./apps/main/src/env/load-env.ts

RUN pnpm install --frozen-lockfile

# Bundle app source code
COPY --chown=node . .

RUN pnpm run prisma:generate
RUN pnpm run build:${SERVICE}

# Bind to all network interfaces so that it can be mapped to the host OS

EXPOSE ${PORT}

CMD ["pnpm", "run", "start:prod"]
