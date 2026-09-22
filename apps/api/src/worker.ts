import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OutboxService } from './modules/outbox/outbox.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const outbox = app.get(OutboxService);
  const intervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5000);

  const publish = async () => {
    try {
      await outbox.publishPending();
    } catch (error) {
      console.error('Outbox publisher failed', error);
    }
  };

  await publish();
  const timer = setInterval(() => void publish(), intervalMs);
  const shutdown = async () => {
    clearInterval(timer);
    await app.close();
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void run();
