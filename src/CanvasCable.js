import Point from "./Point.js";

/**
 * @typedef {Object} CableConfig
 * @property {HTMLElement|Point|{x:number,y:number}} start
 * @property {HTMLElement|Point|{x:number,y:number}} end
 * @property {string} [color='#000000']
 * @property {number} [dragHandleSize=25]
 * @property {number} [gravity=1]
 * @property {number} [iterations=5]
 * @property {number} [lineThickness=2]
 * @property {number} [segments=20]
 * @property {number} [slack=1.1]
 * @property {number} [snapRadius=100]
 * @property {string} [snapTargetSelector='.cable-connector']
 * @property {boolean} [draggable=true]
 * @property {boolean} [static=false]
 */

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
  if (!_globalListenersSetup || ACTIVE_CABLES.size > 0) return;
  _globalListenersSetup = false;
  document.removeEventListener("mousemove", onGlobalMouseMove);
  document.removeEventListener("mouseup", onGlobalMouseUp);
}

function onGlobalMouseMove(e) {
  for (const cable of ACTIVE_CABLES) {
    if (cable.isDragging) cable._onDrag(e);
  }
}

function onGlobalMouseUp(e) {
  for (const cable of ACTIVE_CABLES) {
    if (cable.isDragging) cable._onStopDrag(e);
  }
}

/**
 * Cable that renders line segments to a shared Canvas2D context instead of
 * creating DOM elements. Physics is unchanged.
 */
class CanvasCable {
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
   * @param {CableConfig} [config]
   */
  constructor(config = {}) {
    this.config = { ...this.config, ...config };
    this.start = this.config.start;
    this.end = this.config.end;
    this.isDragging = false;
    this.draggedEnd = null;
    this._prevStartX = NaN;
    this._prevStartY = NaN;
    this._prevEndX = NaN;
    this._prevEndY = NaN;
    this._settleFrames = 60;
    /** @type {CanvasRenderingContext2D|null} */
    this._ctx = null;
    /** @type {HTMLCanvasElement|null} */
    this._canvas = null;

    this.points = this.initializePoints();

    if (this.config.draggable) {
      this.setupDragHandles();
      setupGlobalListeners();
      ACTIVE_CABLES.add(this);
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  _attachCanvas(ctx, zIndex) {
    this._ctx = ctx;
    this._canvas = ctx.canvas;
    if (this._handlesContainer) {
      this._handlesContainer.style.zIndex = String(zIndex);
      this._canvas.parentNode.appendChild(this._handlesContainer);
    }
  }

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

  getElementCenter(element) {
    if (element === null) return null;
    const ex = element.x;
    const ey = element.y;
    if (typeof element.getBoundingClientRect !== "function" && ex !== undefined && ey !== undefined)
      return { x: ex, y: ey };

    const el = /** @type {Element} */ (element);
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

  setupDragHandles() {
    this.startHandle = this.createDragHandle();
    this.endHandle = this.createDragHandle();
    this._handlesContainer = document.createElement("div");
    this._handlesContainer.style.cssText = `position:${this.config.static ? "absolute" : "fixed"};top:0;left:0;pointer-events:none;`;
    this._handlesContainer.appendChild(this.startHandle);
    this._handlesContainer.appendChild(this.endHandle);
    document.body.appendChild(this._handlesContainer);

    this.startHandle.addEventListener("mousedown", (e) => this._onDragStart(e, "start"));
    this.endHandle.addEventListener("mousedown", (e) => this._onDragStart(e, "end"));
  }

  createDragHandle() {
    const handle = document.createElement("div");
    handle.classList.add("cable-drag-handle");
    const s = `${this.config.dragHandleSize}px`;
    handle.style.cssText = `width:${s};height:${s};position:absolute;border-radius:50%;background:transparent;pointer-events:all;cursor:move;z-index:9999;`;
    return handle;
  }

  _onDragStart(event, end) {
    this.isDragging = true;
    this._settleFrames = 30;
    this.draggedEnd = end;
    if (end === "start") this.start = null;
    else this.end = null;
  }

  startDragging(event, end) {
    this._onDragStart(event, end);
  }

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

  drag(event) {
    this._onDrag(event);
  }

  _onStopDrag() {
    if (!this.isDragging) return;
    const idx = this.draggedEnd === "start" ? 0 : this.points.length - 1;
    const draggedPoint = this.points[idx];
    const snapTarget = this.findSnapTarget(draggedPoint.x, draggedPoint.y);

    if (snapTarget) {
      if (this.draggedEnd === "start") this.start = snapTarget;
      else this.end = snapTarget;
      const center = this.getElementCenter(snapTarget);
      draggedPoint.x = center.x;
      draggedPoint.y = center.y;
    }
    this.isDragging = false;
    this.draggedEnd = null;
    this._settleFrames = 30;
    this.update();
  }

  stopDragging() {
    this._onStopDrag();
  }

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

  update(frame = Symbol()) {
    this._frame = frame;

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

    if (this._settleFrames <= 0 && !this.isDragging) return;

    for (let i = 1; i < this.points.length - 1; i++) {
      this.points[i].y += this.config.gravity;
    }
    const segLen = this.calculateSegmentLength();
    for (let j = 0; j < this.config.iterations; j++) {
      this.solveConstraints(segLen);
    }
    this._settleFrames--;
  }

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

  calculateSegmentLength() {
    const s = this.points[0];
    const e = this.points[this.points.length - 1];
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    return (Math.sqrt(dx * dx + dy * dy) * this.config.slack) / (this.points.length - 1);
  }

  /**
   * Draw this cable's segments onto the canvas context.
   * Called by Patchbay after physics update.
   */
  draw() {
    const ctx = this._ctx;
    if (!ctx) return;
    ctx.strokeStyle = this.config.color;
    ctx.lineWidth = this.config.lineThickness;
    ctx.beginPath();
    const pts = this.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    if (this.config.draggable) {
      const half = this.config.dragHandleSize / 2;
      const p0 = pts[0];
      const pN = pts[pts.length - 1];
      this.startHandle.style.left = `${p0.x - half}px`;
      this.startHandle.style.top = `${p0.y - half}px`;
      this.endHandle.style.left = `${pN.x - half}px`;
      this.endHandle.style.top = `${pN.y - half}px`;
    }
  }

  destroy() {
    if (this.config.draggable) {
      ACTIVE_CABLES.delete(this);
      teardownGlobalListeners();
      if (this._handlesContainer) {
        this._handlesContainer.remove();
      }
    }
  }
}

export default CanvasCable;
