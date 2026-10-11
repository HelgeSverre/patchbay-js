import { afterEach, describe, expect, it, vi } from "vitest";
import Patchbay from "../../src/Patchbay.js";
import Cable from "../../src/Cable.js";
import CanvasCable from "../../src/CanvasCable.js";

const resources = [];
function track(resource) {
  resources.push(resource);
  return resource;
}

function anchor(x = 100, y = 100, tag = "div") {
  const el = document.createElement(tag);
  el.getBoundingClientRect = () => ({ left: x, top: y, width: 20, height: 20 });
  document.body.append(el);
  return el;
}

afterEach(() => {
  for (const resource of resources.splice(0)) resource.destroy();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each([
  ["DOM", Cable, false],
  ["Canvas", CanvasCable, true],
])("%s regressions", (_name, CableClass, canvas) => {
  it("refreshes anchors for new cables after layout changes", () => {
    const el = anchor();
    track(new CableClass({ start: el, end: el, draggable: false }));
    el.getBoundingClientRect = () => ({ left: 300, top: 200, width: 20, height: 20 });
    const cable = track(new CableClass({ start: el, end: el, draggable: false }));
    expect(cable.points[0].x).toBe(310);
  });

  it("refreshes layout when update is called without a frame", () => {
    const el = anchor();
    const cable = track(new CableClass({ start: el, end: el, draggable: false }));
    cable.update();
    el.getBoundingClientRect = () => ({ left: 300, top: 200, width: 20, height: 20 });
    cable.update();
    expect(cable.points[0].x).toBe(310);
  });

  it("does not share stale rectangles between independent patchbays", () => {
    const el = anchor();
    const first = track(new Patchbay({ canvas, draggable: false }));
    const second = track(new Patchbay({ canvas, draggable: false }));
    first.connect(el, el);
    const cable = second.connect(el, el);
    first.update();
    el.getBoundingClientRect = () => ({ left: 300, top: 200, width: 20, height: 20 });
    second.update();
    expect(cable.points[0].x).toBe(310);
  });

  it("shares rectangle reads within one patchbay update", () => {
    const el = anchor();
    const getRect = vi.spyOn(el, "getBoundingClientRect");
    const patchbay = track(new Patchbay({ canvas, draggable: false }));
    for (let i = 0; i < 10; i++) patchbay.connect(el, el);
    getRect.mockClear();
    patchbay.update();
    expect(getRect).toHaveBeenCalledTimes(1);
  });

  it("uses the center of image elements that also expose x and y", () => {
    const el = anchor(100, 200, "img");
    const cable = track(new CableClass({ start: el, end: el, draggable: false }));
    expect(cable.points[0].x).toBe(110);
    expect(cable.points[0].y).toBe(210);
  });

  it("does not snap outside the configured radius", () => {
    const el = anchor();
    el.className = "cable-connector";
    const cable = track(new CableClass({ start: el, end: el, snapRadius: 0 }));
    expect(cable.findSnapTarget(110.5, 110)).toBeNull();
    expect(cable.findSnapTarget(110, 110)).toBe(el);
  });

  it("applies page coordinates on cached static anchors", () => {
    vi.stubGlobal("scrollX", 40);
    vi.stubGlobal("scrollY", 200);
    const el = anchor();
    const patchbay = track(new Patchbay({ canvas, static: true, draggable: false }));
    const cable = patchbay.connect(el, el);
    patchbay.update();
    expect(cable.points[0].x).toBe(150);
    expect(cable.points.at(-1).x).toBe(150);
    expect(cable.points[0].y).toBe(310);
    expect(cable.points.at(-1).y).toBe(310);
  });

  it("keeps non-static anchors in viewport coordinates", () => {
    vi.stubGlobal("scrollY", 200);
    const el = anchor();
    const cable = track(new CableClass({ start: el, end: el, static: false }));
    cable.update();
    expect(cable.points[0].y).toBe(110);
  });

  it("converts dragging and snapping to page coordinates in static mode", () => {
    vi.stubGlobal("scrollX", 40);
    vi.stubGlobal("scrollY", 200);
    const target = anchor(100, 100);
    target.className = "cable-connector";
    const cable = track(
      new CableClass({
        start: { x: 10, y: 10 },
        end: { x: 20, y: 20 },
        static: true,
        snapRadius: 0,
      }),
    );
    cable.startDragging(null, "end");
    cable.drag({ clientX: 110, clientY: 110 });
    expect(cable.points.at(-1).x).toBe(150);
    expect(cable.points.at(-1).y).toBe(310);
    cable.stopDragging();
    expect(cable.end).toBe(target);
  });

  it("ignores public drag calls while inactive", () => {
    const cable = track(new CableClass({ start: { x: 10, y: 10 }, end: { x: 20, y: 20 } }));
    cable.end = null;
    cable.drag({ clientX: 500, clientY: 500 });
    expect(cable.points.at(-1).x).toBe(20);
    expect(cable.points.at(-1).y).toBe(20);
  });

  it("allows a dormant cable to settle after an unsnapped drag", () => {
    const cable = track(new CableClass({ start: { x: 10, y: 10 }, end: { x: 20, y: 20 }, snapRadius: 0 }));
    for (let i = 0; i < 100; i++) cable.update(i);
    cable.startDragging(null, "end");
    cable.drag({ clientX: 400, clientY: 200 });
    cable.stopDragging();
    const positions = cable.points.slice(1, -1).map(({ x, y }) => ({ x, y }));
    cable.update();
    expect(cable.points.slice(1, -1).map(({ x, y }) => ({ x, y }))).not.toEqual(positions);
  });

  it("keeps coincident endpoints finite across many updates", () => {
    const cable = track(new CableClass({ start: { x: 10, y: 10 }, end: { x: 10, y: 10 } }));
    for (let i = 0; i < 100; i++) cable.update(i);
    expect(cable.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("shares drag listeners and removes them after the last cable", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const first = track(new CableClass({ start: { x: 10, y: 10 }, end: { x: 20, y: 20 } }));
    const second = track(new CableClass({ start: { x: 30, y: 30 }, end: { x: 40, y: 40 } }));
    const registrations = add.mock.calls.filter(([type]) => type === "mousemove" || type === "mouseup");
    expect(registrations).toHaveLength(2);
    first.destroy();
    expect(remove).not.toHaveBeenCalled();
    second.destroy();
    for (const [type, callback] of registrations) expect(remove).toHaveBeenCalledWith(type, callback);
  });
});

describe("Canvas cleanup", () => {
  it("removes the actual registered resize listener", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const patchbay = track(new Patchbay({ canvas: true }));
    const callback = add.mock.calls.find(([type]) => type === "resize")[1];
    patchbay.destroy();
    expect(remove).toHaveBeenCalledWith("resize", callback);
  });

  it("erases removed cables even when the animation is stopped", () => {
    const patchbay = track(new Patchbay({ canvas: true, draggable: false, gravity: 0 }));
    const cable = patchbay.connectPoints({ x: 20, y: 20 }, { x: 200, y: 20 });
    patchbay.update();
    const pixels = () => patchbay._ctx.getImageData(0, 0, patchbay.root.width, patchbay.root.height).data;
    expect(pixels().some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
    patchbay.removeCable(cable);
    expect(pixels().some((value, index) => index % 4 === 3 && value > 0)).toBe(false);
  });

  it("attaches canvas drag handles inside the requested container", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const patchbay = track(new Patchbay({ canvas: true, container, zIndex: 123 }));
    const cable = patchbay.connectPoints({ x: 10, y: 10 }, { x: 100, y: 100 });
    expect(container.contains(cable.startHandle)).toBe(true);
    expect(cable._handlesContainer.style.zIndex).toBe("123");
  });
});
