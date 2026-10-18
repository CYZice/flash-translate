/** @vitest-environment jsdom */

import type { Editor } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readWorkspaceSelection } from "./workspace-selection";

let workspace: HTMLElement;
const rect = {
  left: 50,
  top: 50,
  right: 150,
  bottom: 70,
  width: 100,
  height: 20,
  x: 50,
  y: 50,
  toJSON: () => ({}),
};
function select(node: Node, start?: number, end?: number): void {
  const range = document.createRange();
  if (start === undefined) {
    range.selectNodeContents(node);
  } else {
    range.setStart(node, start);
    range.setEnd(node, end ?? start);
  }
  required(document.getSelection()).removeAllRanges();
  required(document.getSelection()).addRange(range);
}
const read = (editor: Editor | null = null) =>
  readWorkspaceSelection(
    document,
    editor ? { editor, file: { path: "Example.md" } } : null,
    (node) => workspace.contains(node)
  );
beforeEach(() => {
  workspace = document.createElement("div");
  document.body.append(workspace);
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    value: () => rect,
    configurable: true,
  });
});
afterEach(() => {
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("generic workspace selections", () => {
  it.each(["markdown-preview-view", "yolo-agent-output"])(
    "reads %s with formulas without DOM cloning",
    (view) => {
      workspace.innerHTML = `<div class="${view}"><p>Consider <mjx-container><math><msup><mi>x</mi><mn>2</mn></msup></math></mjx-container> for all t.</p></div>`;
      select(required(workspace.querySelector("p")));
      const clone = vi.spyOn(Range.prototype, "cloneContents");
      expect(read()?.text).toBe("Consider x^{2} for all t.");
      expect(read()?.note).toBeUndefined();
      expect(clone).not.toHaveBeenCalled();
    }
  );
  it("reads only the selected fragment and resolves context lazily", () => {
    workspace.innerHTML =
      "<p>Earlier sentence. Hello world. Following sentence.</p>";
    const text = required(required(workspace.querySelector("p")).firstChild);
    select(text, 18, 30);
    const snapshot = required(read());
    expect(snapshot.text).toBe("Hello world.");
    expect(snapshot.readContext(0)).toEqual({
      contextBefore: "",
      contextAfter: "",
    });
    expect(snapshot.readContext(1)).toEqual({
      contextBefore: "Earlier sentence.",
      contextAfter: "Following sentence.",
    });
    workspace.replaceChildren();
    expect(snapshot.readContext(1)).toEqual({
      contextBefore: "",
      contextAfter: "",
    });
  });
  it("uses CodeMirror's full selection rather than its virtualized visible fragment", () => {
    workspace.innerHTML =
      '<div class="cm-editor"><div tabindex="0" class="cm-content">Visible fragment</div></div>';
    const content = required(
      workspace.querySelector<HTMLElement>(".cm-content")
    );
    content.focus();
    select(content);
    const getValue = vi.fn();
    const editor = {
      hasFocus: () => true,
      getSelection: () => "Entire selected note including unrendered lines",
      getCursor: (which: string) => ({
        line: 0,
        ch: which === "from" ? 10 : 58,
      }),
      posToOffset: (pos: { ch: number }) => pos.ch,
      getValue,
    } as unknown as Editor;
    expect(read(editor)).toMatchObject({
      text: "Entire selected note including unrendered lines",
      note: { editor, path: "Example.md", start: 10, end: 58 },
    });
    expect(getValue).not.toHaveBeenCalled();
  });
  it("never offers note edits for chat output even if an active editor still exists", () => {
    workspace.innerHTML =
      '<div tabindex="0" class="yolo-output">Chat reply</div>';
    const output = workspace.firstElementChild as HTMLElement;
    output.focus();
    select(output);
    const editor = {
      hasFocus: () => true,
      getSelection: () => "Old note selection",
    } as Editor;
    expect(read(editor)).toMatchObject({ text: "Chat reply" });
    expect(read(editor)?.note).toBeUndefined();
  });

  it("checks the DOM range origin even when CodeMirror reports focus", () => {
    workspace.innerHTML =
      '<div class="cm-editor"><div tabindex="0" class="cm-content">Note</div></div><p>Chat reply</p>';
    required(workspace.querySelector<HTMLElement>(".cm-content")).focus();
    select(required(workspace.querySelector("p")));
    const editor = {
      hasFocus: () => true,
      getSelection: () => "Old note selection",
    } as Editor;
    expect(read(editor)).toMatchObject({ text: "Chat reply" });
    expect(read(editor)?.note).toBeUndefined();
  });
  it.each([
    ".modal-container",
    ".prompt",
    ".vertical-tab-content-container",
    "[data-flash-translate-ui]",
  ])("ignores excluded UI %s", (selector) => {
    const element = document.createElement("div");
    if (selector.startsWith(".")) {
      element.className = selector.slice(1);
    } else {
      element.dataset.flashTranslateUi = "card";
    }
    element.textContent = "Do not translate";
    workspace.append(element);
    select(element);
    expect(read()).toBeNull();
  });
  it("ignores selections outside workspace leaves and collapsed selections", () => {
    const outside = document.createElement("p");
    outside.textContent = "Outside";
    document.body.append(outside);
    select(outside);
    expect(read()).toBeNull();
    workspace.textContent = "Inside";
    select(required(workspace.firstChild), 0, 0);
    expect(read()).toBeNull();
  });
  it("reads selected textarea text and bounded context without mutating the input", () => {
    workspace.innerHTML = "<textarea>Before. Hello. After.</textarea>";
    const control = required(workspace.querySelector("textarea"));
    control.focus();
    control.setSelectionRange(8, 14);
    const snapshot = required(read());
    expect(snapshot.text).toBe("Hello.");
    expect(snapshot.note).toBeUndefined();
    expect(snapshot.readContext(1)).toEqual({
      contextBefore: "Before.",
      contextAfter: "After.",
    });
    control.value = "Changed";
    expect(snapshot.readContext(1)).toEqual({
      contextBefore: "",
      contextAfter: "",
    });
  });
  it("never falls back to an old DOM selection while a password input is active", () => {
    workspace.innerHTML =
      '<p>Old selection</p><input type="password" value="secret">';
    select(required(workspace.querySelector("p")));
    required(workspace.querySelector("input")).focus();
    expect(read()).toBeNull();
  });

  it("ignores old DOM selections when a text input has only a caret", () => {
    workspace.innerHTML = '<p>Old selection</p><input value="Typing">';
    select(required(workspace.querySelector("p")));
    const input = required(workspace.querySelector("input"));
    input.focus();
    input.setSelectionRange(2, 2);
    expect(read()).toBeNull();
  });
  it("reads an independent pop-out document with MathML nodes from its own realm", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const other = required(frame.contentDocument);
    other.body.innerHTML =
      "<p>Value <mjx-container><math><mfrac><mi>a</mi><mi>b</mi></mfrac></math></mjx-container></p>";
    const range = other.createRange();
    range.selectNodeContents(required(other.querySelector("p")));
    Object.defineProperty(range, "getBoundingClientRect", {
      value: () => rect,
    });
    required(other.getSelection()).addRange(range);
    expect(
      readWorkspaceSelection(other, null, (node) => other.body.contains(node))
        ?.text
    ).toBe("Value \\frac{a}{b}");
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing test fixture");
  }
  return value;
}
