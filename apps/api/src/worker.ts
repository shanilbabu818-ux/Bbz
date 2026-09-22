import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OutboxService } from './modules/outbox/outbox.service';
import { ShopifyReconciliationService } from './modules/shopify/shopify-reconciliation.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const outbox = app.get(OutboxService);
  const reconciliation = app.get(ShopifyReconciliationService);
  const outboxIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5000);
  const reconciliationIntervalMs = Number(process.env.SHOPIFY_RECONCILIATION_INTERVAL_MS ?? 300000);

  const publish = async () => {
    try { await outbox.publishPending(); } catch (error) { console.error('Outbox publisher failed', error); }
  };
  const reconcile = async () => {
    try { await reconciliation.runOnce(); } catch (error) { console.error('Shopify reconciliation failed', error); }
  };

  await publish();
  await reconcile();
  const outboxTimer = setInterval(() => void publish(), outboxIntervalMs);
  const reconciliationTimer = setInterval(() => void reconcile(), reconciliationIntervalMs);
  const shutdown = async () => {
    clearInterval(outboxTimer);
    clearInterval(reconciliationTimer);
    await app.close();
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void run();
