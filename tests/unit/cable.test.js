import { describe, it, expect, afterEach } from "vitest";
import Cable from "../../src/Cable.js";

const cables = [];
function createCable(config) {
  const cable = new Cable(config);
  cables.push(cable);
  return cable;
}

afterEach(() => {
  for (const cable of cables.splice(0)) cable.destroy();
  document.body.innerHTML = "";
});

function createMockElement(rect) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({
    left: rect.x || 0,
    top: rect.y || 0,
    right: (rect.x || 0) + (rect.width || 0),
    bottom: (rect.y || 0) + (rect.height || 0),
    width: rect.width || 0,
    height: rect.height || 0,
    x: rect.x || 0,
    y: rect.y || 0,
  });
  document.body.appendChild(el);
  return el;
}

describe("Cable", () => {
  it("creates correct number of points based on segments config", () => {
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 0, width: 10, height: 10 });
    const cable = createCable({ start, end, segments: 10 });
    expect(cable.points).toHaveLength(10);
  });

  it("creates one fewer segment element than points", () => {
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 0, width: 10, height: 10 });
    const cable = createCable({ start, end, segments: 10 });
    expect(cable.segmentElements).toHaveLength(9);
  });

  it("sets first point to start element center", () => {
    const start = createMockElement({ x: 50, y: 60, width: 10, height: 20 });
    const end = createMockElement({ x: 200, y: 100, width: 10, height: 10 });
    const cable = createCable({ start, end });
    expect(cable.points[0].x).toBe(55);
    expect(cable.points[0].y).toBe(70);
  });

  it("sets last point to end element center", () => {
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 50, width: 20, height: 30 });
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
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 0, width: 10, height: 10 });
    const cable = createCable({ start, end, gravity: 2, color: "#FF0000", slack: 1.5 });
    expect(cable.config.gravity).toBe(2);
    expect(cable.config.color).toBe("#FF0000");
    expect(cable.config.slack).toBe(1.5);
  });

  it("creates drag handles when draggable is true", () => {
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 0, width: 10, height: 10 });
    const cable = createCable({ start, end, draggable: true });
    const handles = cable.element.querySelectorAll(".cable-drag-handle");
    expect(handles).toHaveLength(2);
  });

  it("skips drag handles when draggable is false", () => {
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 0, width: 10, height: 10 });
    const cable = createCable({ start, end, draggable: false });
    const handles = cable.element.querySelectorAll(".cable-drag-handle");
    expect(handles).toHaveLength(0);
  });

  it("renders segment elements after update", () => {
    const start = createMockElement({ x: 0, y: 0, width: 10, height: 10 });
    const end = createMockElement({ x: 100, y: 100, width: 10, height: 10 });
    const cable = createCable({ start, end });
    cable.update();
    for (const seg of cable.segmentElements) {
      expect(Number.isFinite(parseFloat(seg.style.width))).toBe(true);
    }
  });
});
