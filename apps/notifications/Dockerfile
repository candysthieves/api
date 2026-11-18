FROM node:24.18-alpine

ENV NODE_ENV=production
ENV PORT=3010

RUN corepack enable

USER node
WORKDIR /home/node

COPY --chown=node package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --prod=false

COPY --chown=node . .

RUN pnpm run build:notifications

EXPOSE 3010 3011

CMD ["node", "dist/apps/notifications/main.js"]
