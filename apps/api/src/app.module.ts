import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CartModule } from './modules/cart/cart.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, CatalogModule, SuppliersModule, CartModule],
})
export class AppModule {}
