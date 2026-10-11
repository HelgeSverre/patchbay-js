import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CanvasCable from "../../src/CanvasCable.js";

const cables = [];
function createCable(config) {
  const cable = new CanvasCable(config);
  cables.push(cable);
  return cable;
}

afterEach(() => {
  for (const cable of cables.splice(0)) cable.destroy();
  document.body.innerHTML = "";
});

function createMockElement(x = 0, y = 0, w = 10, h = 10) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y });
  document.body.appendChild(el);
  return el;
}

describe("CanvasCable", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates the configured number of points", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 0);
    const cable = createCable({ start, end, segments: 10 });
    expect(cable.points).toHaveLength(10);
  });

  it("scales segments with cable length", () => {
    const start = createMockElement(0, 0);
    // 1000px apart, maxSegmentLength defaults to 30 → ceil(1000/30) = 34 segments
    const end = createMockElement(1000, 0);
    const cable = createCable({ start, end, segments: 5, maxSegmentLength: 30 });
    expect(cable.points.length).toBeGreaterThanOrEqual(34);
  });

  it("respects minimum segments", () => {
    const start = createMockElement(0, 0);
    // 50px apart, maxSegmentLength=30 → ceil(50/30) = 2 → max(10, 2) = 10
    const end = createMockElement(50, 0);
    const cable = createCable({ start, end, segments: 10, maxSegmentLength: 30 });
    expect(cable.points.length).toBe(10);
  });

  it("sets first point to start element center", () => {
    const start = createMockElement(50, 60, 10, 20);
    const end = createMockElement(200, 100, 10, 10);
    const cable = createCable({ start, end });
    expect(cable.points[0].x).toBe(55);
    expect(cable.points[0].y).toBe(70);
  });

  it("sets last point to end element center", () => {
    const start = createMockElement(0, 0, 10, 10);
    const end = createMockElement(100, 50, 20, 30);
    const cable = createCable({ start, end });
    const last = cable.points[cable.points.length - 1];
    expect(last.x).toBe(110);
    expect(last.y).toBe(65);
  });

  it("works with plain {x,y} point objects", () => {
    const cable = createCable({ start: { x: 42, y: 99 }, end: { x: 200, y: 300 } });
    expect(cable.points[0].x).toBe(42);
    expect(cable.points[0].y).toBe(99);
  });

  it("merges custom config with defaults", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 0);
    const cable = createCable({ start, end, gravity: 2, color: "#FF0000", slack: 1.5 });
    expect(cable.config.gravity).toBe(2);
    expect(cable.config.color).toBe("#FF0000");
    expect(cable.config.slack).toBe(1.5);
  });

  it("physics updates change point positions over multiple frames", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 100);
    const cable = createCable({ start, end, segments: 5, gravity: 1 });

    // Collect initial positions
    const initial = cable.points.map((p) => ({ x: p.x, y: p.y }));

    // Run a few frames
    for (let i = 0; i < 10; i++) cable.update(i);

    // At least one interior point should have moved
    let moved = false;
    for (let i = 1; i < cable.points.length - 1; i++) {
      if (cable.points[i].x !== initial[i].x || cable.points[i].y !== initial[i].y) {
        moved = true;
        break;
      }
    }
    expect(moved).toBe(true);
  });

  it("creates drag handles when draggable", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 0);
    const cable = createCable({ start, end, draggable: true });
    const handles = document.querySelectorAll(".cable-drag-handle");
    expect(handles.length).toBe(2);
  });

  it("skips drag handles when draggable is false", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 0);
    const cable = createCable({ start, end, draggable: false });
    const handles = document.querySelectorAll(".cable-drag-handle");
    expect(handles.length).toBe(0);
  });

  it("stops physics after settling when endpoints are static", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 0);
    const cable = createCable({ start, end, segments: 5 });

    // Run many frames to settle
    for (let i = 0; i < 100; i++) cable.update(i);
    const yAfterSettle = cable.points[2].y;

    // Run another frame — should be dormant, no change
    cable.update(101);
    expect(cable.points[2].y).toBe(yAfterSettle);
  });

  it("wakes from dormant state when endpoint moves", () => {
    const start = createMockElement(0, 0);
    const end = createMockElement(100, 0);
    const cable = createCable({ start, end, segments: 5 });

    // Settle
    for (let i = 0; i < 100; i++) cable.update(i);

    // Move the end element
    end.getBoundingClientRect = () => ({
      left: 200,
      top: 0,
      right: 210,
      bottom: 10,
      width: 10,
      height: 10,
      x: 200,
      y: 0,
    });

    cable.update(101);
    // Cable should have re-awakened and physics ran
    expect(cable.points[cable.points.length - 1].x).toBe(205);
  });
});
