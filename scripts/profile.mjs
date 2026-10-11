#!/usr/bin/env node

/**
 * Captures a performance profile of the stress test using Playwright tracing.
 * Usage: node scripts/profile.mjs [cableCount] [durationSec] [canvas]
 *   canvas: "true" or "false" (default "true")
 */

import { chromium } from "playwright";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cableCount = parseInt(process.argv[2]) || 300;
const durationSec = parseInt(process.argv[3]) || 5;
const useCanvas = process.argv[4] !== "false";

async function main() {
  console.log(`Starting Vite dev server...`);
  const server = await createServer({ root: resolve(__dirname, "..") });
  await server.listen();
  const url = `http://localhost:${server.config.server.port}/examples/stress-test.html`;
  console.log(`Server at ${url}`);

  console.log(`Launching Chromium...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning") console.error(`  [${t}]`, msg.text());
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  // Build grid
  await page.evaluate(
    ({ count, canvas }) => {
      const $ = (id) => document.getElementById(id);
      $("canvas-mode").checked = canvas;
      $("cell-size").value = 12;
      $("cable-count-input").value = count;
      $("segments").value = 8;
      $("iterations").value = 5;
      $("gravity").value = 2;
      $("slack").value = 1.1;
      window._profileRebuild();
    },
    { count: cableCount, canvas: useCanvas },
  );
  await page.waitForTimeout(500);

  // Fill with random cables
  await page.evaluate((count) => window._profileRandomFill(count), cableCount);
  await page.waitForTimeout(500);

  // Short warm-up, then trace during settling phase
  await page.waitForTimeout(200);

  // Collect FPS before trace
  const fpsBefore = await page.evaluate(() => document.getElementById("fps-value").textContent);
  const frameMsBefore = await page.evaluate(() => document.getElementById("frame-ms").textContent);
  console.log(`Initial — FPS: ${fpsBefore}, frame: ${frameMsBefore}ms`);

  // Start Playwright trace
  const mode = useCanvas ? "canvas" : "dom";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tracePath = resolve(__dirname, "..", "profiles", `trace-${cableCount}cables-${mode}-${timestamp}.zip`);
  console.log(`Recording ${mode} trace for ${durationSec}s → ${tracePath}`);

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await page.waitForTimeout(durationSec * 1000);
  await context.tracing.stop({ path: tracePath });

  // Collect FPS after trace
  const fpsAfter = await page.evaluate(() => document.getElementById("fps-value").textContent);
  const frameMsAfter = await page.evaluate(() => document.getElementById("frame-ms").textContent);
  console.log(`After trace — FPS: ${fpsAfter}, frame: ${frameMsAfter}ms`);
  console.log(`\nView the trace with: npx playwright show-trace ${tracePath}`);

  await browser.close();
  await server.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
