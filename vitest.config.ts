import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "obsidian-test-host",
      enforce: "pre",
      resolveId(id) {
        // Obsidian provides this runtime module; tests supply its public API mock.
        return id === "obsidian" ? "\0obsidian-test-host" : undefined;
      },
    },
  ],
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
