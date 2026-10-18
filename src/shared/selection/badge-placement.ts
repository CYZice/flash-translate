import { positionSelectionBadge } from "./selection-geometry";

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface Point {
  x: number;
  y: number;
}
const OWN_UI = "#flash-translate-root,[data-flash-translate-ui]";
const CONTROL = "button,a,input,select,[role=button],.clickable-icon";

function obstacleAt(document: Document, x: number, y: number): boolean {
  const hits = document.elementsFromPoint(x, y);
  for (const hit of hits) {
    if (hit.closest(OWN_UI)) {
      continue;
    }
    let element: Element | null = hit;
    for (
      let depth = 0;
      element && depth < 5;
      depth++, element = element.parentElement
    ) {
      const rect = element.getBoundingClientRect();
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.width > 180 ||
        rect.height > 100
      ) {
        continue;
      }
      const style = document.defaultView?.getComputedStyle(element);
      if (style?.pointerEvents === "none" || style?.visibility === "hidden") {
        continue;
      }
      if (
        element.matches(CONTROL) ||
        style?.position === "fixed" ||
        style?.position === "absolute"
      ) {
        return true;
      }
    }
  }
  return false;
}

export function badgeCandidates(
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): Point[] {
  const first = positionSelectionBadge(anchor, size, viewport);
  const gap = 6;
  const clamp = ({ x, y }: Point): Point => ({
    x: Math.max(8, Math.min(x, viewport.width - size.width - 8)),
    y: Math.max(8, Math.min(y, viewport.height - size.height - 8)),
  });
  return [
    first,
    { x: first.x + size.width + gap, y: first.y },
    { x: anchor.left - size.width - gap, y: first.y },
    { x: first.x, y: anchor.top - size.height - gap },
    { x: first.x, y: first.y + size.height + gap },
    { x: anchor.left - size.width - gap, y: anchor.top - size.height - gap },
    { x: first.x, y: first.y + 3 * (size.height + gap) },
    { x: first.x + 3 * (size.width + gap), y: first.y },
  ].map(clamp);
}

/** Bounded local hit tests, including late host toolbars; no page-wide observer. */
export function placeSelectionBadge(
  badge: HTMLElement,
  anchor: Rect
): () => void {
  const document = badge.ownerDocument;
  const win = document.defaultView;
  if (!win) {
    return () => undefined;
  }
  let current: Point | null = null;
  const update = (): void => {
    if (
      !badge.isConnected ||
      (current && badge.matches(":hover,:focus-visible"))
    ) {
      return;
    }
    const bounds = badge.getBoundingClientRect();
    const size = { width: bounds.width || 28, height: bounds.height || 28 };
    const free = ({ x, y }: Point): boolean => {
      const points = [
        [3, 3],
        [size.width - 3, 3],
        [3, size.height - 3],
        [size.width - 3, size.height - 3],
        [size.width / 2, size.height / 2],
      ];
      return points.every(([dx, dy]) => !obstacleAt(document, x + dx, y + dy));
    };
    const candidates = badgeCandidates(anchor, size, {
      width: win.innerWidth,
      height: win.innerHeight,
    });
    const point = current && free(current) ? current : candidates.find(free);
    if (!point) {
      badge.style.visibility = "hidden";
      return;
    }
    current = point;
    badge.style.left = `${point.x}px`;
    badge.style.top = `${point.y}px`;
    badge.style.visibility = "visible";
  };
  update();
  const timers = [100, 300, 600].map((delay) => win.setTimeout(update, delay));
  return () => {
    for (const timer of timers) {
      win.clearTimeout(timer);
    }
    current = null;
  };
}
