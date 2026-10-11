import Point from "./Point.js";

/**
 * @typedef {Object} CableConfig
 * @property {HTMLElement|Point|{x:number,y:number}} start - Element or point to anchor the cable start.
 * @property {HTMLElement|Point|{x:number,y:number}} end - Element or point to anchor the cable end.
 * @property {string} [color='#000000'] - Cable color.
 * @property {number} [dragHandleSize=25] - Diameter of drag handles in pixels.
 * @property {number} [gravity=1] - Gravity applied each frame.
 * @property {number} [iterations=5] - Constraint-solving passes per frame.
 * @property {number} [lineThickness=2] - Cable line thickness.
 * @property {number} [segments=20] - Number of segments in the cable.
 * @property {number} [slack=1.1] - Multiplier for resting length.
 * @property {number} [snapRadius=100] - Snap-to-target radius in pixels.
 * @property {string} [snapTargetSelector='.cable-connector'] - CSS selector for snap targets.
 * @property {boolean} [draggable=true] - Whether cable ends are draggable.
 * @property {boolean} [static=false] - Use page coordinates instead of viewport coordinates.
 */

// --- Shared drag event listeners ---

/** @type {Set<Cable>} */
const ACTIVE_CABLES = new Set();
let _globalListenersSetup = false;

/** @type {WeakMap<Element, {rect: DOMRect, frame: number|symbol|undefined}>} */
const _rectCache = new WeakMap();

function setupGlobalListeners() {
  if (_globalListenersSetup) return;
  _globalListenersSetup = true;
  document.addEventListener("mousemove", onGlobalMouseMove);
  document.addEventListener("mouseup", onGlobalMouseUp);
}

function teardownGlobalListeners() {
  if (!_globalListenersSetup) return;
  if (ACTIVE_CABLES.size > 0) return;
  _globalListenersSetup = false;
  document.removeEventListener("mousemove", onGlobalMouseMove);
  document.removeEventListener("mouseup", onGlobalMouseUp);
}

/**
 * @param {MouseEvent} e
 */
function onGlobalMouseMove(e) {
  for (const cable of ACTIVE_CABLES) {
    if (cable.isDragging) cable._onDrag(e);
  }
}

/**
 * @param {MouseEvent} e
 */
function onGlobalMouseUp(e) {
  for (const cable of ACTIVE_CABLES) {
    if (cable.isDragging) cable._onStopDrag(e);
  }
}

// --- Cable class ---

class Cable {
  /** @type {CableConfig} */
  config = {
    color: "#000000",
    dragHandleSize: 25,
    gravity: 1,
    iterations: 5,
    lineThickness: 2,
    segments: 20,
    slack: 1.1,
    snapRadius: 100,
    snapTargetSelector: ".cable-connector",
    draggable: true,
    static: false,
  };

  /**
   * Create a cable with anchors and physics.
   * @param {CableConfig} [config]
   */
  constructor(config = {}) {
    this.config = { ...this.config, ...config };
    /** @type {HTMLElement|Point|{x:number,y:number}|null} */
    this.start = this.config.start;
    /** @type {HTMLElement|Point|{x:number,y:number}|null} */
    this.end = this.config.end;

    /** @type {boolean} */
    this.isDragging = false;
    /** @type {'start'|'end'|null} */
    this.draggedEnd = null;
    /** @private */
    this._prevStartX = NaN;
    /** @private */
    this._prevStartY = NaN;
    /** @private */
    this._prevEndX = NaN;
    /** @private */
    this._prevEndY = NaN;
    /** @private */
    this._settleFrames = 60;

    /** @type {HTMLDivElement} */
    this.element = this.createMainElement();
    /** @type {Point[]} */
    this.points = this.initializePoints();
    /** @type {HTMLDivElement[]} */
    this.segmentElements = this.createSegmentElements();

    if (this.config.draggable) {
      this.setupDragHandles();
      setupGlobalListeners();
      ACTIVE_CABLES.add(this);
    }
  }

  /**
   * Create the positioning wrapper div for this cable.
   * @returns {HTMLDivElement}
   * @private
   */
  createMainElement() {
    const element = document.createElement("div");
    element.classList.add("cable-container");
    element.style.position = this.config.static ? "absolute" : "fixed";
    element.style.top = "0";
    element.style.left = "0";
    element.style.pointerEvents = "none";
    return element;
  }

  /**
   * Build the array of Point objects representing the cable.
   * @returns {Point[]}
   * @private
   */
  initializePoints() {
    const startPos = this.getElementCenter(this.start);
    const endPos = this.getElementCenter(this.end);
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxSegLen = this.config.maxSegmentLength || 30;
    const segs = Math.max(this.config.segments, Math.ceil(distance / maxSegLen));
    const totalLength = distance * this.config.slack;
    const segmentLength = totalLength / (segs - 1);

    const points = [new Point(startPos.x, startPos.y)];
    for (let i = 1; i < segs - 1; i++) {
      const t = i / (segs - 1);
      points.push(
        new Point(
          startPos.x + dx * t + (Math.random() - 0.5) * segmentLength,
          startPos.y + dy * t + (Math.random() - 0.5) * segmentLength,
        ),
      );
    }
    points.push(new Point(endPos.x, endPos.y));
    return points;
  }

  /**
   * Get the center x/y of an element or point object.
   * Uses a frame-level cache so repeated calls for the same element in the
   * same frame only trigger `getBoundingClientRect` once.
   *
   * @param {HTMLElement|Point|{x:number,y:number}|null} element
   * @returns {{x: number, y: number}|null}
   */
  getElementCenter(element) {
    if (element === null) return null;

    // Fast path: plain {x,y} point (no DOM lookup needed)
    const ex = element.x;
    const ey = element.y;
    if (typeof element.getBoundingClientRect !== "function" && ex !== undefined && ey !== undefined) {
      return { x: ex, y: ey };
    }

    // DOM element — use frame-level cache to avoid redundant layout reflow
    /** @type {Element} */ const el = /** @type {Element} */ (element);
    let entry = _rectCache.get(el);
    if (!entry || this._frame === undefined || entry.frame !== this._frame) {
      entry = { rect: el.getBoundingClientRect(), frame: this._frame };
      _rectCache.set(el, entry);
    }
    const { rect } = entry;
    const scrollX = this.config.static ? window.scrollX : 0;
    const scrollY = this.config.static ? window.scrollY : 0;
    return { x: rect.left + rect.width / 2 + scrollX, y: rect.top + rect.height / 2 + scrollY };
  }

  /**
   * Create and attach the start + end drag handles.
   * @private
   */
  setupDragHandles() {
    this.startHandle = this.createDragHandle();
    this.endHandle = this.createDragHandle();
    this.element.appendChild(this.startHandle);
    this.element.appendChild(this.endHandle);

    this.startHandle.addEventListener("mousedown", (e) => this._onDragStart(e, "start"));
    this.endHandle.addEventListener("mousedown", (e) => this._onDragStart(e, "end"));
  }

  /**
   * Create a single circular drag handle div.
   * @returns {HTMLDivElement}
   * @private
   */
  createDragHandle() {
    const handle = document.createElement("div");
    handle.classList.add("cable-drag-handle");
    handle.style.width = `${this.config.dragHandleSize}px`;
    handle.style.height = `${this.config.dragHandleSize}px`;
    handle.style.position = "absolute";
    handle.style.borderRadius = "50%";
    handle.style.backgroundColor = "transparent";
    handle.style.pointerEvents = "all";
    handle.style.cursor = "move";
    handle.style.zIndex = "9999";
    return handle;
  }

  /**
   * Begin dragging one end of the cable.
   * @param {MouseEvent|null} event
   * @param {'start'|'end'} end - Which end to drag.
   * @private
   */
  _onDragStart(event, end) {
    this.isDragging = true;
    this._settleFrames = 30;
    this.draggedEnd = end;
    if (end === "start") {
      this.start = null;
    } else {
      this.end = null;
    }
  }

  /** @deprecated Use _onDragStart directly. */
  startDragging(event, end) {
    this._onDragStart(event, end);
  }

  /**
   * Handle mousemove while dragging.
   * @param {MouseEvent} event
   * @private
   */
  _onDrag(event) {
    if (!this.isDragging) return;
    const clientX = event.clientX + (this.config.static ? window.scrollX : 0);
    const clientY = event.clientY + (this.config.static ? window.scrollY : 0);
    if (this.draggedEnd === "start") {
      this.points[0].x = clientX;
      this.points[0].y = clientY;
    } else {
      const last = this.points[this.points.length - 1];
      last.x = clientX;
      last.y = clientY;
    }
    this.update();
  }

  /** @deprecated Use _onDrag directly. */
  drag(event) {
    this._onDrag(event);
  }

  /**
   * Handle mouseup — try to snap the dragged end to a target.
   * @private
   */
  _onStopDrag() {
    if (!this.isDragging) return;

    const idx = this.draggedEnd === "start" ? 0 : this.points.length - 1;
    const draggedPoint = this.points[idx];
    const snapTarget = this.findSnapTarget(draggedPoint.x, draggedPoint.y);

    if (snapTarget) {
      if (this.draggedEnd === "start") {
        this.start = snapTarget;
      } else {
        this.end = snapTarget;
      }
      const center = this.getElementCenter(snapTarget);
      draggedPoint.x = center.x;
      draggedPoint.y = center.y;
    }

    this.isDragging = false;
    this.draggedEnd = null;
    this._settleFrames = 30;
    this.update();
  }

  /** @deprecated Use _onStopDrag directly. */
  stopDragging() {
    this._onStopDrag();
  }

  /**
   * Find the nearest snap-target element within `snapRadius` pixels.
   * Uses squared distance to avoid sqrt in the inner loop.
   *
   * @param {number} x - Viewport x coordinate.
   * @param {number} y - Viewport y coordinate.
   * @returns {Element|null}
   */
  findSnapTarget(x, y) {
    const targets = document.querySelectorAll(this.config.snapTargetSelector);
    let closest = null;
    let closestDistSq = this.config.snapRadius ** 2;

    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 + (this.config.static ? window.scrollX : 0);
      const cy = rect.top + rect.height / 2 + (this.config.static ? window.scrollY : 0);
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closest = el;
      }
    }
    return closest;
  }

  /**
   * Create DOM elements for each cable segment.
   * @returns {HTMLDivElement[]}
   * @private
   */
  createSegmentElements() {
    const count = this.points.length - 1;
    /** @type {HTMLDivElement[]} */
    const segments = new Array(count);
    for (let i = 0; i < count; i++) {
      const seg = document.createElement("div");
      seg.classList.add("cable-segment");
      seg.style.position = "absolute";
      seg.style.background = this.config.color;
      seg.style.height = `${this.config.lineThickness}px`;
      seg.style.transformOrigin = "0 50%";
      seg.style.left = "0";
      seg.style.top = "0";
      seg.style.contain = "layout style paint";
      this.element.appendChild(seg);
      segments[i] = seg;
    }
    return segments;
  }

  /**
   * Advance the cable simulation by one frame.
   * Skips physics for dormant cables whose endpoints haven't moved.
   * @param {number|symbol} [frame] - Token shared only within one patchbay update.
   */
  update(frame = Symbol()) {
    this._frame = frame;

    // Anchor start
    if (this.start) {
      const c = this.getElementCenter(this.start);
      if (c) {
        if (c.x !== this._prevStartX || c.y !== this._prevStartY) {
          this._prevStartX = c.x;
          this._prevStartY = c.y;
          this._settleFrames = 30;
        }
        this.points[0].x = c.x;
        this.points[0].y = c.y;
      }
    }
    // Anchor end
    if (this.end) {
      const c = this.getElementCenter(this.end);
      if (c) {
        if (c.x !== this._prevEndX || c.y !== this._prevEndY) {
          this._prevEndX = c.x;
          this._prevEndY = c.y;
          this._settleFrames = 30;
        }
        const last = this.points[this.points.length - 1];
        last.x = c.x;
        last.y = c.y;
      }
    }

    // Skip physics for dormant cables that have settled
    if (this._settleFrames <= 0 && !this.isDragging) {
      this.render();
      return;
    }

    // Gravity on interior points
    for (let i = 1; i < this.points.length - 1; i++) {
      this.points[i].y += this.config.gravity;
    }

    // Constraint solving
    const segLen = this.calculateSegmentLength();
    for (let j = 0; j < this.config.iterations; j++) {
      this.solveConstraints(segLen);
    }

    this._settleFrames--;
    this.render();
  }

  /**
   * Run one pass of distance-constraint relaxation.
   * @param {number} segmentLength - Target distance between consecutive points.
   * @private
   */
  solveConstraints(segmentLength) {
    const len = this.points.length - 1;
    for (let i = 0; i < len; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const diff = (segmentLength - dist) / dist;
      const ox = dx * 0.5 * diff;
      const oy = dy * 0.5 * diff;

      if (i > 0) {
        p1.x -= ox;
        p1.y -= oy;
      }
      if (i < len - 1) {
        p2.x += ox;
        p2.y += oy;
      }
    }
  }

  /**
   * Compute the target length of each segment based on the straight-line
   * distance between endpoints and the slack factor.
   * @returns {number}
   * @private
   */
  calculateSegmentLength() {
    const s = this.points[0];
    const e = this.points[this.points.length - 1];
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    return (Math.sqrt(dx * dx + dy * dy) * this.config.slack) / (this.points.length - 1);
  }

  /**
   * Update segment DOM positions to match physics points.
   * @private
   */
  render() {
    const segs = this.segmentElements;
    for (let i = 0; i < segs.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      const seg = segs[i];
      seg.style.width = `${Math.sqrt(dx * dx + dy * dy)}px`;
      seg.style.transform = `translate(${p1.x}px, ${p1.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
    }

    if (this.config.draggable) {
      this.updateDragHandlePosition(this.startHandle, this.points[0]);
      this.updateDragHandlePosition(this.endHandle, this.points[this.points.length - 1]);
    }
  }

  /**
   * Position a drag handle centred on a point.
   * @param {HTMLDivElement} handle
   * @param {Point} point
   * @private
   */
  updateDragHandlePosition(handle, point) {
    const half = this.config.dragHandleSize / 2;
    handle.style.left = `${point.x - half}px`;
    handle.style.top = `${point.y - half}px`;
  }

  /**
   * Remove this cable from the global listener set and clean up.
   */
  destroy() {
    if (this.config.draggable) {
      ACTIVE_CABLES.delete(this);
      teardownGlobalListeners();
    }
  }
}

export default Cable;
