export enum EventStatus {
  DRAFT = 'draft',
  OPEN = 'collecting_responses',
  CLOSED = 'closed',
  GENERATING_RECOMMENDATIONS = 'generating_recommendations',
  RECOMMENDATIONS_READY = 'recommendations_ready',
  FINALIZED = 'finalized',
  FINAL_SELECTION_MADE = 'final_selection_made',
  CANCELLED = 'cancelled',
  // Kept for backward compatibility
  COLLECTING_RESPONSES = 'collecting_responses',
  RECOMMENDED = 'recommended',
}
