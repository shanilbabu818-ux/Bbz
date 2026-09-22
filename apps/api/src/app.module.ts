import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, AuthModule, CatalogModule, OutboxModule, SuppliersModule],
})
export class AppModule {}
