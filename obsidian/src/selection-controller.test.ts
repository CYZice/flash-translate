/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectionController } from "./selection-controller";
import type { SelectedSource } from "./workspace-selection";

vi.mock("obsidian", () => ({ setIcon: vi.fn() }));
const controllers: SelectionController[] = [];
const source = (): SelectedSource => ({
  document,
  text: "Hello",
  rect: { left: 20, top: 20, right: 100, bottom: 40, width: 80, height: 20 },
  readContext: vi.fn(),
});
function setup(
  trigger: "badge" | "immediate" | "off" = "badge",
  pinned = false
) {
  const options = {
    read: vi.fn(source),
    trigger: () => trigger,
    pinned: () => pinned,
    translate: vi.fn(),
    dismiss: vi.fn(),
  };
  const controller = new SelectionController(document, options);
  controllers.push(controller);
  return { controller, options };
}
function select(): void {
  document.dispatchEvent(new Event("selectionchange"));
  vi.advanceTimersByTime(60);
}
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: () => [],
  });
});
afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.dispose();
  }
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("workspace selection lifecycle", () => {
  it("shows one badge without translating or eagerly reading context", () => {
    const { controller, options } = setup();
    select();
    select();
    expect(document.querySelectorAll(".flash-translate-badge")).toHaveLength(1);
    expect(options.translate).not.toHaveBeenCalled();
    expect(controller.pending?.readContext).not.toHaveBeenCalled();
    required(document.querySelector<HTMLButtonElement>("button")).click();
    expect(options.translate).toHaveBeenCalledTimes(1);
    expect(controller.pending).toBeNull();
    expect(document.querySelector("button")).toBeNull();
  });
  it.each([
    ["immediate", false],
    ["badge", true],
  ] as const)("updates directly in %s mode with pin=%s", (mode, pin) => {
    const { options } = setup(mode, pin);
    select();
    select();
    expect(options.translate).toHaveBeenCalledTimes(1);
    expect(document.querySelector("button")).toBeNull();
    options.read.mockReturnValue({ ...source(), text: "Next" });
    select();
    expect(options.translate).toHaveBeenCalledTimes(2);
  });
  it("keeps command-only selections without an automatic card or badge", () => {
    const { controller, options } = setup("off", true);
    select();
    expect(controller.pending?.text).toBe("Hello");
    expect(options.translate).not.toHaveBeenCalled();
    expect(document.querySelector("button")).toBeNull();
  });
  it("waits until dragging has ended", () => {
    const { options } = setup();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    select();
    expect(options.read).not.toHaveBeenCalled();
    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    vi.advanceTimersByTime(60);
    expect(options.read).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])(
    "releases ranges on scroll and dismisses only unpinned cards (pin=%s)",
    (pinned) => {
      const { controller, options } = setup("badge", pinned);
      select();
      document.dispatchEvent(new Event("scroll"));
      expect(controller.pending).toBeNull();
      expect(document.querySelector("button")).toBeNull();
      expect(options.dismiss).toHaveBeenCalledTimes(pinned ? 0 : 1);
    }
  );
  it("does not recursively capture its own translation output", () => {
    const { options } = setup();
    document.body.innerHTML =
      '<div data-flash-translate-ui="card"><textarea></textarea></div>';
    required(document.querySelector("textarea")).focus();
    select();
    expect(options.read).not.toHaveBeenCalled();
  });

  it("does not confuse element focus changes with leaving the window", () => {
    const { options } = setup("badge", true);
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    input.blur();
    expect(options.dismiss).not.toHaveBeenCalled();
  });
  it("acknowledges manual activation without re-requesting the same selection", () => {
    const { controller, options } = setup("immediate");
    controller.acknowledge(source());
    select();
    expect(options.translate).not.toHaveBeenCalled();
  });
  it("cancels timers and drops callbacks, ranges, badges and listeners on dispose", () => {
    const { controller, options } = setup();
    select();
    document.dispatchEvent(new Event("selectionchange"));
    controller.dispose();
    select();
    expect(options.read).toHaveBeenCalledTimes(1);
    expect(controller.pending).toBeNull();
    expect(Reflect.get(controller, "options")).toBeNull();
    expect(Reflect.get(controller, "last")).toBeNull();
    expect(Reflect.get(controller, "cleanups")).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.querySelector("button")).toBeNull();
  });
  it.each([false, true])(
    "dismisses on window blur only when unpinned (pin=%s)",
    (pinned) => {
      const { options, controller } = setup("badge", pinned);
      select();
      document.defaultView?.dispatchEvent(new Event("blur"));
      expect(options.dismiss).toHaveBeenCalledTimes(pinned ? 0 : 1);
      expect(controller.pending).toBeNull();
      expect(Reflect.get(controller, "last")).toBeNull();
      expect(document.querySelector(".flash-translate-badge")).toBeNull();
      select();
      expect(options.translate).toHaveBeenCalledTimes(pinned ? 2 : 0);
    }
  );
  it("closes even pinned content on Escape", () => {
    const { options, controller } = setup("badge", true);
    select();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(options.dismiss).toHaveBeenCalledOnce();
    expect(controller.pending).toBeNull();
    expect(Reflect.get(controller, "last")).toBeNull();
  });
  it("resumes selection capture after losing focus during a drag", () => {
    const { options } = setup("badge", true);
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    document.defaultView?.dispatchEvent(new Event("blur"));
    select();
    expect(options.translate).toHaveBeenCalledOnce();
    expect(options.dismiss).not.toHaveBeenCalled();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing test fixture");
  }
  return value;
}
