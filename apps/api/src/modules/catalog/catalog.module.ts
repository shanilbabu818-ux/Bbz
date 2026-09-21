import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogDbService } from './catalog-db.service';

@Module({ controllers: [CatalogController], providers: [CatalogService, CatalogDbService], exports: [CatalogService, CatalogDbService] })
export class CatalogModule {}
