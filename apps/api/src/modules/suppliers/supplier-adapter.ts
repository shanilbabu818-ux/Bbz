export interface SupplierProductVariant {
  externalId: string;
  sku?: string;
  cost: number;
  inventory: number;
}

export interface SupplierProduct {
  externalId: string;
  title: string;
  description?: string;
  images: string[];
  variants: SupplierProductVariant[];
}

export interface SupplierAdapter {
  searchProducts(query: string): Promise<SupplierProduct[]>;
  getProduct(externalId: string): Promise<SupplierProduct>;
  getInventory(externalId: string): Promise<number>;
  createOrder(input: unknown): Promise<{ externalOrderId: string }>;
  getOrderStatus(externalOrderId: string): Promise<{ status: string }>;
  getTracking(externalOrderId: string): Promise<{ trackingNumber?: string }>;
}
