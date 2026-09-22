import { Injectable } from '@nestjs/common';
import { prisma } from '@foxiby/database';
import type { AiScoreResult } from './job-types';

@Injectable()
export class AiScoringService {
  async scoreProduct(productId: string): Promise<AiScoreResult> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error(`Product ${productId} was not found`);

    const title = product.title.toLowerCase();
    const reasons: string[] = [];
    let score = 50;

    if (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      score += 15;
      reasons.push('Product has images');
    }
    if (product.description && product.description.length >= 80) {
      score += 10;
      reasons.push('Product has a detailed description');
    }
    if (Number(product.sellingPrice) > Number(product.cost)) {
      score += 15;
      reasons.push('Selling price is above supplier cost');
    }
    if (/premium|quality|smart|portable|organic/.test(title)) {
      score += 5;
      reasons.push('Title contains a positive commercial signal');
    }

    return { score: Math.min(score, 100), reasons };
  }
}
