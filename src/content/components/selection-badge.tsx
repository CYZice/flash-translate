import { useLayoutEffect, useRef } from "react";
import { placeSelectionBadge } from "@/shared/selection/badge-placement";

export function SelectionBadge({
  rect,
  onActivate,
}: {
  rect: DOMRect;
  onActivate: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      return placeSelectionBadge(ref.current, rect);
    }
  }, [rect]);
  return (
    <button
      aria-label="翻译选中文本"
      ref={ref}
      style={{ visibility: "hidden" }}
      className="fixed z-[2147483647] flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.2)] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onActivate}
      type="button"
    >
      <img
        alt=""
        className="h-3.5 w-3.5"
        height={14}
        width={14}
        src={chrome.runtime.getURL("icons/icon-32.png")}
      />
    </button>
  );
}
