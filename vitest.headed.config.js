import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: false,
      instances: [{ browser: "chromium" }],
    },
    include: ["tests/**/*.test.js"],
    testTimeout: 10000,
  },
});
