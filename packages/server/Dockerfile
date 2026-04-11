FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/server/ packages/server/
RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter @prosperus/server
RUN pnpm --filter @prosperus/server build
RUN pnpm --filter @prosperus/server deploy --prod --legacy /app/deploy
RUN cp -r /app/packages/server/dist /app/deploy/dist

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/deploy .
EXPOSE 4100
CMD ["node", "dist/index.js"]
