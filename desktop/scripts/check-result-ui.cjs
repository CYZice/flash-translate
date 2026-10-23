"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");

// Isolate this real renderer check from the running app and personal settings.
const session = fs.mkdtempSync(path.join(os.tmpdir(), "flash-result-ui-"));
app.setPath("userData", session);
app.setPath("sessionData", session);
const output = path.resolve(__dirname, "../dist/qa");
const source = path.resolve(__dirname, "../src");
let pinned = false;
ipcMain.handle("result-pin-toggle", () => {
  pinned = !pinned;
  return pinned;
});

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 400,
    height: 172,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(source, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  const web = window.webContents;
  const errors = [];
  web.on("console-message", (_event, level, message) => {
    if (level === 3) {
      errors.push(message);
    }
  });
  const failures = [];
  async function check(name, run) {
    try {
      await run();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures.push(name);
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }
  async function capture(name) {
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, `${name}.png`),
      (await web.capturePage()).toPNG()
    );
  }
  try {
    await window.loadFile(path.join(source, "result.html"));
    window.showInactive();
    web.send("result-languages", {
      source: "English",
      target: "Chinese",
      autoTranslate: false,
    });
    web.send("selection-result", "");
    web.send("selection-translation-state", "loading");
    await web.executeJavaScript(
      "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
    );
    await check("fixed infinity outline with a flowing highlight", async () => {
      const motion = await web.executeJavaScript(`(async () => {
        const svg = document.querySelector('#loading svg');
        const flow = svg.querySelector('.loading-flow');
        const style = getComputedStyle(svg);
        const bounds = svg.getBoundingClientRect().toJSON();
        const offset = flow && getComputedStyle(flow).strokeDashoffset;
        await new Promise(r => setTimeout(r, 220));
        return { animation: style.animationName, transform: style.transform,
          background: style.backgroundColor, bounds,
          nextBounds: svg.getBoundingClientRect().toJSON(), offset,
          nextOffset: flow && getComputedStyle(flow).strokeDashoffset };
      })()`);
      assert.equal(
        motion.animation,
        "none",
        "the symbol itself must not rotate"
      );
      assert.equal(motion.transform, "none");
      assert.equal(motion.background, "rgba(0, 0, 0, 0)");
      assert.deepEqual(motion.bounds, motion.nextBounds);
      assert.notEqual(motion.offset, motion.nextOffset);
    });
    await check(
      "loading at the text start without a visible label",
      async () => {
        const position = await web.executeJavaScript(`(() => {
        const loader = document.querySelector('#loading');
        const svg = loader.querySelector('svg').getBoundingClientRect();
        const content = document.querySelector('.content').getBoundingClientRect();
        const result = document.querySelector('#result').getBoundingClientRect();
        return { text: loader.textContent.trim(), left: svg.left - content.left,
          top: svg.top - content.top, textLeft: result.left, iconLeft: svg.left };
      })()`);
        assert.equal(position.text, "");
        assert.equal(position.iconLeft, position.textLeft);
        assert.ok(position.top >= 10 && position.top < 18);
        await capture("flow-loading");
      }
    );
    await check("reduced motion stops the flowing highlight", async () => {
      await web.debugger.attach("1.3");
      await web.debugger.sendCommand("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      assert.equal(
        await web.executeJavaScript(
          "getComputedStyle(document.querySelector('.loading-flow')).animationName"
        ),
        "none"
      );
      await web.debugger.sendCommand("Emulation.setEmulatedMedia", {
        features: [],
      });
      web.debugger.detach();
    });
    await check("browser pin icon and amber unpin state", async () => {
      await web.executeJavaScript(
        "document.querySelector('#pin').click(); new Promise(r => setTimeout(r, 60))"
      );
      const icon = await web.executeJavaScript(`(() => {
        const button = document.querySelector('#pin');
        const svg = [...button.querySelectorAll('svg')].find(el => getComputedStyle(el).display !== 'none');
        return { pressed: button.getAttribute('aria-pressed'), color: getComputedStyle(button).color,
          background: getComputedStyle(button).backgroundColor, width: svg.getBoundingClientRect().width,
          stroke: getComputedStyle(svg).strokeWidth,
          paths: [...svg.querySelectorAll('path')].map(p => p.getAttribute('d')) };
      })()`);
      assert.equal(icon.pressed, "true");
      assert.equal(icon.color, "rgb(180, 83, 9)");
      assert.equal(icon.background, "rgb(255, 251, 235)");
      assert.equal(icon.width, 14);
      assert.equal(icon.stroke, "2px");
      assert.ok(icon.paths.includes("m2 2 20 20"));
      web.send("selection-result", "缩小光源尺寸，可以提高空间相干性。");
      web.send("selection-translation-state", "done");
      await web.executeJavaScript("new Promise(r => requestAnimationFrame(r))");
      await capture("flow-result-pinned");
      await web.executeJavaScript(
        "document.querySelector('#pin').click(); new Promise(r => setTimeout(r, 60))"
      );
      const unpinned = await web.executeJavaScript(`(() => {
        const button = document.querySelector('#pin');
        const visible = [...button.querySelectorAll('svg')].filter(el => getComputedStyle(el).display !== 'none');
        return { count: visible.length, pressed: button.getAttribute('aria-pressed'),
          color: getComputedStyle(button).color, paths: [...visible[0].querySelectorAll('path')].map(p => p.getAttribute('d')) };
      })()`);
      assert.equal(unpinned.count, 1);
      assert.equal(unpinned.pressed, "false");
      assert.equal(unpinned.color, "rgb(156, 163, 175)");
      assert.deepEqual(unpinned.paths, [
        "M12 17v5",
        "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
      ]);
      await capture("flow-result");
    });
    await check("streamed text and errors replace the loader", async () => {
      for (const state of ["loading", "error", "done"]) {
        web.send("selection-result", state === "loading" ? "首段译文" : "");
        web.send("selection-translation-state", state);
        assert.equal(
          await web.executeJavaScript(
            "new Promise(r => requestAnimationFrame(() => r(document.querySelector('#loading').hidden)))"
          ),
          true,
          state
        );
      }
    });
    assert.deepEqual(errors, []);
    console.log(`${5 - failures.length}/5 renderer checks passed`);
  } catch (error) {
    failures.push("renderer setup");
    console.error(error);
  } finally {
    window.destroy();
    app.exit(failures.length ? 1 : 0);
  }
});
