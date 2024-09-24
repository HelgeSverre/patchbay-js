import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "Patchbay",
      fileName: (format) => `patchbay.${format}.js`,
    },
  },
});
