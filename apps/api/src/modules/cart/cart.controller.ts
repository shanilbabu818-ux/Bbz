import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CartService } from './cart.service';

class AddCartItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

@Controller('cart')
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get()
  get(@Headers('x-cart-id') cartId?: string) { return { data: this.carts.get(cartId) }; }

  @Post('items')
  add(@Headers('x-cart-id') cartId: string | undefined, @Body() body: AddCartItemDto) {
    return { data: this.carts.add(cartId, body.productId, body.quantity) };
  }
}
