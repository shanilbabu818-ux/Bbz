# foxiby deployment

## Render

The repository includes `render.yaml` for the initial Render Blueprint deployment:

1. Create a Render account and connect GitHub.
2. New → Blueprint.
3. Select `shanilbabu818-ux/Bbz`.
4. Choose branch `feature/foxiby-backend`.
5. Review the API, storefront, PostgreSQL, and Redis services.
6. Set secrets in Render rather than committing them to GitHub.

Required production values include `DATABASE_URL`, `REDIS_URL`, and any future supplier or payment credentials. Render will provide database and Redis connection values through the blueprint.

## Domains

After the storefront deploys, add `foxiby.in` and `www.foxiby.in` to the storefront service. Add `api.foxiby.in` to the API service. Render will display the DNS records required at the domain registrar and provision HTTPS after verification.

## Current readiness

The storefront is a static prototype and the API foundation builds as a Node service. The cart is still in-memory, payment and supplier fulfillment are not production-ready, and the worker service remains a placeholder until BullMQ jobs are implemented.
