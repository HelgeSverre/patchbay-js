import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Patchbay from "../../src/Patchbay.js";

function createEl(id, x, y, w = 50, h = 50) {
  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
  document.body.appendChild(el);
  return el;
}

describe("Patchbay lifecycle", () => {
  let patchbay;

  afterEach(() => {
    if (patchbay) {
      patchbay.stop();
      patchbay.destroy();
    }
    document.body.innerHTML = "";
  });

  it("start() sets isRunning", () => {
    patchbay = new Patchbay({ canvas: true });
    expect(patchbay.isRunning).toBeUndefined();
    patchbay.start();
    expect(patchbay.isRunning).toBe(true);
  });

  it("stop() clears isRunning and cancels RAF", () => {
    patchbay = new Patchbay({ canvas: true });
    patchbay.start();
    expect(patchbay.isRunning).toBe(true);
    patchbay.stop();
    expect(patchbay.isRunning).toBe(false);
    expect(patchbay._rafId).toBeNull();
  });

  it("double start() is safe", () => {
    patchbay = new Patchbay({ canvas: true });
    patchbay.start();
    patchbay.start();
    expect(patchbay.isRunning).toBe(true);
  });

  it("double stop() is safe", () => {
    patchbay = new Patchbay({ canvas: true });
    patchbay.start();
    patchbay.stop();
    patchbay.stop();
    expect(patchbay.isRunning).toBe(false);
  });

  it("connects two elements with DOM mode", () => {
    patchbay = new Patchbay();
    const a = createEl("a", 50, 50);
    const b = createEl("b", 150, 50);
    patchbay.connect(a, b);
    expect(patchbay.cables).toHaveLength(1);
  });

  it("connects two elements with canvas mode", () => {
    patchbay = new Patchbay({ canvas: true });
    const a = createEl("a", 50, 50);
    const b = createEl("b", 150, 50);
    patchbay.connect(a, b);
    expect(patchbay.cables).toHaveLength(1);
  });

  it("connects points", () => {
    patchbay = new Patchbay({ canvas: true });
    patchbay.connectPoints({ x: 10, y: 10 }, { x: 200, y: 200 });
    expect(patchbay.cables).toHaveLength(1);
  });

  it("clear() removes all cables in canvas mode", () => {
    patchbay = new Patchbay({ canvas: true });
    const a = createEl("a", 0, 0);
    const b = createEl("b", 100, 0);
    patchbay.connect(a, b);
    patchbay.connect(createEl("c", 0, 100), createEl("d", 100, 100));
    expect(patchbay.cables).toHaveLength(2);
    patchbay.clear();
    expect(patchbay.cables).toHaveLength(0);
  });

  it("destroy() cleans up canvas and listeners", () => {
    patchbay = new Patchbay({ canvas: true });
    patchbay.start();
    patchbay.destroy();
    expect(patchbay.isRunning).toBe(false);
    expect(patchbay.cables).toHaveLength(0);
    // Root should be removed from DOM
    expect(document.querySelector(".patchbay-canvas")).toBeNull();
  });

  it("startCable creates a cable and begins dragging", () => {
    patchbay = new Patchbay({ canvas: true });
    const cable = patchbay.startCable({ x: 100, y: 100 });
    expect(cable.isDragging).toBe(true);
    expect(cable.draggedEnd).toBe("end");
    expect(patchbay.cables).toHaveLength(1);
  });

  it("throws with null container", () => {
    expect(() => new Patchbay({ container: null })).toThrow("No container element provided for patchbay");
  });

  it("static mode uses absolute positioning", () => {
    patchbay = new Patchbay({ static: true });
    expect(patchbay.root.style.position).toBe("absolute");
  });

  it("non-static canvas uses fixed positioning", () => {
    patchbay = new Patchbay({ canvas: true }); // static defaults to false
    expect(patchbay.root.style.position).toBe("fixed");
  });
});
