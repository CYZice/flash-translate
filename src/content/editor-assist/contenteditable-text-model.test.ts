/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import {
  buildContentTextModel,
  domPositionToTextOffset,
  textRangeToDomRange,
} from "./contenteditable-text-model";

describe("ContentEditableTextModel", () => {
  it("uses one text model for blocks and br", () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>第一行</p><p><br></p><div>第二<span>行</span></div>";
    const model = buildContentTextModel(root);
    expect(model.text).toBe("第一行\n\n第二行\n");
    expect(model.segments.map((segment) => segment.node.data)).toEqual([
      "第一行",
      "第二",
      "行",
    ]);
  });

  it("maps an element selection boundary to a text offset", () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>前面</p><p><span>中文</span>后面</p>";
    const model = buildContentTextModel(root);
    const second = root.children[1];
    expect(domPositionToTextOffset(model, second, 1)).toBe(5);
  });

  it("rebuilds a range from the same offset model", () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>前面</p><p><span>中文</span>后面</p>";
    const model = buildContentTextModel(root);
    const range = textRangeToDomRange(model, 3, 5);
    expect(range).not.toBeNull();
    expect(range?.startContainer.textContent).toBe("中文");
    expect(range?.endContainer.textContent).toBe("中文");
  });
});
