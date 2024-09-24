import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "Patchbay",
      formats: ["es", "umd", "cjs"],
      fileName: (format) => `patchbay.${format}.js`,
    },
    rollupOptions: {
      output: {
        globals: {
          patchbay: "Patchbay",
        },
      },
    },
    emptyOutDir: true,
    sourcemap: true,
    outDir: "dist",
    minify: true,
  },
});
