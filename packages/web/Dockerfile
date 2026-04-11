FROM node:22-slim AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/web/ packages/web/
RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter @phosphor/web
RUN pnpm --filter @phosphor/web build

FROM node:22-slim
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/packages/web/dist ./dist
EXPOSE 4200
CMD ["serve", "-s", "dist", "-l", "4200"]
