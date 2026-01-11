// Pure functions for card position calculation

/**
 * Minimum card height constraint
 */
export const MIN_CARD_HEIGHT = 100;

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
  placement: "bottom" | "top";
  maxHeight: number;
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
): { y: number; placement: "bottom" | "top"; maxHeight: number } {
  // Calculate available space below and above the selection
  const spaceBelow = viewportHeight - selectionRect.bottom - margin * 2;
  const spaceAbove = selectionRect.top - margin * 2;

  // Prefer showing below the selection
  if (selectionRect.bottom + margin + cardHeight <= viewportHeight) {
    return {
      y: selectionRect.bottom + margin,
      placement: "bottom",
      maxHeight: Math.max(spaceBelow, MIN_CARD_HEIGHT),
    };
  }

  // Show above if not enough space below
  if (selectionRect.top - margin - cardHeight >= 0) {
    return {
      y: selectionRect.top - margin - cardHeight,
      placement: "top",
      maxHeight: Math.max(spaceAbove, MIN_CARD_HEIGHT),
    };
  }

  // Fallback: show below anyway, limit height to available space
  return {
    y: selectionRect.bottom + margin,
    placement: "bottom",
    maxHeight: Math.max(spaceBelow, MIN_CARD_HEIGHT),
  };
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

  const { y, placement, maxHeight } = calculateVerticalPosition(
    selectionRect,
    cardHeight,
    viewport.height,
    margin
  );

  return { x, y, placement, maxHeight };
}
