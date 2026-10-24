"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const mainSource = fs.readFileSync(path.join(__dirname, "main.cjs"), "utf8");
const browserWindowPattern = /new BrowserWindow\(/g;
const overlayWindowPattern = /let overlayWindow = null;/;
const toolbarWindowPattern = /let toolbarWindow = null;/;
const resultWindowPattern = /let resultWindow = null;/;
const overlayHtmlPattern = /overlay\.html/;
const loadCompletePattern = /did-finish-load/;

test("toolbar and result use one overlay BrowserWindow", () => {
  assert.equal((mainSource.match(browserWindowPattern) || []).length, 2);
  assert.match(mainSource, overlayWindowPattern);
  assert.doesNotMatch(mainSource, toolbarWindowPattern);
  assert.doesNotMatch(mainSource, resultWindowPattern);
  assert.match(mainSource, overlayHtmlPattern);
  assert.match(mainSource, loadCompletePattern);
});
