import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ShopifyProductInput = { title: string; description?: string | null; price: string; images: string[]; foxibyProductId: string };
export type ShopifyProductResult = { externalProductId: string; adminUrl?: string };
export type ShopifyFailureKind = 'RETRYABLE' | 'RATE_LIMITED' | 'PERMANENT' | 'AUTHENTICATION';

export class ShopifyApiError extends Error {
  constructor(message: string, readonly kind: ShopifyFailureKind, readonly retryAfterMs?: number, readonly status?: number) { super(message); }
}

export interface ShopifyAdapter {
  createProduct(input: ShopifyProductInput, idempotencyKey: string): Promise<ShopifyProductResult>;
  findProduct(foxibyProductId: string): Promise<ShopifyProductResult | null>;
}

@Injectable()
export class ShopifyHttpAdapter implements ShopifyAdapter {
  constructor(private readonly config: ConfigService) {}

  async createProduct(input: ShopifyProductInput, idempotencyKey: string): Promise<ShopifyProductResult> {
    const response = await this.request('/products.json', { method: 'POST', body: { product: { title: input.title, body_html: input.description ?? '', status: 'draft', tags: [`foxiby:${input.foxibyProductId}`], variants: [{ price: input.price }], images: input.images.map((src) => ({ src })) } }, headers: { 'X-Foxiby-Idempotency-Key': idempotencyKey });
    const body = response as { product?: { id?: number; admin_graphql_api_id?: string } };
    if (!body.product?.id) throw new ShopifyApiError('Shopify response did not contain a product id', 'RETRYABLE');
    return { externalProductId: String(body.product.id), adminUrl: body.product.admin_graphql_api_id };
  }

  async findProduct(foxibyProductId: string): Promise<ShopifyProductResult | null> {
    const body = await this.request(`/products.json?limit=250&tag=foxiby:${encodeURIComponent(foxibyProductId)}`, { method: 'GET' }) as { products?: Array<{ id?: number; admin_graphql_api_id?: string }> };
    const product = body.products?.[0];
    return product?.id ? { externalProductId: String(product.id), adminUrl: product.admin_graphql_api_id } : null;
  }

  private async request(path: string, options: { method: string; body?: unknown; headers?: Record<string, string> }): Promise<unknown> {
    const baseUrl = this.config.get<string>('SHOPIFY_API_BASE_URL');
    const token = this.config.get<string>('SHOPIFY_ACCESS_TOKEN');
    if (!baseUrl || !token) throw new ServiceUnavailableException('Shopify integration is not configured');
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { method: options.method, headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token, ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined, signal: AbortSignal.timeout(Number(this.config.get('SHOPIFY_REQUEST_TIMEOUT_MS', 15000))) });
    } catch (error) {
      throw new ShopifyApiError(error instanceof Error ? error.message : 'Shopify network error', 'RETRYABLE');
    }
    if (response.ok) return response.json();
    const retryAfter = Number(response.headers.get('retry-after') ?? 0);
    const status = response.status;
    const kind: ShopifyFailureKind = status === 401 || status === 403 ? 'AUTHENTICATION' : status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'RETRYABLE' : 'PERMANENT';
    throw new ShopifyApiError(`Shopify request failed with status ${status}`, kind, retryAfter > 0 ? retryAfter * 1000 : undefined, status);
  }
}
