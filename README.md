# foxiby backend foundation

Initial API foundation for foxiby, a custom dropshipping platform.

## Included

- NestJS API using Fastify
- Global validation and `/v1` API prefix
- Health endpoint at `GET /v1/health`
- Product listing at `GET /v1/products`
- Product details at `GET /v1/products/:slug`
- In-memory cart at `GET /v1/cart` and `POST /v1/cart/items`
- Supplier adapter contract for CJdropshipping integration
- PostgreSQL and Redis Docker services
- Environment variable template

## Local development

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm dev:api
```

The current product and cart stores are intentionally in-memory for development. PostgreSQL persistence, authentication, checkout, payments, fulfillment, and workers are the next production modules.
