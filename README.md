# foxiby backend foundation

## PostgreSQL foundation

This branch now includes a Drizzle ORM database package with PostgreSQL tables for users, products, carts, cart items, orders, and order items. It also includes a PostgreSQL catalog service, migration configuration, and a migration runner.

## Local development

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --filter @foxiby/database db:generate
pnpm --filter @foxiby/database db:migrate
pnpm dev:api
```

The current cart remains in-memory until cart persistence is implemented. Live payments and real customer orders are not ready yet.
