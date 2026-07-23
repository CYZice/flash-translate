import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "__MSG_ext_name__",
  version: packageJson.version,
  description: "__MSG_ext_description__",
  default_locale: "en",

  icons: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  },

  permissions: ["storage", "activeTab"],

  action: {
    default_popup: "src/popup/index.html",
    default_title: "__MSG_ext_actionTitle__",
    default_icon: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
    },
  },

  options_ui: {
    page: "src/popup/index.html",
    open_in_tab: true,
  },

  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  content_scripts: [
    {
      matches: ["https://*/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],

  minimum_chrome_version: "150",
  homepage_url: "https://github.com/yoshikouki/flash-translate",
});
