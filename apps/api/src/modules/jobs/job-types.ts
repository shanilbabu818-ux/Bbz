export const FOXIBY_EVENTS_QUEUE = 'foxiby-events';
export const PRODUCT_SCORING_QUEUE = 'foxiby-product-scoring';

export const PRODUCT_CREATED = 'PRODUCT_CREATED';
export const PRODUCT_AI_SCORING_REQUESTED = 'PRODUCT_AI_SCORING_REQUESTED';
export const PRODUCT_PUBLISH_APPROVED = 'PRODUCT_PUBLISH_APPROVED';
export const PRODUCT_PUBLISHED = 'PRODUCT_PUBLISHED';

export type ProductCreatedPayload = {
  productId: string;
  organizationId: string;
};

export type ProductScoringPayload = {
  productId: string;
  organizationId: string;
};

export type ProductWorkflowPayload = {
  productId: string;
  organizationId: string;
  approvedBy?: string;
  publishedBy?: string;
};

export type AiScoreResult = {
  score: number;
  reasons: string[];
};
