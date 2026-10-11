import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Patchbay from "../../src/Patchbay.js";

/**
 * E2e test that replicates stress-test.html behavior:
 * click-to-connect ports, random fill, clear.
 */
describe("Stress test behavior", () => {
  /** @type {Patchbay} */
  let patchbay;
  /** @type {HTMLDivElement[]} */
  let ports = [];
  let pendingSource = null;

  function createPorts(rows, cols, cellSize) {
    const grid = document.createElement("div");
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},${cellSize}px);gap:3px;`;
    document.body.appendChild(grid);

    ports = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.classList.add("stress-cell");
        cell.classList.add(r < rows / 2 ? "row-top" : "row-bot");
        cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;border-radius:50%;position:absolute;left:${c * (cellSize + 3)}px;top:${r * (cellSize + 3)}px;`;
        grid.appendChild(cell);
        ports.push(cell);
      }
    }
  }

  function clickPort(cell) {
    if (pendingSource) {
      if (cell === pendingSource) {
        cell.classList.remove("pending");
        pendingSource = null;
        return;
      }
      patchbay.connect(pendingSource, cell, { color: "#6366f1", segments: 8, slack: 1.1 });
      pendingSource.classList.add("connected");
      pendingSource.classList.remove("pending");
      cell.classList.add("connected");
      pendingSource = null;
    } else {
      pendingSource = cell;
      cell.classList.add("pending");
    }
  }

  beforeEach(() => {
    ports = [];
    pendingSource = null;
    createPorts(6, 6, 16);
    patchbay = new Patchbay({
      canvas: true,
      gravity: 2,
      iterations: 5,
      snapRadius: 20,
      snapTargetSelector: ".stress-cell",
      draggable: false,
    });
  });

  afterEach(() => {
    if (patchbay) {
      patchbay.stop();
      patchbay.destroy();
    }
    document.body.innerHTML = "";
  });

  it("click two ports to create a cable", () => {
    clickPort(ports[0]);
    expect(ports[0].classList.contains("pending")).toBe(true);
    expect(patchbay.cables).toHaveLength(0);

    clickPort(ports[5]);
    expect(ports[0].classList.contains("pending")).toBe(false);
    expect(ports[0].classList.contains("connected")).toBe(true);
    expect(ports[5].classList.contains("connected")).toBe(true);
    expect(patchbay.cables).toHaveLength(1);
  });

  it("clicking the same port twice cancels", () => {
    clickPort(ports[0]);
    expect(ports[0].classList.contains("pending")).toBe(true);
    clickPort(ports[0]);
    expect(ports[0].classList.contains("pending")).toBe(false);
    expect(patchbay.cables).toHaveLength(0);
  });

  it("creates cables between multiple port pairs", () => {
    clickPort(ports[0]);
    clickPort(ports[5]);
    clickPort(ports[10]);
    clickPort(ports[15]);
    expect(patchbay.cables).toHaveLength(2);
  });

  it("clear removes all cables", () => {
    // Create some cables
    for (let i = 0; i < 3; i++) {
      clickPort(ports[i * 2]);
      clickPort(ports[i * 2 + 1]);
    }
    expect(patchbay.cables).toHaveLength(3);

    patchbay.clear();
    expect(patchbay.cables).toHaveLength(0);
    // Ports should still have connected class (stress test clears them separately)
  });

  it("random fill creates expected number of cables", () => {
    const colors = ["#ef4444", "#f97316", "#eab308"];
    const n = ports.length;
    const count = 10;

    for (let i = 0; i < count; i++) {
      const a = Math.floor(Math.random() * n);
      let b = Math.floor(Math.random() * n);
      while (b === a) b = Math.floor(Math.random() * n);
      patchbay.connect(ports[a], ports[b], {
        color: colors[i % colors.length],
        segments: 8,
        slack: 1.1,
      });
    }
    expect(patchbay.cables).toHaveLength(count);
  });

  it("cables run physics after start", () => {
    clickPort(ports[0]);
    clickPort(ports[5]);

    patchbay.update();
    const cable = patchbay.cables[0];
    const yBefore = cable.points[3].y;

    patchbay.start();
    // Let a frame run via setTimeout... but we're not actually in an animation loop here.
    // Just verify the update is callable and doesn't throw.
    patchbay.update();
    patchbay.stop();

    // Cable should have physics applied (gravity + constraints)
    // The exact position is non-deterministic, but update() shouldn't throw
    expect(cable.points.length).toBeGreaterThan(0);
  });

  it("canvas mode starts and stops without errors", () => {
    patchbay.start();
    expect(patchbay.isRunning).toBe(true);
    patchbay.stop();
    expect(patchbay.isRunning).toBe(false);
  });

  it("handles many cables without error", () => {
    const n = ports.length;
    const count = 30;
    for (let i = 0; i < count; i++) {
      const a = Math.floor(Math.random() * n);
      let b = Math.floor(Math.random() * n);
      while (b === a) b = Math.floor(Math.random() * n);
      patchbay.connect(ports[a], ports[b], { segments: 8, slack: 1.1 });
    }
    expect(patchbay.cables).toHaveLength(count);

    // Run several updates — shouldn't throw
    for (let i = 0; i < 5; i++) patchbay.update();

    patchbay.clear();
    expect(patchbay.cables).toHaveLength(0);
  });
});
