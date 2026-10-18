export interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export function clampPosition(
  point: Point,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): Point {
  return {
    x: Math.max(8, Math.min(point.x, viewport.width - size.width - 8)),
    y: Math.max(8, Math.min(point.y, viewport.height - size.height - 8)),
  };
}

export function positionNearSelection(
  rect: SelectionRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): Point {
  return clampPosition(
    {
      x: rect.right - size.width,
      y:
        rect.bottom + size.height + 16 > viewport.height
          ? rect.top - size.height - 8
          : rect.bottom + 8,
    },
    size,
    viewport
  );
}
