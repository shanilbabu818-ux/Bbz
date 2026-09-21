import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@foxiby/database';
import { products } from '@foxiby/database/schema';
import { eq, ilike, and } from 'drizzle-orm';

@Injectable()
export class CatalogDbService {
  async list(search?: string, category?: string) {
    const filters = [];
    if (category) filters.push(eq(products.category, category));
    if (search) filters.push(ilike(products.title, `%${search}%`));
    return db.select().from(products).where(filters.length ? and(...filters) : undefined);
  }

  async getBySlug(slug: string) {
    const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!result[0]) throw new NotFoundException('Product not found');
    return result[0];
  }
}
