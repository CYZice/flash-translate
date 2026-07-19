import path from "node:path";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import babel from "vite-plugin-babel";
import manifest from "./src/manifest";

function contentScriptHmr(): Plugin {
  return {
    name: "content-script-hmr",
    handleHotUpdate({ file, server }) {
      if (file.includes("/content/")) {
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    crx({ manifest }),
    contentScriptHmr(),
    babel({
      babelConfig: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    cors: true,
  },
  build: {
    rollupOptions: {
      input: {
        popup: "src/popup/index.html",
      },
    },
  },
});
