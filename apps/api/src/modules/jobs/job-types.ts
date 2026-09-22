export const FOXIBY_EVENTS_QUEUE = 'foxiby-events';
export const PRODUCT_SCORING_QUEUE = 'foxiby-product-scoring';

export const PRODUCT_CREATED = 'PRODUCT_CREATED';
export const PRODUCT_AI_SCORING_REQUESTED = 'PRODUCT_AI_SCORING_REQUESTED';

export type ProductCreatedPayload = {
  productId: string;
  organizationId: string;
};

export type ProductScoringPayload = {
  productId: string;
  organizationId: string;
};

export type AiScoreResult = {
  score: number;
  reasons: string[];
};
