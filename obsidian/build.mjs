import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

process.chdir(fileURLToPath(new URL(".", import.meta.url)));
const outdir = "dist/flash-translate";
await mkdir(outdir, { recursive: true });
for (const name of ["manifest.json", "styles.css"]) {
  await copyFile(name, `${outdir}/${name}`);
}
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2022",
  external: ["obsidian"],
  outfile: `${outdir}/main.js`,
  logLevel: "info",
  sourcemap: process.argv.includes("--watch") ? "inline" : false,
};
if (process.argv.includes("--watch")) {
  const builder = await context(options);
  await builder.watch();
} else {
  await build(options);
}
