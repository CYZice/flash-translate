// Pure functions for card position calculation

/**
 * Interface for rectangle-like objects (avoids DOMRect dependency for testability)
 */
export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Viewport dimensions for position calculations
 */
export interface ViewportDimensions {
  width: number;
  height: number;
}

/**
 * Options for card position calculation
 */
export interface CardPositionOptions {
  cardWidth: number;
  cardHeight: number;
  margin: number;
}

/**
 * Result of card position calculation
 */
export interface CardPosition {
  x: number;
  y: number;
}

/**
 * Keep a fixed card inside the viewport while preserving its preferred top.
 */
export function clampCardTop(
  preferredTop: number,
  cardHeight: number,
  viewportHeight: number,
  margin: number
): number {
  const maxTop = Math.max(margin, viewportHeight - margin - cardHeight);
  return Math.min(maxTop, Math.max(margin, preferredTop));
}

/**
 * Calculate horizontal position, centered on selection and clamped to viewport
 */
export function calculateHorizontalPosition(
  selectionRect: RectLike,
  cardWidth: number,
  viewportWidth: number,
  margin: number
): number {
  // Center card on selection
  let x = selectionRect.left + selectionRect.width / 2 - cardWidth / 2;

  // Clamp to viewport bounds
  if (x < margin) {
    x = margin;
  } else if (x + cardWidth > viewportWidth - margin) {
    x = viewportWidth - cardWidth - margin;
  }

  return x;
}

/**
 * Calculate vertical position with placement decision
 */
export function calculateVerticalPosition(
  selectionRect: RectLike,
  cardHeight: number,
  viewportHeight: number,
  margin: number
): { y: number } {
  // Keep the selection as the stable anchor. If the card grows near the
  // bottom edge, move its top upward continuously instead of flipping it
  // above the selection (which caused visible jumping).
  const anchorTop = selectionRect.bottom + margin;
  const maxTop = Math.max(margin, viewportHeight - margin - cardHeight);
  const y = Math.min(anchorTop, maxTop);
  return { y };
}

/**
 * Main function combining horizontal and vertical calculations
 */
export function calculateCardPosition(
  selectionRect: RectLike,
  options: CardPositionOptions,
  viewport: ViewportDimensions
): CardPosition {
  const { cardWidth, cardHeight, margin } = options;

  const x = calculateHorizontalPosition(
    selectionRect,
    cardWidth,
    viewport.width,
    margin
  );

  const { y } = calculateVerticalPosition(
    selectionRect,
    cardHeight,
    viewport.height,
    margin
  );

  return { x, y };
}
