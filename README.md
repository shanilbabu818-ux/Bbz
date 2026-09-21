# foxiby backend foundation

Initial API foundation for foxiby, a custom dropshipping platform.

## Included

- NestJS API using Fastify
- Global validation and `/v1` API prefix
- Health endpoint at `GET /v1/health`
- Catalog endpoint at `GET /v1/products`
- Supplier adapter contract for CJdropshipping integration
- PostgreSQL and Redis Docker services
- Environment variable template

## Local development

```bash
cp .env.example .env
pnpm install
pnpm dev:api
```

Start infrastructure with:

```bash
docker compose up -d
```

This branch is a foundation. Database migrations, authentication, carts, checkout, payments, fulfillment workers, and the CJdropshipping implementation are planned for the next increments.
