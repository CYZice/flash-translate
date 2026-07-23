import type { ViewportRect } from "./hovered-term";

const TOOLTIP_WIDTH = 288;
const TOOLTIP_HEIGHT = 88;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

interface ViewportSize {
  width: number;
  height: number;
}

export interface TermTooltipPosition {
  left: number;
  top: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getTermTooltipPosition(
  anchorRect: ViewportRect,
  viewport: ViewportSize
): TermTooltipPosition {
  const tooltipWidth = Math.min(
    TOOLTIP_WIDTH,
    Math.max(0, viewport.width - VIEWPORT_MARGIN * 2)
  );
  const halfTooltipWidth = tooltipWidth / 2;
  const left = clamp(
    anchorRect.left + anchorRect.width / 2,
    VIEWPORT_MARGIN + halfTooltipWidth,
    viewport.width - VIEWPORT_MARGIN - halfTooltipWidth
  );

  const topAbove = anchorRect.top - ANCHOR_GAP - TOOLTIP_HEIGHT;
  const top =
    topAbove >= VIEWPORT_MARGIN
      ? topAbove
      : Math.min(
          anchorRect.bottom + ANCHOR_GAP,
          viewport.height - VIEWPORT_MARGIN - TOOLTIP_HEIGHT
        );

  return {
    left,
    top: Math.max(VIEWPORT_MARGIN, top),
  };
}
