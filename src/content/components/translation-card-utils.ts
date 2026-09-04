/**
 * Pure functions for TranslationCard component
 * Extracted for testability following the project's testing strategy
 */

export const MIN_CARD_WIDTH = 280;
export const MIN_CARD_HEIGHT = 120;
export const INITIAL_CARD_HEIGHT = 160;
export const CARD_EDGE_MARGIN = 32; // 16px margin on each side
export const AUTO_GROW_VIEWPORT_RATIO = 0.72;

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
  const safeMaxWidth = Math.max(1, maxWidth);
  const safeMinWidth = Math.min(MIN_CARD_WIDTH, safeMaxWidth);
  return Math.min(Math.max(selectionWidth, safeMinWidth), safeMaxWidth);
}

/**
 * Calculate maximum card width based on viewport width
 * @param viewportWidth - Current viewport width
 * @returns Maximum allowed card width
 */
export function calculateMaxCardWidth(viewportWidth: number): number {
  return Math.max(1, viewportWidth - CARD_EDGE_MARGIN);
}

/**
 * Calculate maximum card height based on viewport height
 * @param viewportHeight - Current viewport height
 * @returns Maximum allowed card height
 */
export function calculateMaxCardHeight(viewportHeight: number): number {
  return Math.max(1, viewportHeight - CARD_EDGE_MARGIN);
}

export function calculateAutoGrowHeight(
  currentCardHeight: number,
  bodyClientHeight: number,
  contentScrollHeight: number,
  minHeight: number,
  maxHeight: number
): number {
  const fixedCardHeight = Math.max(0, currentCardHeight - bodyClientHeight);
  const contentHeight = fixedCardHeight + contentScrollHeight;
  return Math.min(maxHeight, Math.max(minHeight, contentHeight));
}

export function calculateAutoGrowLimit(
  viewportHeight: number,
  maxHeight: number
): number {
  const viewportLimit = Math.floor(viewportHeight * AUTO_GROW_VIEWPORT_RATIO);
  return Math.min(maxHeight, viewportLimit);
}
