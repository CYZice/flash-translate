/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorInputAssist } from "./use-editor-input-assist";

let state: ReturnType<typeof useEditorInputAssist>;
let host: HTMLDivElement;
let editor: HTMLTextAreaElement;
let root: ReturnType<typeof createRoot>;
let destroy: ReturnType<typeof vi.fn>;

function Harness() {
  state = useEditorInputAssist(true, "en", "zh");
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  destroy = vi.fn();
  vi.stubGlobal("Translator", {
    availability: async () => "available",
    create: async () => ({
      destroy,
      translateStreaming: () =>
        new ReadableStream<string>({
          start(controller) {
            controller.enqueue("Hello");
            controller.close();
          },
        }),
    }),
  });
  host = document.createElement("div");
  editor = document.createElement("textarea");
  document.body.append(host, editor);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("input assist disposal", () => {
  it.each(["blur", "pagehide"])(
    "releases a visible hint on window %s",
    async (event) => {
      act(() => {
        editor.value = "你好";
        editor.focus();
        editor.setSelectionRange(2, 2);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(450);
      });
      expect(state.text).toBe("Hello");
      expect(state.rect).not.toBeNull();
      act(() => window.dispatchEvent(new Event(event)));
      expect(state.text).toBe("");
      expect(state.rect).toBeNull();
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(editor.value).toBe("你好");
      expect(document.querySelector('[aria-hidden="true"]')?.textContent).toBe(
        ""
      );
    }
  );
});
