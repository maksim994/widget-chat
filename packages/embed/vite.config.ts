import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/widget.ts"),
      name: "WidgetChat",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    cors: true,
  },
});
