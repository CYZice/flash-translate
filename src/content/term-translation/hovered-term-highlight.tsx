import type { HoveredTerm } from "./hovered-term";

const HIGHLIGHT_PADDING = 2;

interface HoveredTermHighlightProps {
  hoveredTerm: HoveredTerm | null;
}

export function HoveredTermHighlight({
  hoveredTerm,
}: HoveredTermHighlightProps) {
  if (!hoveredTerm) {
    return null;
  }

  const { anchorRect } = hoveredTerm;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed rounded-sm border-2 border-blue-500 border-solid shadow-[0_0_0_2px_rgba(255,255,255,0.9)]"
      data-flash-translate-term-highlight=""
      style={{
        top: `${anchorRect.top - HIGHLIGHT_PADDING}px`,
        left: `${anchorRect.left - HIGHLIGHT_PADDING}px`,
        width: `${anchorRect.width + HIGHLIGHT_PADDING * 2}px`,
        height: `${anchorRect.height + HIGHLIGHT_PADDING * 2}px`,
        zIndex: 2_147_483_647,
      }}
    />
  );
}
