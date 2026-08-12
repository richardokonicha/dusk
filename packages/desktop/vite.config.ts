import { defineConfig } from "electron-vite";

export default defineConfig({
  preload: {
    build: {
      rollupOptions: {
        external: ["electron"],
        input: "./src/main/preload/index.ts"
      }
    }
  },
  main: {
    build: {
      rollupOptions: {
        external: ["better-sqlite3", "electron"]
      }
    }
  },
  renderer: {
    build: {
      rollupOptions: {
        external: ["electron"]
      }
    }
  }
});
