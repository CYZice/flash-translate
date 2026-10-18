import { describe, expect, it } from "vitest";
import { captureSelection, planTranslationEdit } from "./selection";

const document = "Before.\n我们明天下午讨论方案。\nAfter.";
const start = document.indexOf("我们");
const end = document.indexOf("\nAfter");
const snapshot = captureSelection(document, "Example.md", start, end, 1);
const current = { path: snapshot.path, document, start, end };

describe("note selection", () => {
  it("captures exact text and adjacent context without relying on the DOM", () => {
    expect(snapshot.text).toBe("我们明天下午讨论方案。");
    expect(snapshot.contextBefore).toBe("Before.");
    expect(snapshot.contextAfter).toBe("After.");
    expect(
      captureSelection(document, "Example.md", end, start, 0)
    ).toMatchObject({
      start,
      end,
      contextBefore: "",
      contextAfter: "",
    });
  });

  it("rejects empty and out-of-bounds selections", () => {
    expect(() =>
      captureSelection(document, "Example.md", start, start, 1)
    ).toThrow("Select some");
    expect(() => captureSelection(document, "Example.md", -1, end, 1)).toThrow(
      "Select some"
    );
  });

  it("replaces only the captured range and preserves multiline translations", () => {
    const translation = "Let's discuss the proposal tomorrow.\nAt three.";
    const edit = planTranslationEdit(snapshot, current, translation, "replace");
    expect(
      document.slice(0, edit.from) + edit.text + document.slice(edit.to)
    ).toBe(`Before.\n${translation}\nAfter.`);
  });

  it("inserts a bilingual result without removing the original", () => {
    const edit = planTranslationEdit(
      snapshot,
      current,
      "English translation",
      "insert"
    );
    expect(edit).toEqual({
      from: end,
      to: end,
      text: "\n\nEnglish translation",
    });
  });

  it.each([
    { ...current, path: "Other.md" },
    { ...current, document: `${document}\nNew writing` },
    { ...current, start: start + 1 },
    { ...current, end: end - 1 },
  ])("refuses stale edits when the note or selection changes", (changed) => {
    expect(() =>
      planTranslationEdit(snapshot, changed, "English", "replace")
    ).toThrow("changed");
  });

  it("refuses empty translations", () => {
    expect(() =>
      planTranslationEdit(snapshot, current, "  ", "replace")
    ).toThrow("no translation");
  });
});
