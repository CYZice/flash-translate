interface EditorInputAssistProps {
  rect: DOMRect | null;
  text: string;
  isLoading: boolean;
}

export function EditorInputAssist({ rect, text, isLoading }: EditorInputAssistProps) {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!(rect && floatingRef.current)) return;
    const reference = { getBoundingClientRect: () => rect };
    computePosition(reference, floatingRef.current, {
      placement: "top-start",
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => setPosition({ left: x, top: y }));
  }, [rect]);
  if (!rect || (!text && !isLoading)) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed max-w-[min(560px,calc(100vw-16px))] -translate-y-full rounded bg-gray-900/70 px-2 py-1 text-white text-xs leading-5 shadow-sm"
      ref={floatingRef}
      style={{ left: `${position.left}px`, top: `${position.top}px`, zIndex: 2_147_483_647 }}
    >
      {isLoading && !text ? "…" : text}
    </div>
  );
}
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { useEffect, useRef, useState } from "react";
