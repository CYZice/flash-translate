"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const executable = path.resolve(
  process.argv[2] || "dist/FlashTranslate-0.1.4-win32-x64/FlashTranslate.exe"
);
const literalPath = executable.replaceAll("'", "''");
const metadata = JSON.parse(
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `(Get-Item -LiteralPath '${literalPath}').VersionInfo | ConvertTo-Json`,
    ],
    { encoding: "utf8" }
  )
);

for (const field of ["ProductName", "FileDescription"]) {
  assert.equal(metadata[field], "Flash Translate", field);
}
assert.equal(metadata.OriginalFilename, "FlashTranslate.exe");
assert.equal(metadata.CompanyName, "Flash Translate");
console.log("PASS portable metadata", executable);
