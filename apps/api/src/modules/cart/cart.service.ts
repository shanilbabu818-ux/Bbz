import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CatalogService } from '../catalog/catalog.service';

export type CartItem = { productId: string; quantity: number };
export type Cart = { id: string; items: CartItem[]; updatedAt: string };

@Injectable()
export class CartService {
  private readonly carts = new Map<string, Cart>();

  constructor(private readonly catalog: CatalogService) {}

  get(cartId?: string): Cart {
    if (cartId && this.carts.has(cartId)) return this.carts.get(cartId)!;
    const cart = { id: randomUUID(), items: [], updatedAt: new Date().toISOString() };
    this.carts.set(cart.id, cart);
    return cart;
  }

  add(cartId: string | undefined, productId: string, quantity: number): Cart {
    const product = this.catalog.findById(productId);
    if (!product) throw new Error('Product not found');
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive integer');
    const cart = this.get(cartId);
    const item = cart.items.find((entry) => entry.productId === productId);
    if (item) item.quantity += quantity;
    else cart.items.push({ productId, quantity });
    cart.updatedAt = new Date().toISOString();
    this.carts.set(cart.id, cart);
    return cart;
  }
}
