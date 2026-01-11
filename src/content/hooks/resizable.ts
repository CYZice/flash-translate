// Pure functions for resize calculation logic
// These are extracted from useResizable hook for testability

/**
 * Resize constraints for width
 */
export interface ResizeConstraints {
  minWidth: number;
  maxWidth: number;
  edgeMargin: number;
}

/**
 * Resize constraints for height
 */
export interface HeightResizeConstraints {
  minHeight: number;
  maxHeight: number;
  edgeMargin: number;
}

/**
 * Parameters for left handle resize calculation
 */
export interface LeftResizeParams {
  deltaX: number;
  startWidth: number;
  startOffsetX: number;
  cardLeft: number;
  constraints: ResizeConstraints;
}

/**
 * Result of left handle resize calculation
 */
export interface LeftResizeResult {
  newWidth: number;
  newOffsetX: number;
}

/**
 * Parameters for right handle resize calculation
 */
export interface RightResizeParams {
  deltaX: number;
  startWidth: number;
  cardRight: number;
  viewportWidth: number;
  constraints: ResizeConstraints;
}

/**
 * Result of right handle resize calculation
 */
export interface RightResizeResult {
  newWidth: number;
}

/**
 * Clamp a width value to min/max bounds
 */
export function clampWidth(
  width: number,
  minWidth: number,
  maxWidth: number
): number {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

/**
 * Calculate maximum expansion possible for left handle
 */
export function calculateMaxLeftExpansion(
  cardLeft: number,
  edgeMargin: number
): number {
  return cardLeft - edgeMargin;
}

/**
 * Calculate maximum expansion possible for right handle
 */
export function calculateMaxRightExpansion(
  cardRight: number,
  viewportWidth: number,
  edgeMargin: number
): number {
  return viewportWidth - edgeMargin - cardRight;
}

/**
 * Calculate new width and offset for left handle resize
 * Left handle: drag left to increase width, right edge stays fixed
 */
export function calculateLeftResize(
  params: LeftResizeParams
): LeftResizeResult {
  const { deltaX, startWidth, startOffsetX, cardLeft, constraints } = params;
  const { minWidth, maxWidth, edgeMargin } = constraints;

  // Limit: new left edge must not go past edgeMargin
  const maxExpandLeft = calculateMaxLeftExpansion(cardLeft, edgeMargin);
  const clampedDelta = Math.max(-maxExpandLeft, deltaX);

  // deltaX < 0 means mouse moved left = increase width
  const newWidth = clampWidth(startWidth - clampedDelta, minWidth, maxWidth);
  const widthChange = newWidth - startWidth;

  // Move popup left by the width increase to keep right edge fixed
  const newOffsetX = startOffsetX - widthChange;

  return { newWidth, newOffsetX };
}

/**
 * Calculate new width for right handle resize
 * Right handle: drag right to increase width, left edge stays fixed
 */
export function calculateRightResize(
  params: RightResizeParams
): RightResizeResult {
  const { deltaX, startWidth, cardRight, viewportWidth, constraints } = params;
  const { minWidth, maxWidth, edgeMargin } = constraints;

  // Limit: new right edge must not go past viewportWidth - edgeMargin
  const maxExpandRight = calculateMaxRightExpansion(
    cardRight,
    viewportWidth,
    edgeMargin
  );
  const clampedDelta = Math.min(maxExpandRight, deltaX);

  const newWidth = clampWidth(startWidth + clampedDelta, minWidth, maxWidth);

  return { newWidth };
}

/**
 * Parameters for bottom handle resize calculation
 */
export interface BottomResizeParams {
  deltaY: number;
  startHeight: number;
  cardBottom: number;
  viewportHeight: number;
  constraints: HeightResizeConstraints;
}

/**
 * Result of bottom handle resize calculation
 */
export interface BottomResizeResult {
  newHeight: number;
}

/**
 * Clamp a height value to min/max bounds
 */
export function clampHeight(
  height: number,
  minHeight: number,
  maxHeight: number
): number {
  return Math.min(maxHeight, Math.max(minHeight, height));
}

/**
 * Calculate maximum expansion possible for bottom handle
 */
export function calculateMaxBottomExpansion(
  cardBottom: number,
  viewportHeight: number,
  edgeMargin: number
): number {
  return viewportHeight - edgeMargin - cardBottom;
}

/**
 * Calculate new height for bottom handle resize
 * Bottom handle: drag down to increase height, top edge stays fixed
 */
export function calculateBottomResize(
  params: BottomResizeParams
): BottomResizeResult {
  const { deltaY, startHeight, cardBottom, viewportHeight, constraints } =
    params;
  const { minHeight, maxHeight, edgeMargin } = constraints;

  // Limit: new bottom edge must not go past viewportHeight - edgeMargin
  const maxExpandBottom = calculateMaxBottomExpansion(
    cardBottom,
    viewportHeight,
    edgeMargin
  );
  const clampedDelta = Math.min(maxExpandBottom, deltaY);

  // deltaY > 0 means mouse moved down = increase height
  const newHeight = clampHeight(
    startHeight + clampedDelta,
    minHeight,
    maxHeight
  );

  return { newHeight };
}
