import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Patchbay from "../../src/Patchbay.js";

function createEl(id, x, y, w = 50, h = 50) {
  const el = document.createElement("div");
  el.id = id;
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
  document.body.appendChild(el);
  return el;
}

describe("Patchbay e2e", () => {
  let patchbay;

  afterEach(() => {
    if (patchbay) {
      patchbay.stop();
      patchbay.destroy();
    }
    document.body.innerHTML = "";
  });

  it("instantiates with defaults", () => {
    patchbay = new Patchbay();
    expect(patchbay.config.gravity).toBe(1);
    expect(patchbay.config.segments).toBe(20);
  });

  it("appends a patchbay-container to the DOM", () => {
    patchbay = new Patchbay();
    const root = document.querySelector(".patchbay-container");
    expect(root).not.toBeNull();
    expect(root.style.position).toBe("fixed");
  });

  it("connects two elements and produces segments in the DOM", () => {
    patchbay = new Patchbay();
    const a = createEl("a", 100, 100);
    const b = createEl("b", 300, 200);

    patchbay.connect(a, b);
    patchbay.update();

    const segments = document.querySelectorAll(".cable-segment");
    expect(segments.length).toBeGreaterThan(0);
  });

  it("adds multiple cables", () => {
    patchbay = new Patchbay();
    const a = createEl("a", 50, 50);
    const b = createEl("b", 150, 50);
    const c = createEl("c", 50, 150);
    const d = createEl("d", 150, 150);

    patchbay.connect(a, b);
    patchbay.connect(c, d);
    expect(patchbay.cables).toHaveLength(2);
  });

  it("removes a cable", () => {
    patchbay = new Patchbay();
    const a = createEl("a", 50, 50);
    const b = createEl("b", 150, 50);

    const cable = patchbay.connect(a, b);
    expect(patchbay.cables).toHaveLength(1);

    patchbay.removeCable(cable);
    expect(patchbay.cables).toHaveLength(0);
  });

  it("clears all cables", () => {
    patchbay = new Patchbay();
    patchbay.connect(createEl("a", 0, 0), createEl("b", 100, 0));
    patchbay.connect(createEl("c", 0, 100), createEl("d", 100, 100));
    expect(patchbay.cables).toHaveLength(2);

    patchbay.clear();
    expect(patchbay.cables).toHaveLength(0);
  });

  it("passes per-cable config overrides", () => {
    patchbay = new Patchbay({ color: "#000" });
    const a = createEl("a", 50, 50);
    const b = createEl("b", 150, 50);

    const cable = patchbay.connect(a, b, { color: "#0F0", slack: 1.5 });
    expect(cable.config.color).toBe("#0F0");
    expect(cable.config.slack).toBe(1.5);
  });

  it("starts and stops animation loop", () => {
    patchbay = new Patchbay();
    patchbay.start();
    expect(patchbay.isRunning).toBe(true);
    patchbay.stop();
    expect(patchbay.isRunning).toBe(false);
  });

  it("creates drag handles when draggable", () => {
    patchbay = new Patchbay({ draggable: true });
    const a = createEl("a", 50, 50);
    const b = createEl("b", 150, 50);

    patchbay.connect(a, b);
    const handles = document.querySelectorAll(".cable-drag-handle");
    expect(handles.length).toBe(2);
  });

  it("connects points via connectPoints", () => {
    patchbay = new Patchbay();
    const cable = patchbay.connectPoints({ x: 10, y: 10 }, { x: 200, y: 200 });
    expect(cable).toBeDefined();
    expect(patchbay.cables).toHaveLength(1);
  });

  it("creates a cable being dragged from the end via startCable", () => {
    patchbay = new Patchbay();
    const cable = patchbay.startCable({ x: 100, y: 100 });
    expect(cable.isDragging).toBe(true);
    expect(cable.draggedEnd).toBe("end");
  });

  it("snaps to .cable-connector targets", () => {
    patchbay = new Patchbay({ snapRadius: 100, draggable: true });
    const a = createEl("a", 50, 50);

    const snapEl = document.createElement("div");
    snapEl.classList.add("cable-connector");
    snapEl.style.cssText = "position:absolute;left:140px;top:50px;width:20px;height:20px;";
    document.body.appendChild(snapEl);

    const cable = patchbay.startCable({ x: 50, y: 50 });
    cable.drag({ clientX: 150, clientY: 60 });
    cable.stopDragging();

    expect(cable.end).toBe(snapEl);
  });
});
