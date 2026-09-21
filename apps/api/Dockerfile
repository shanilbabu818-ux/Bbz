FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @foxiby/database build
RUN pnpm --filter @foxiby/api build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app /app
EXPOSE 3001
CMD ["pnpm", "--filter", "@foxiby/api", "start"]
