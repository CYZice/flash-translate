"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const mainSource = fs.readFileSync(path.join(__dirname, "main.cjs"), "utf8");
const browserWindowPattern = /new BrowserWindow\(/g;
const toolbarWindowPattern = /let toolbarWindow = null;/;
const resultWindowPattern = /let resultWindow = null;/;
const toolbarHtmlPattern = /toolbar\.html/;
const resultHtmlPattern = /result\.html/;

test("toolbar and result use independent BrowserWindows", () => {
  assert.equal((mainSource.match(browserWindowPattern) || []).length, 3);
  assert.match(mainSource, toolbarWindowPattern);
  assert.match(mainSource, resultWindowPattern);
  assert.match(mainSource, toolbarHtmlPattern);
  assert.match(mainSource, resultHtmlPattern);
});
