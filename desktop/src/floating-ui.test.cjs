"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  getSelectionAnchor,
  placeFloatingWindow,
  getDismissal,
} = require("./floating-ui.cjs");

const toolbar = { x: 100, y: 200, width: 36, height: 36 };
const result = { x: 200, y: 300, width: 360, height: 160 };

test("outside clicks dismiss the selection button and unpinned result", () => {
  assert.deepEqual(
    getDismissal({ type: "pointer", point: { x: 10, y: 10 }, toolbar, result }),
    { toolbar: true, result: true }
  );
});

test("pressing the translation button keeps it alive until the action runs", () => {
  assert.deepEqual(
    getDismissal({
      type: "pointer",
      point: { x: 115, y: 215 },
      toolbar,
      result,
    }),
    { toolbar: false, result: true }
  );
});

test("scrolling removes the selection button but allows scrolling inside the result", () => {
  assert.deepEqual(
    getDismissal({ type: "wheel", point: { x: 220, y: 320 }, toolbar, result }),
    { toolbar: true, result: false }
  );
});

test("typing and app switching dismiss the button without closing a focused result", () => {
  assert.deepEqual(
    getDismissal({ type: "key", key: "Tab", resultFocused: true }),
    { toolbar: true, result: false }
  );
  assert.deepEqual(
    getDismissal({ type: "key", key: "a", resultFocused: false }),
    { toolbar: true, result: true }
  );
});

test("pinned results survive outside input while Escape explicitly closes them", () => {
  assert.equal(
    getDismissal({ type: "pointer", point: { x: 0, y: 0 }, resultPinned: true })
      .result,
    false
  );
  assert.equal(
    getDismissal({ type: "key", key: "a", resultPinned: true }).result,
    false
  );
  assert.equal(
    getDismissal({ type: "key", key: "Escape", resultPinned: true }).result,
    true
  );
});

test("selection coordinates support left monitors and skip unavailable native points", () => {
  assert.deepEqual(
    getSelectionAnchor({ text: "hello", mousePosEnd: { x: -800, y: 300 } }),
    { x: -800, y: 300 }
  );
  assert.deepEqual(
    getSelectionAnchor({
      text: "hello",
      mousePosEnd: { x: -99_999, y: -99_999 },
      endBottom: { x: 25, y: 30 },
    }),
    { x: 25, y: 30 }
  );
  assert.equal(
    getSelectionAnchor({ text: "  ", mousePosEnd: { x: 25, y: 30 } }),
    null
  );
  assert.equal(
    getSelectionAnchor({
      text: "hello",
      mousePosEnd: { x: Number.NaN, y: 20 },
    }),
    null
  );
});

test("floating windows remain inside the work area and flip above the bottom edge", () => {
  assert.deepEqual(
    placeFloatingWindow(
      { x: 990, y: 790 },
      { width: 36, height: 36 },
      { x: 0, y: 0, width: 1000, height: 800 }
    ),
    { x: 956, y: 744 }
  );
  assert.deepEqual(
    placeFloatingWindow(
      { x: -995, y: 10 },
      { width: 36, height: 36 },
      { x: -1000, y: 0, width: 1000, height: 800 }
    ),
    { x: -987, y: 20 }
  );
});
