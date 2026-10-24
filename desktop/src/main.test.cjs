"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const mainSource = fs.readFileSync(path.join(__dirname, "main.cjs"), "utf8");

test("toolbar and result use one overlay BrowserWindow", () => {
  assert.equal((mainSource.match(/new BrowserWindow\(/g) || []).length, 2);
  assert.match(mainSource, /let overlayWindow = null;/);
  assert.doesNotMatch(mainSource, /let toolbarWindow = null;/);
  assert.doesNotMatch(mainSource, /let resultWindow = null;/);
  assert.match(mainSource, /overlay\.html/);
});
