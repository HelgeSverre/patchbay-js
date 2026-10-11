import { describe, it, expect } from "vitest";
import Point from "../../src/Point.js";

describe("Point", () => {
  it("initializes with x, y, oldX, oldY", () => {
    const p = new Point(10, 20);
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
    expect(p.oldX).toBe(10);
    expect(p.oldY).toBe(20);
  });

  it("applies gravity during update", () => {
    const p = new Point(0, 0);
    p.update(1);
    expect(p.y).toBeGreaterThan(0);
  });

  it("updates old position on each call", () => {
    const p = new Point(10, 0);
    p.update(2);
    const { oldX, oldY } = p;
    p.update(2);
    expect(p.oldX).toBe(10);
    expect(p.oldY).toBeGreaterThan(oldY);
  });
});
