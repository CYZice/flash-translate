import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { useEffect, useRef, useState } from "react";

interface EditorInputAssistProps {
  rect: DOMRect | null;
  text: string;
  isLoading: boolean;
  error: string | null;
}

export function EditorInputAssist({
  rect,
  text,
  isLoading,
  error,
}: EditorInputAssistProps) {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const floating = floatingRef.current;
    if (!(rect && floating)) {
      return;
    }
    const reference = { getBoundingClientRect: () => rect };
    const update = () =>
      computePosition(reference, floating, {
        placement: "top-start",
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => setPosition({ left: x, top: y }));
    update().catch(() => undefined);
    return autoUpdate(reference, floating, update, { animationFrame: true });
  }, [rect]);

  if (!(rect && (text || isLoading || error))) {
    return null;
  }

  let content = text;
  if (error) {
    content = `! ${error}`;
  } else if (isLoading && !text) {
    content = "...";
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed max-w-[min(560px,calc(100vw-16px))] rounded bg-gray-900/70 px-2 py-1 text-white text-xs leading-5 shadow-sm"
      ref={floatingRef}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        zIndex: 2_147_483_647,
      }}
    >
      {content}
    </div>
  );
}
