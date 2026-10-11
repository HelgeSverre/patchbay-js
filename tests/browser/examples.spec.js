import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page._errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page._errors).toEqual([]);
});

for (const [example, cables] of [
  ["basic-usage", 2],
  ["snapping", 2],
  ["configurations", 1],
]) {
  test(`${example} renders the built UMD bundle`, async ({ page }) => {
    await page.goto(`/examples/${example}.html`);
    await expect(page.locator(".cable-container")).toHaveCount(cables);
    await expect(page.locator(".cable-segment").first()).toHaveCSS("width", /[1-9]/);
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll(".cable-segment")].every(
          (el) => Number.isFinite(parseFloat(el.style.width)) && !el.style.transform.includes("NaN"),
        ),
      ),
    ).toBe(true);
  });
}

test("CDN example loads the published UMD bundle", async ({ page }) => {
  await page.goto("/examples/using-cdn-link.html");
  await expect(page.locator(".cable-container")).toHaveCount(2);
  await expect(page.locator(".cable-segment").first()).toHaveCSS("width", /[1-9]/);
});

test("configurator applies settings and retargets without leaking cables", async ({ page }) => {
  await page.goto("/examples/configurations.html");
  await page.locator("#gravity").fill("3");
  await page.locator("#segments").fill("12");
  await page.locator("#lineThickness").fill("6");
  await page.locator("#apply-config").click();
  await expect(page.locator(".cable-container")).toHaveCount(1);
  await expect(page.locator(".cable-segment").first()).toHaveCSS("height", "6px");
  await page.locator("#move-cable").click();
  await expect(page.locator(".cable-drag-handle")).toHaveCount(2);
});

test("dragging from a port creates one cable and snaps to the destination", async ({ page }) => {
  await page.goto("/examples/click-to-add.html");
  const source = await page.locator("#input-1").boundingBox();
  const target = await page.locator("#output-6").boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".cable-container")).toHaveCount(1);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const handle = document.querySelectorAll(".cable-drag-handle")[1].getBoundingClientRect();
        const target = document.querySelector("#output-6").getBoundingClientRect();
        return Math.hypot(
          handle.x + handle.width / 2 - target.x - target.width / 2,
          handle.y + handle.height / 2 - target.y - target.height / 2,
        );
      }),
    )
    .toBeLessThan(1);
});

for (const canvas of [true, false]) {
  test(`stress example fills, scrolls, clears, and rebuilds (${canvas ? "canvas" : "DOM"})`, async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/examples/stress-test.html");
    await page.locator("#canvas-mode").setChecked(canvas);
    await page.locator("#cable-count-input").fill("300");
    await page.locator("#gravity").fill("4");
    await page.locator("#iterations").fill("7");
    await page.locator("#random-fill").click();
    await expect(page.locator("#cable-count")).toHaveText("300");
    const settings = await page.evaluate(() => ({
      gravity: patchbay.cables[0].config.gravity,
      iterations: patchbay.cables[0].config.iterations,
      segments: patchbay.cables.reduce((n, c) => n + c.points.length - 1, 0),
    }));
    expect(settings.gravity).toBe(4);
    expect(settings.iterations).toBe(7);
    await expect(page.locator("#segment-count")).toHaveText(String(settings.segments));
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(() =>
        patchbay.cables.every((c) => c.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))),
      ),
    ).toBe(true);
    await page.locator("#add-batch").click();
    await expect(page.locator("#cable-count")).toHaveText("400");
    await page.locator("#clear").click();
    await expect(page.locator("#cable-count")).toHaveText("0");
    await expect(page.locator(".connected")).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(".stress-cell").nth(500).click();
    await expect(page.locator(".pending")).toHaveCount(1);
    await page.locator("#clear").click();
    await expect(page.locator(".pending")).toHaveCount(0);
    await page.locator("#rebuild").click();
    await expect(page.locator(canvas ? ".patchbay-canvas" : ".patchbay-container")).toHaveCount(1);
    await expect(page.locator("#cable-count")).toHaveText("0");
  });
}

for (const canvas of [false, true]) {
  for (const staticMode of [false, true]) {
    test(`built ESM ${canvas ? "canvas" : "DOM"} aligns, drags and resizes with static=${staticMode}`, async ({
      page,
    }) => {
      await page.goto("/examples/index.html");
      await page.evaluate(
        async ({ canvas, staticMode }) => {
          const { default: Patchbay } = await import("/dist/patchbay.es.js");
          document.body.innerHTML = "";
          document.body.style.cssText = "margin:0;height:2400px;display:block;";
          for (const [id, x, y] of [
            ["a", 200, 600],
            ["b", 600, 650],
            ["target", 700, 700],
          ]) {
            const el = document.createElement("div");
            el.id = id;
            el.className = "cable-connector";
            el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:30px;height:30px;background:gray`;
            document.body.append(el);
          }
          window._bay = new Patchbay({
            canvas,
            static: staticMode,
            gravity: 0,
            slack: 1,
            snapRadius: 30,
            color: "red",
            lineThickness: 6,
          });
          window._cable = window._bay.connect(document.querySelector("#a"), document.querySelector("#b"));
          window._bay.start();
        },
        { canvas, staticMode },
      );
      await page.evaluate(() => window.scrollTo(0, 400));
      const alignment = async () =>
        page.evaluate(() => {
          const a = document.querySelector("#a").getBoundingClientRect();
          const h = window._cable.startHandle.getBoundingClientRect();
          return Math.hypot(a.x + a.width / 2 - h.x - h.width / 2, a.y + a.height / 2 - h.y - h.height / 2);
        });
      await expect.poll(alignment).toBeLessThan(1);
      if (canvas) {
        await expect
          .poll(() =>
            page.evaluate(() => {
              const rect = document.querySelector("#a").getBoundingClientRect();
              const dpr = window.devicePixelRatio;
              const pixels = window._bay._ctx.getImageData(
                (rect.x + rect.width / 2 - 3) * dpr,
                (rect.y + rect.height / 2 - 3) * dpr,
                6 * dpr,
                6 * dpr,
              ).data;
              return pixels.some((value, index) => index % 4 === 3 && value > 0);
            }),
          )
          .toBe(true);
      }
      const handle = await page.locator(".cable-drag-handle").last().boundingBox();
      const target = await page.locator("#target").boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
      await page.mouse.up();
      await expect.poll(() => page.evaluate(() => window._cable.end?.id)).toBe("target");
      await page.setViewportSize({ width: 1000, height: 600 });
      await expect.poll(alignment).toBeLessThan(1);
      if (canvas) {
        await expect
          .poll(() => page.evaluate(() => window._bay.root.width))
          .toBe(await page.evaluate(() => window.innerWidth * window.devicePixelRatio));
      }
      const stoppedFrame = await page.evaluate(() => {
        window._bay.stop();
        return window._bay._frame;
      });
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => window._bay._frame)).toBe(stoppedFrame);
      await page.evaluate(() => window._bay.destroy());
      await expect(page.locator(".cable-drag-handle")).toHaveCount(0);
      await expect(page.locator(".patchbay-container, .patchbay-canvas")).toHaveCount(0);
    });
  }
}
