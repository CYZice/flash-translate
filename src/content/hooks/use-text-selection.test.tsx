/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectionTrigger } from "@/shared/storage/settings";
import { useTextSelection } from "./use-text-selection";

let root: Root;
let host: HTMLDivElement;
let editor: HTMLTextAreaElement;
let state: ReturnType<typeof useTextSelection>;

function Harness({ mode }: { mode: SelectionTrigger }) {
  state = useTextSelection(1, mode);
  return null;
}

function render(mode: SelectionTrigger) {
  act(() => root.render(<Harness mode={mode} />));
}

function settleSelection() {
  act(() => vi.advanceTimersByTime(20));
}

function select(text: string) {
  act(() => {
    editor.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editor.value = text;
    editor.focus();
    editor.setSelectionRange(0, text.length);
    editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  settleSelection();
}

function clearPageSelection() {
  act(() => {
    editor.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editor.setSelectionRange(0, 0);
    editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  settleSelection();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  editor = document.createElement("textarea");
  document.body.append(host, editor);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  editor.remove();
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("on-demand context and selection events", () => {
  it("does not read textarea context until explicitly requested", async () => {
    const contextRules = await import("@/shared/utils/ai-context");
    const context = vi.spyOn(contextRules, "getContextAroundSelection");
    render("badge");
    select("Before. Selected. After.");
    act(() => {
      editor.setSelectionRange(8, 17);
      document.dispatchEvent(new Event("selectionchange"));
    });
    settleSelection();
    expect(context).not.toHaveBeenCalled();
    expect(state.selection?.text).toBe("Selected.");
    expect(state.selection?.readContext()).toEqual({
      contextBefore: "Before.",
      contextAfter: "After.",
    });
    expect(context).toHaveBeenCalledTimes(1);
    editor.value = "Changed document.";
    expect(state.selection?.readContext()).toEqual({
      contextBefore: "",
      contextAfter: "",
    });
  });

  it("reads context from the saved DOM range, not a later browser selection", async () => {
    const selectionRules = await import("./text-selection");
    render("badge");
    const paragraph = document.createElement("p");
    paragraph.textContent = "Before. Selected. After.";
    document.body.append(paragraph);
    const text = paragraph.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 8);
    range.setEnd(text, 17);
    const selection = window.getSelection();
    selection?.addRange(range);
    const context = vi.spyOn(selectionRules, "getRangesContext");
    act(() =>
      paragraph.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
    );
    settleSelection();
    expect(state.selection?.text).toBe("Selected.");
    expect(context).not.toHaveBeenCalled();
    selection?.removeAllRanges();
    expect(state.selection?.readContext()).toEqual({
      contextBefore: "Before.",
      contextAfter: "After.",
    });
    paragraph.remove();
    expect(state.selection?.readContext()).toEqual({
      contextBefore: "",
      contextAfter: "",
    });
  });

  it("waits for mouseup during dragging, but supports keyboard selection changes", () => {
    render("immediate");
    act(() => {
      editor.focus();
      editor.value = "First second";
      editor.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      editor.setSelectionRange(0, 3);
      document.dispatchEvent(new Event("selectionchange"));
    });
    settleSelection();
    expect(state.selection).toBeNull();
    act(() => {
      editor.setSelectionRange(0, 5);
      editor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    settleSelection();
    expect(state.selection?.text).toBe("First");
    act(() => {
      editor.setSelectionRange(6, 12);
      document.dispatchEvent(new Event("selectionchange"));
    });
    settleSelection();
    expect(state.selection?.text).toBe("second");
  });
});

describe("selection display lifecycle", () => {
  it("shows immediately after selection settles, without the old one-second delay", () => {
    render("immediate");
    select("First selection");
    expect(state.selection?.text).toBe("First selection");
    expect(state.isVisible).toBe(true);
  });

  it("waits for activation in badge mode and keeps the card open while pinned", () => {
    render("badge");
    select("First selection");
    expect(state.isVisible).toBe(false);
    act(() => state.activateCard());
    act(() => state.togglePin());
    expect(state.isPinned).toBe(true);
    clearPageSelection();
    expect(state.selection?.text).toBe("First selection");
    expect(state.isVisible).toBe(true);
    select("Second selection");
    expect(state.selection?.text).toBe("Second selection");
    expect(state.isVisible).toBe(true);
    expect(state.isPinned).toBe(true);
  });

  it("applies display-mode changes to the current selection", () => {
    render("badge");
    select("Selected text");
    render("immediate");
    expect(state.isVisible).toBe(true);
    render("badge");
    expect(state.isVisible).toBe(false);
  });

  it("dismisses and unpins on Escape without a delayed reopen", () => {
    render("immediate");
    select("Selected text");
    act(() => state.togglePin());
    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    );
    act(() => vi.advanceTimersByTime(1500));
    expect(state.isVisible).toBe(false);
    expect(state.isPinned).toBe(false);
    expect(state.selection).toBeNull();
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe(
      "Selected text"
    );
    select("New text");
    expect(state.isVisible).toBe(true);
  });

  it("clears unpinned selections on an outside click", () => {
    render("immediate");
    select("Selected text");
    clearPageSelection();
    expect(state.selection).toBeNull();
  });

  it("clears pinned cards on navigation", () => {
    render("immediate");
    select("Selected text");
    act(() => state.togglePin());
    act(() => window.dispatchEvent(new Event("flash-translate:navigation")));
    expect(state.selection).toBeNull();
    expect(state.isPinned).toBe(false);
  });

  it("keeps a pinned card when the window loses focus", () => {
    render("immediate");
    select("Selected text");
    act(() => state.togglePin());
    act(() => window.dispatchEvent(new Event("blur")));
    expect(state.selection?.text).toBe("Selected text");
    expect(state.isVisible).toBe(true);
    expect(state.isPinned).toBe(true);
  });
});
