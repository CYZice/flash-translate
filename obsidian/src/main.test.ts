/** @vitest-environment jsdom */

import type { App, Editor, PluginManifest } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlashTranslatePlugin from "./main";

const host = vi.hoisted(() => ({
  request: vi.fn(async () => ({
    status: 200,
    json: { choices: [{ message: { content: "Bonjour" } }] },
  })),
  notice: vi.fn(),
}));
vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
  requestUrl: host.request,
  Notice: host.notice,
  PluginSettingTab: class {},
  SecretComponent: class {},
  Setting: class {},
  Plugin: class {
    app: App;
    commands: { checkCallback: (checking: boolean) => boolean }[] = [];
    constructor(app: App) {
      this.app = app;
    }
    loadData() {
      return {
        baseUrl: "http://localhost:1234/v1",
        model: "test",
        targetLanguage: "fr",
      };
    }
    saveData = vi.fn();
    addSettingTab = vi.fn();
    addCommand(definition: { checkCallback: (checking: boolean) => boolean }) {
      this.commands.push(definition);
    }
    registerEvent = vi.fn();
  },
}));

let plugin: FlashTranslatePlugin;
let container: HTMLElement;
let events: Map<string, (...args: unknown[]) => void>;
let active: { editor: Editor; file: { path: string } } | null;
let leafContainers: HTMLElement[];
let layoutReady: () => void;
function command(checking = false): boolean {
  return (
    Reflect.get(plugin, "commands") as {
      checkCallback: (checking: boolean) => boolean;
    }[]
  )[0].checkCallback(checking);
}
function select(node: Node): void {
  const range = required(node.ownerDocument).createRange();
  range.selectNodeContents(node);
  const selection = required(required(node.ownerDocument).getSelection());
  selection.removeAllRanges();
  selection.addRange(range);
  required(node.ownerDocument).dispatchEvent(new Event("selectionchange"));
}
const tick = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(60);
};
beforeEach(async () => {
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: () => [],
  });
  vi.useFakeTimers();
  host.request.mockClear();
  host.notice.mockClear();
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    value: () => ({
      left: 30,
      top: 30,
      right: 100,
      bottom: 50,
      width: 70,
      height: 20,
    }),
    configurable: true,
  });
  Object.defineProperty(Range.prototype, "getClientRects", {
    value: () => [],
    configurable: true,
  });
  container = document.createElement("div");
  container.innerHTML = "<p>Hello world.</p>";
  document.body.append(container);
  events = new Map();
  active = null;
  leafContainers = [container];
  const app = {
    workspace: {
      containerEl: container,
      get activeEditor() {
        return active;
      },
      on: (event: string, callback: (...args: unknown[]) => void) => {
        events.set(event, callback);
        return {};
      },
      onLayoutReady: (callback: () => void) => {
        layoutReady = callback;
      },
      iterateAllLeaves: (
        callback: (leaf: { view: { containerEl: HTMLElement } }) => void
      ) => {
        for (const containerEl of leafContainers) {
          callback({ view: { containerEl } });
        }
      },
    },
    secretStorage: { getSecret: vi.fn() },
  } as unknown as App;
  plugin = new FlashTranslatePlugin(app, {} as PluginManifest);
  await plugin.onload();
  layoutReady();
});
afterEach(() => {
  plugin.onunload();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Obsidian floating selection integration", () => {
  it("keeps aggregate usage and settings together without storing translation history", async () => {
    const update = plugin.updateSettings({ contextSentenceCount: 0 });
    select(required(container.querySelector("p")));
    command();
    await tick();
    await update;
    await Reflect.get(plugin, "persistence");
    expect(plugin.usage).toMatchObject({
      completedTranslations: 1,
      aiRequests: 1,
      reportedRequests: 0,
    });
    const saved = vi.mocked(plugin.saveData).mock.calls.at(-1)?.[0];
    expect(saved).toMatchObject({
      contextSentenceCount: 0,
      model: "test",
      usage: plugin.usage,
    });
    expect(JSON.stringify(saved)).not.toContain("Hello world.");
    expect(JSON.stringify(saved)).not.toContain("Bonjour");
  });
  it("automatically reverses the target on new selections in a pinned card", async () => {
    await plugin.updateSettings({
      autoZhEn: true,
      selectionTrigger: "immediate",
    });
    select(required(container.querySelector("p")));
    await tick();
    expect(document.querySelector("select")?.value).toBe("zh");
    required(
      document.querySelector<HTMLButtonElement>('[aria-label="Pin position"]')
    ).click();
    container.innerHTML = "<p>光学谐振腔中的 Hermite-Gaussian 模式</p>";
    select(required(container.querySelector("p")));
    await tick();
    expect(document.querySelector("select")?.value).toBe("en");
    const request = host.request.mock.calls.at(-1)?.[0] as unknown as {
      body: string;
    };
    const payload = JSON.parse(
      JSON.parse(request.body).messages.at(-1).content
    );
    expect(payload).toMatchObject({
      sourceLanguage: "Chinese",
      targetLanguage: "English",
    });
    const target = required(document.querySelector("select"));
    target.value = "fr";
    target.dispatchEvent(new Event("change"));
    await tick();
    expect(plugin.settings).toMatchObject({
      autoZhEn: false,
      targetLanguage: "fr",
    });
  });
  it("translates a reading/chat selection through the command without enabling note edits", async () => {
    select(required(container.querySelector("p")));
    expect(command(true)).toBe(true);
    expect(host.request).not.toHaveBeenCalled();
    command();
    await tick();
    expect(document.querySelector("textarea")?.value).toBe("Bonjour");
    expect(document.querySelector(".flash-translate-edits")).toBeNull();
    expect(host.request).toHaveBeenCalledOnce();
    const body = JSON.parse(host.request.mock.calls[0][0].body);
    expect(JSON.stringify(body)).toContain("Hello world.");
    expect(JSON.stringify(body)).not.toContain("Example.md");
  });
  it("retains the selected source for command-palette activation", async () => {
    select(required(container.querySelector("p")));
    await tick();
    const modal = document.createElement("div");
    modal.className = "prompt";
    modal.innerHTML = "<input>";
    document.body.append(modal);
    required(modal.querySelector("input")).focus();
    document.dispatchEvent(new Event("selectionchange"));
    await tick();
    expect(command(true)).toBe(true);
    command();
    await tick();
    expect(host.request).toHaveBeenCalledOnce();
    expect(document.querySelector(".flash-translate-card")).not.toBeNull();
  });
  it("keeps a pinned card at the same location while updating a different plugin selection", async () => {
    select(required(container.querySelector("p")));
    await tick();
    required(
      document.querySelector<HTMLButtonElement>(".flash-translate-badge")
    ).click();
    await tick();
    required(
      document.querySelector<HTMLButtonElement>('[aria-label="Pin position"]')
    ).click();
    const card = required(
      document.querySelector<HTMLElement>(".flash-translate-card")
    );
    card.style.left = "350px";
    card.style.top = "150px";
    container.innerHTML = '<div class="yolo-output">New output</div>';
    select(required(container.firstChild));
    await tick();
    const updated = required(
      document.querySelector<HTMLElement>(".flash-translate-card")
    );
    expect(updated.style.left).toBe("350px");
    expect(updated.style.top).toBe("150px");
    expect(host.request).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event("scroll"));
    expect(updated.isConnected).toBe(true);
    expect(document.querySelector(".flash-translate-badge")).toBeNull();
  });
  it.each([false, true])(
    "keeps the pin when moving from plugin output to an editable note (blur=%s)",
    async (blur) => {
      select(required(container.querySelector("p")));
      command();
      await tick();
      required(
        document.querySelector<HTMLButtonElement>('[aria-label="Pin position"]')
      ).click();
      const card = required(
        document.querySelector<HTMLElement>(".flash-translate-card")
      );
      Object.assign(card.style, {
        left: "350px",
        top: "150px",
        width: "420px",
      });
      if (blur) {
        window.dispatchEvent(new Event("blur"));
      }
      expect(card.isConnected).toBe(true);

      const note = document.createElement("div");
      note.innerHTML =
        '<div class="cm-editor"><div tabindex="0" class="cm-content">Note text</div></div>';
      container.append(note);
      const content = required(note.querySelector<HTMLElement>(".cm-content"));
      active = {
        editor: {
          hasFocus: () => true,
          getSelection: () => "Note text",
          getValue: () => "Note text",
          getCursor: (which: string) => ({
            line: 0,
            ch: which === "from" ? 0 : 9,
          }),
          posToOffset: (pos: { ch: number }) => pos.ch,
        } as unknown as Editor,
        file: { path: "Example.md" },
      };
      content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      content.focus();
      select(content);
      content.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await tick();
      const updated = required(
        document.querySelector<HTMLElement>(".flash-translate-card")
      );
      expect([
        updated.style.left,
        updated.style.top,
        updated.style.width,
      ]).toEqual(["350px", "150px", "420px"]);
      expect(
        document
          .querySelector('[aria-label="Pin position"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true");
      expect(document.querySelector(".flash-translate-edits")).not.toBeNull();
      expect(document.querySelector(".flash-translate-badge")).toBeNull();
      expect(host.request).toHaveBeenCalledTimes(2);

      content.blur();
      select(required(container.querySelector("p")));
      await tick();
      expect(document.querySelector(".flash-translate-edits")).toBeNull();
      expect(
        document
          .querySelector('[aria-label="Pin position"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true");
      expect(host.request).toHaveBeenCalledTimes(3);
      expect(host.notice).not.toHaveBeenCalled();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(document.querySelector(".flash-translate-card")).toBeNull();
    }
  );
  it("checks the original document before accepting a note edit", async () => {
    container.innerHTML =
      '<div class="cm-editor"><div tabindex="0" class="cm-content">Hello</div></div>';
    const content = required(
      container.querySelector<HTMLElement>(".cm-content")
    );
    content.focus();
    let value = "Hello world.";
    const replaceRange = vi.fn();
    const editor = {
      hasFocus: () => true,
      getSelection: () => "Hello",
      getValue: () => value,
      getCursor: (which: string) => ({ line: 0, ch: which === "from" ? 0 : 5 }),
      posToOffset: (pos: { ch: number }) => pos.ch,
      offsetToPos: (ch: number) => ({ line: 0, ch }),
      replaceRange,
      setCursor: vi.fn(),
      focus: vi.fn(),
    } as unknown as Editor;
    active = { editor, file: { path: "Example.md" } };
    select(content);
    command();
    await tick();
    expect(document.querySelector(".flash-translate-edits")).not.toBeNull();
    value = "Changed document.";
    required(
      document.querySelector<HTMLButtonElement>(
        '[aria-label="Replace selection"]'
      )
    ).click();
    expect(replaceRange).not.toHaveBeenCalled();
    expect(document.querySelector(".flash-translate-card")).not.toBeNull();
    expect(
      document.querySelector('[role="status"]')?.textContent?.toLowerCase()
    ).toContain("changed");
  });
  it("changes trigger modes without leaving a badge behind", async () => {
    select(required(container.querySelector("p")));
    await tick();
    expect(document.querySelector(".flash-translate-badge")).not.toBeNull();
    await plugin.updateSettings({ selectionTrigger: "immediate" });
    expect(document.querySelector(".flash-translate-badge")).toBeNull();
    document.dispatchEvent(new Event("selectionchange"));
    await tick();
    expect(document.querySelector(".flash-translate-card")).not.toBeNull();
    expect(document.querySelector(".flash-translate-badge")).toBeNull();
    expect(host.request).toHaveBeenCalledOnce();
  });
  it("cleans up a pop-out document when its window closes", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const win = required(frame.contentWindow);
    required(events.get("window-open"))({}, win);
    const controllers = Reflect.get(plugin, "controllers") as Map<
      Document,
      unknown
    >;
    expect(controllers.size).toBe(2);
    required(events.get("window-close"))({}, win);
    expect(controllers.size).toBe(1);
  });
  it("leaves no floating UI or listeners after unload, even if layout becomes ready later", async () => {
    select(required(container.querySelector("p")));
    await tick();
    plugin.onunload();
    layoutReady();
    document.dispatchEvent(new Event("selectionchange"));
    await tick();
    expect(
      (Reflect.get(plugin, "controllers") as Map<Document, unknown>).size
    ).toBe(0);
    expect(document.querySelector("[data-flash-translate-ui]")).toBeNull();
    expect(host.request).not.toHaveBeenCalled();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing test fixture");
  }
  return value;
}
