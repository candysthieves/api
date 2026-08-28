FROM node:24.18-alpine
ARG port
ARG service
ENV SERVICE=$service
ENV PORT=$port

RUN corepack enable

USER node

# Create app directory (with user `node`)
RUN mkdir -p /home/node/dist/${SERVICE}

WORKDIR /home/node/dist/${SERVICE}

COPY --chown=node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node apps/files/src/env/load-env.ts ./apps/files/src/env/load-env.ts

RUN pnpm install --frozen-lockfile

# Bundle app source code
COPY --chown=node . .

RUN pnpm run build:${SERVICE}
RUN mkdir -p dist/apps/files/assets \
  && cp -R apps/files/src/assets/. dist/apps/files/assets/

# Bind to all network interfaces so that it can be mapped to the host OS

EXPOSE ${PORT}

CMD npm run 'start:files'
