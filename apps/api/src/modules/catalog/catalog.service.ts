import { Injectable } from '@nestjs/common';

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: 'USD';
  inventory: number;
  image: string;
};

@Injectable()
export class CatalogService {
  private readonly products: Product[] = [
    { id: 'prod_candle', slug: 'soft-glow-candle', title: 'Soft Glow Candle', description: 'A warm everyday candle for quiet evenings.', category: 'home', price: 24, currency: 'USD', inventory: 20, image: '🕯️' },
    { id: 'prod_buds', slug: 'everyday-audio-buds', title: 'Everyday Audio Buds', description: 'Compact wireless audio for daily routines.', category: 'tech', price: 39, currency: 'USD', inventory: 32, image: '🎧' },
    { id: 'prod_skin', slug: 'cloud-skin-set', title: 'Cloud Skin Set', description: 'A simple self-care set for your routine.', category: 'beauty', price: 32, currency: 'USD', inventory: 15, image: '🧴' },
    { id: 'prod_tote', slug: 'carry-all-mini-tote', title: 'Carry-All Mini Tote', description: 'A small, useful tote for everyday carry.', category: 'lifestyle', price: 28, currency: 'USD', inventory: 24, image: '👜' },
  ];

  list(search?: string, category?: string): Product[] {
    const term = search?.trim().toLowerCase();
    return this.products.filter((product) =>
      (!category || product.category === category) &&
      (!term || `${product.title} ${product.description}`.toLowerCase().includes(term)),
    );
  }

  findById(id: string): Product | undefined { return this.products.find((product) => product.id === id); }
  findBySlug(slug: string): Product | undefined { return this.products.find((product) => product.slug === slug); }
}
