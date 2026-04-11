FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/server/ packages/server/
RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter @phosphor/server
RUN pnpm --filter @phosphor/server build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/packages/server/dist ./dist
COPY --from=build /app/packages/server/node_modules ./node_modules
COPY --from=build /app/packages/server/package.json .
EXPOSE 4100
CMD ["node", "dist/index.js"]
