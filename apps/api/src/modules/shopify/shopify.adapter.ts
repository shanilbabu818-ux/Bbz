import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ShopifyProductInput = {
  title: string;
  description?: string | null;
  price: string;
  images: string[];
};

export type ShopifyProductResult = {
  externalProductId: string;
  adminUrl?: string;
};

export interface ShopifyAdapter {
  createProduct(input: ShopifyProductInput, idempotencyKey: string): Promise<ShopifyProductResult>;
}

@Injectable()
export class ShopifyHttpAdapter implements ShopifyAdapter {
  constructor(private readonly config: ConfigService) {}

  async createProduct(input: ShopifyProductInput, idempotencyKey: string): Promise<ShopifyProductResult> {
    const baseUrl = this.config.get<string>('SHOPIFY_API_BASE_URL');
    const token = this.config.get<string>('SHOPIFY_ACCESS_TOKEN');
    if (!baseUrl || !token) throw new ServiceUnavailableException('Shopify integration is not configured');

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
        'X-Foxiby-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ product: {
        title: input.title,
        body_html: input.description ?? '',
        status: 'draft',
        variants: [{ price: input.price }],
        images: input.images.map((src) => ({ src })),
      } }),
    });

    if (!response.ok) throw new Error(`Shopify product creation failed with status ${response.status}`);
    const body = await response.json() as { product?: { id?: number; admin_graphql_api_id?: string } };
    const productId = body.product?.id;
    if (!productId) throw new Error('Shopify response did not contain a product id');
    return { externalProductId: String(productId), adminUrl: body.product?.admin_graphql_api_id };
  }
}
