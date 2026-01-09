/**
 * Pure functions for TranslationCard component
 * Extracted for testability following the project's testing strategy
 */

export const MIN_POPUP_WIDTH = 280;
export const MIN_POPUP_HEIGHT = 60;
export const INITIAL_POPUP_HEIGHT = 180;
export const POPUP_EDGE_MARGIN = 32; // 16px margin on each side

/**
 * Calculate popup width based on selection width, clamped to min/max bounds
 * @param selectionWidth - Width of the text selection bounding box
 * @param maxWidth - Maximum allowed popup width (typically viewport width - margin)
 * @returns Clamped popup width
 */
export function calculatePopupWidth(
  selectionWidth: number,
  maxWidth: number
): number {
  return Math.min(Math.max(selectionWidth, MIN_POPUP_WIDTH), maxWidth);
}

/**
 * Calculate maximum popup width based on viewport width
 * @param viewportWidth - Current viewport width
 * @returns Maximum allowed popup width
 */
export function calculateMaxPopupWidth(viewportWidth: number): number {
  return viewportWidth - POPUP_EDGE_MARGIN;
}

/**
 * Calculate maximum popup height based on viewport height
 * @param viewportHeight - Current viewport height
 * @returns Maximum allowed popup height
 */
export function calculateMaxPopupHeight(viewportHeight: number): number {
  return viewportHeight - POPUP_EDGE_MARGIN;
}
