/**
 * Pure functions for TranslationCard component
 * Extracted for testability following the project's testing strategy
 */

export const MIN_CARD_WIDTH = 280;
export const MIN_CARD_HEIGHT = 60;
export const INITIAL_CARD_HEIGHT = 180;
export const CARD_EDGE_MARGIN = 32; // 16px margin on each side

/**
 * Calculate card width based on selection width, clamped to min/max bounds
 * @param selectionWidth - Width of the text selection bounding box
 * @param maxWidth - Maximum allowed card width (typically viewport width - margin)
 * @returns Clamped card width
 */
export function calculateCardWidth(
  selectionWidth: number,
  maxWidth: number
): number {
  return Math.min(Math.max(selectionWidth, MIN_CARD_WIDTH), maxWidth);
}

/**
 * Calculate maximum card width based on viewport width
 * @param viewportWidth - Current viewport width
 * @returns Maximum allowed card width
 */
export function calculateMaxCardWidth(viewportWidth: number): number {
  return viewportWidth - CARD_EDGE_MARGIN;
}

/**
 * Calculate maximum card height based on viewport height
 * @param viewportHeight - Current viewport height
 * @returns Maximum allowed card height
 */
export function calculateMaxCardHeight(viewportHeight: number): number {
  return viewportHeight - CARD_EDGE_MARGIN;
}
