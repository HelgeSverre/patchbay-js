var D = Object.defineProperty;
var H = (c, t, s) => t in c ? D(c, t, { enumerable: !0, configurable: !0, writable: !0, value: s }) : c[t] = s;
var m = (c, t, s) => H(c, typeof t != "symbol" ? t + "" : t, s);
class f {
  /**
   * @param {number} x - Initial x position.
   * @param {number} y - Initial y position.
   */
  constructor(t, s) {
    this.x = t, this.y = s, this.oldX = t, this.oldY = s;
  }
  /**
   * Advance the point one step using Verlet integration.
   * @param {number} gravity - Gravity acceleration to apply on the y axis.
   */
  update(t) {
    const s = this.x - this.oldX, e = this.y - this.oldY + t;
    this.oldX = this.x, this.oldY = this.y, this.x += s, this.y += e;
  }
}
const u = /* @__PURE__ */ new Set();
let x = !1;
const v = /* @__PURE__ */ new WeakMap();
function L() {
  x || (x = !0, document.addEventListener("mousemove", E), document.addEventListener("mouseup", b));
}
function z() {
  x && (u.size > 0 || (x = !1, document.removeEventListener("mousemove", E), document.removeEventListener("mouseup", b)));
}
function E(c) {
  for (const t of u)
    t.isDragging && t._onDrag(c);
}
function b(c) {
  for (const t of u)
    t.isDragging && t._onStopDrag(c);
}
class X {
  /**
   * Create a cable with anchors and physics.
   * @param {CableConfig} [config]
   */
  constructor(t = {}) {
    /** @type {CableConfig} */
    m(this, "config", {
      color: "#000000",
      dragHandleSize: 25,
      gravity: 1,
      iterations: 5,
      lineThickness: 2,
      segments: 20,
      slack: 1.1,
      snapRadius: 100,
      snapTargetSelector: ".cable-connector",
      draggable: !0,
      static: !1
    });
    this.config = { ...this.config, ...t }, this.start = this.config.start, this.end = this.config.end, this.isDragging = !1, this.draggedEnd = null, this._prevStartX = NaN, this._prevStartY = NaN, this._prevEndX = NaN, this._prevEndY = NaN, this._settleFrames = 60, this.element = this.createMainElement(), this.points = this.initializePoints(), this.segmentElements = this.createSegmentElements(), this.config.draggable && (this.setupDragHandles(), L(), u.add(this));
  }
  /**
   * Create the positioning wrapper div for this cable.
   * @returns {HTMLDivElement}
   * @private
   */
  createMainElement() {
    const t = document.createElement("div");
    return t.classList.add("cable-container"), t.style.position = this.config.static ? "absolute" : "fixed", t.style.top = "0", t.style.left = "0", t.style.pointerEvents = "none", t;
  }
  /**
   * Build the array of Point objects representing the cable.
   * @returns {Point[]}
   * @private
   */
  initializePoints() {
    const t = this.getElementCenter(this.start), s = this.getElementCenter(this.end), e = s.x - t.x, n = s.y - t.y, i = Math.sqrt(e * e + n * n), o = this.config.maxSegmentLength || 30, a = Math.max(this.config.segments, Math.ceil(i / o)), d = i * this.config.slack / (a - 1), l = [new f(t.x, t.y)];
    for (let h = 1; h < a - 1; h++) {
      const g = h / (a - 1);
      l.push(
        new f(
          t.x + e * g + (Math.random() - 0.5) * d,
          t.y + n * g + (Math.random() - 0.5) * d
        )
      );
    }
    return l.push(new f(s.x, s.y)), l;
  }
  /**
   * Get the center x/y of an element or point object.
   * Uses a frame-level cache so repeated calls for the same element in the
   * same frame only trigger `getBoundingClientRect` once.
   *
   * @param {HTMLElement|Point|{x:number,y:number}|null} element
   * @returns {{x: number, y: number}|null}
   */
  getElementCenter(t) {
    if (t === null) return null;
    const s = t.x, e = t.y;
    if (typeof t.getBoundingClientRect != "function" && s !== void 0 && e !== void 0)
      return { x: s, y: e };
    const n = (
      /** @type {Element} */
      t
    );
    let i = v.get(n);
    (!i || this._frame === void 0 || i.frame !== this._frame) && (i = { rect: n.getBoundingClientRect(), frame: this._frame }, v.set(n, i));
    const { rect: o } = i, a = this.config.static ? window.scrollX : 0, r = this.config.static ? window.scrollY : 0;
    return { x: o.left + o.width / 2 + a, y: o.top + o.height / 2 + r };
  }
  /**
   * Create and attach the start + end drag handles.
   * @private
   */
  setupDragHandles() {
    this.startHandle = this.createDragHandle(), this.endHandle = this.createDragHandle(), this.element.appendChild(this.startHandle), this.element.appendChild(this.endHandle), this.startHandle.addEventListener("mousedown", (t) => this._onDragStart(t, "start")), this.endHandle.addEventListener("mousedown", (t) => this._onDragStart(t, "end"));
  }
  /**
   * Create a single circular drag handle div.
   * @returns {HTMLDivElement}
   * @private
   */
  createDragHandle() {
    const t = document.createElement("div");
    return t.classList.add("cable-drag-handle"), t.style.width = `${this.config.dragHandleSize}px`, t.style.height = `${this.config.dragHandleSize}px`, t.style.position = "absolute", t.style.borderRadius = "50%", t.style.backgroundColor = "transparent", t.style.pointerEvents = "all", t.style.cursor = "move", t.style.zIndex = "9999", t;
  }
  /**
   * Begin dragging one end of the cable.
   * @param {MouseEvent|null} event
   * @param {'start'|'end'} end - Which end to drag.
   * @private
   */
  _onDragStart(t, s) {
    this.isDragging = !0, this._settleFrames = 30, this.draggedEnd = s, s === "start" ? this.start = null : this.end = null;
  }
  /** @deprecated Use _onDragStart directly. */
  startDragging(t, s) {
    this._onDragStart(t, s);
  }
  /**
   * Handle mousemove while dragging.
   * @param {MouseEvent} event
   * @private
   */
  _onDrag(t) {
    if (!this.isDragging) return;
    const s = t.clientX + (this.config.static ? window.scrollX : 0), e = t.clientY + (this.config.static ? window.scrollY : 0);
    if (this.draggedEnd === "start")
      this.points[0].x = s, this.points[0].y = e;
    else {
      const n = this.points[this.points.length - 1];
      n.x = s, n.y = e;
    }
    this.update();
  }
  /** @deprecated Use _onDrag directly. */
  drag(t) {
    this._onDrag(t);
  }
  /**
   * Handle mouseup — try to snap the dragged end to a target.
   * @private
   */
  _onStopDrag() {
    if (!this.isDragging) return;
    const t = this.draggedEnd === "start" ? 0 : this.points.length - 1, s = this.points[t], e = this.findSnapTarget(s.x, s.y);
    if (e) {
      this.draggedEnd === "start" ? this.start = e : this.end = e;
      const n = this.getElementCenter(e);
      s.x = n.x, s.y = n.y;
    }
    this.isDragging = !1, this.draggedEnd = null, this._settleFrames = 30, this.update();
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
  findSnapTarget(t, s) {
    const e = document.querySelectorAll(this.config.snapTargetSelector);
    let n = null, i = this.config.snapRadius ** 2;
    for (let o = 0; o < e.length; o++) {
      const a = e[o], r = a.getBoundingClientRect(), d = r.left + r.width / 2 + (this.config.static ? window.scrollX : 0), l = r.top + r.height / 2 + (this.config.static ? window.scrollY : 0), h = t - d, g = s - l, p = h * h + g * g;
      p <= i && (i = p, n = a);
    }
    return n;
  }
  /**
   * Create DOM elements for each cable segment.
   * @returns {HTMLDivElement[]}
   * @private
   */
  createSegmentElements() {
    const t = this.points.length - 1, s = new Array(t);
    for (let e = 0; e < t; e++) {
      const n = document.createElement("div");
      n.classList.add("cable-segment"), n.style.position = "absolute", n.style.background = this.config.color, n.style.height = `${this.config.lineThickness}px`, n.style.transformOrigin = "0 50%", n.style.left = "0", n.style.top = "0", n.style.contain = "layout style paint", this.element.appendChild(n), s[e] = n;
    }
    return s;
  }
  /**
   * Advance the cable simulation by one frame.
   * Skips physics for dormant cables whose endpoints haven't moved.
   * @param {number|symbol} [frame] - Token shared only within one patchbay update.
   */
  update(t = Symbol()) {
    if (this._frame = t, this.start) {
      const e = this.getElementCenter(this.start);
      e && ((e.x !== this._prevStartX || e.y !== this._prevStartY) && (this._prevStartX = e.x, this._prevStartY = e.y, this._settleFrames = 30), this.points[0].x = e.x, this.points[0].y = e.y);
    }
    if (this.end) {
      const e = this.getElementCenter(this.end);
      if (e) {
        (e.x !== this._prevEndX || e.y !== this._prevEndY) && (this._prevEndX = e.x, this._prevEndY = e.y, this._settleFrames = 30);
        const n = this.points[this.points.length - 1];
        n.x = e.x, n.y = e.y;
      }
    }
    if (this._settleFrames <= 0 && !this.isDragging) {
      this.render();
      return;
    }
    for (let e = 1; e < this.points.length - 1; e++)
      this.points[e].y += this.config.gravity;
    const s = this.calculateSegmentLength();
    for (let e = 0; e < this.config.iterations; e++)
      this.solveConstraints(s);
    this._settleFrames--, this.render();
  }
  /**
   * Run one pass of distance-constraint relaxation.
   * @param {number} segmentLength - Target distance between consecutive points.
   * @private
   */
  solveConstraints(t) {
    const s = this.points.length - 1;
    for (let e = 0; e < s; e++) {
      const n = this.points[e], i = this.points[e + 1], o = i.x - n.x, a = i.y - n.y, r = Math.sqrt(o * o + a * a) || 1e-3, d = (t - r) / r, l = o * 0.5 * d, h = a * 0.5 * d;
      e > 0 && (n.x -= l, n.y -= h), e < s - 1 && (i.x += l, i.y += h);
    }
  }
  /**
   * Compute the target length of each segment based on the straight-line
   * distance between endpoints and the slack factor.
   * @returns {number}
   * @private
   */
  calculateSegmentLength() {
    const t = this.points[0], s = this.points[this.points.length - 1], e = s.x - t.x, n = s.y - t.y;
    return Math.sqrt(e * e + n * n) * this.config.slack / (this.points.length - 1);
  }
  /**
   * Update segment DOM positions to match physics points.
   * @private
   */
  render() {
    const t = this.segmentElements;
    for (let s = 0; s < t.length; s++) {
      const e = this.points[s], n = this.points[s + 1], i = n.x - e.x, o = n.y - e.y, a = t[s];
      a.style.width = `${Math.sqrt(i * i + o * o)}px`, a.style.transform = `translate(${e.x}px, ${e.y}px) rotate(${Math.atan2(o, i)}rad)`;
    }
    this.config.draggable && (this.updateDragHandlePosition(this.startHandle, this.points[0]), this.updateDragHandlePosition(this.endHandle, this.points[this.points.length - 1]));
  }
  /**
   * Position a drag handle centred on a point.
   * @param {HTMLDivElement} handle
   * @param {Point} point
   * @private
   */
  updateDragHandlePosition(t, s) {
    const e = this.config.dragHandleSize / 2;
    t.style.left = `${s.x - e}px`, t.style.top = `${s.y - e}px`;
  }
  /**
   * Remove this cable from the global listener set and clean up.
   */
  destroy() {
    this.config.draggable && (u.delete(this), z());
  }
}
const y = /* @__PURE__ */ new Set();
let _ = !1;
const w = /* @__PURE__ */ new WeakMap();
function Y() {
  _ || (_ = !0, document.addEventListener("mousemove", S), document.addEventListener("mouseup", C));
}
function R() {
  !_ || y.size > 0 || (_ = !1, document.removeEventListener("mousemove", S), document.removeEventListener("mouseup", C));
}
function S(c) {
  for (const t of y)
    t.isDragging && t._onDrag(c);
}
function C(c) {
  for (const t of y)
    t.isDragging && t._onStopDrag(c);
}
class M {
  /**
   * @param {CableConfig} [config]
   */
  constructor(t = {}) {
    m(this, "config", {
      color: "#000000",
      dragHandleSize: 25,
      gravity: 1,
      iterations: 5,
      lineThickness: 2,
      segments: 20,
      slack: 1.1,
      snapRadius: 100,
      snapTargetSelector: ".cable-connector",
      draggable: !0,
      static: !1
    });
    this.config = { ...this.config, ...t }, this.start = this.config.start, this.end = this.config.end, this.isDragging = !1, this.draggedEnd = null, this._prevStartX = NaN, this._prevStartY = NaN, this._prevEndX = NaN, this._prevEndY = NaN, this._settleFrames = 60, this._ctx = null, this._canvas = null, this.points = this.initializePoints(), this.config.draggable && (this.setupDragHandles(), Y(), y.add(this));
  }
  /** @param {CanvasRenderingContext2D} ctx */
  _attachCanvas(t, s) {
    this._ctx = t, this._canvas = t.canvas, this._handlesContainer && (this._handlesContainer.style.zIndex = String(s), this._canvas.parentNode.appendChild(this._handlesContainer));
  }
  initializePoints() {
    const t = this.getElementCenter(this.start), s = this.getElementCenter(this.end), e = s.x - t.x, n = s.y - t.y, i = Math.sqrt(e * e + n * n), o = this.config.maxSegmentLength || 30, a = Math.max(this.config.segments, Math.ceil(i / o)), d = i * this.config.slack / (a - 1), l = [new f(t.x, t.y)];
    for (let h = 1; h < a - 1; h++) {
      const g = h / (a - 1);
      l.push(
        new f(
          t.x + e * g + (Math.random() - 0.5) * d,
          t.y + n * g + (Math.random() - 0.5) * d
        )
      );
    }
    return l.push(new f(s.x, s.y)), l;
  }
  getElementCenter(t) {
    if (t === null) return null;
    const s = t.x, e = t.y;
    if (typeof t.getBoundingClientRect != "function" && s !== void 0 && e !== void 0)
      return { x: s, y: e };
    const n = (
      /** @type {Element} */
      t
    );
    let i = w.get(n);
    (!i || this._frame === void 0 || i.frame !== this._frame) && (i = { rect: n.getBoundingClientRect(), frame: this._frame }, w.set(n, i));
    const { rect: o } = i, a = this.config.static ? window.scrollX : 0, r = this.config.static ? window.scrollY : 0;
    return { x: o.left + o.width / 2 + a, y: o.top + o.height / 2 + r };
  }
  setupDragHandles() {
    this.startHandle = this.createDragHandle(), this.endHandle = this.createDragHandle(), this._handlesContainer = document.createElement("div"), this._handlesContainer.style.cssText = `position:${this.config.static ? "absolute" : "fixed"};top:0;left:0;pointer-events:none;`, this._handlesContainer.appendChild(this.startHandle), this._handlesContainer.appendChild(this.endHandle), document.body.appendChild(this._handlesContainer), this.startHandle.addEventListener("mousedown", (t) => this._onDragStart(t, "start")), this.endHandle.addEventListener("mousedown", (t) => this._onDragStart(t, "end"));
  }
  createDragHandle() {
    const t = document.createElement("div");
    t.classList.add("cable-drag-handle");
    const s = `${this.config.dragHandleSize}px`;
    return t.style.cssText = `width:${s};height:${s};position:absolute;border-radius:50%;background:transparent;pointer-events:all;cursor:move;z-index:9999;`, t;
  }
  _onDragStart(t, s) {
    this.isDragging = !0, this._settleFrames = 30, this.draggedEnd = s, s === "start" ? this.start = null : this.end = null;
  }
  startDragging(t, s) {
    this._onDragStart(t, s);
  }
  _onDrag(t) {
    if (!this.isDragging) return;
    const s = t.clientX + (this.config.static ? window.scrollX : 0), e = t.clientY + (this.config.static ? window.scrollY : 0);
    if (this.draggedEnd === "start")
      this.points[0].x = s, this.points[0].y = e;
    else {
      const n = this.points[this.points.length - 1];
      n.x = s, n.y = e;
    }
    this.update();
  }
  drag(t) {
    this._onDrag(t);
  }
  _onStopDrag() {
    if (!this.isDragging) return;
    const t = this.draggedEnd === "start" ? 0 : this.points.length - 1, s = this.points[t], e = this.findSnapTarget(s.x, s.y);
    if (e) {
      this.draggedEnd === "start" ? this.start = e : this.end = e;
      const n = this.getElementCenter(e);
      s.x = n.x, s.y = n.y;
    }
    this.isDragging = !1, this.draggedEnd = null, this._settleFrames = 30, this.update();
  }
  stopDragging() {
    this._onStopDrag();
  }
  findSnapTarget(t, s) {
    const e = document.querySelectorAll(this.config.snapTargetSelector);
    let n = null, i = this.config.snapRadius ** 2;
    for (let o = 0; o < e.length; o++) {
      const a = e[o], r = a.getBoundingClientRect(), d = r.left + r.width / 2 + (this.config.static ? window.scrollX : 0), l = r.top + r.height / 2 + (this.config.static ? window.scrollY : 0), h = t - d, g = s - l, p = h * h + g * g;
      p <= i && (i = p, n = a);
    }
    return n;
  }
  update(t = Symbol()) {
    if (this._frame = t, this.start) {
      const e = this.getElementCenter(this.start);
      e && ((e.x !== this._prevStartX || e.y !== this._prevStartY) && (this._prevStartX = e.x, this._prevStartY = e.y, this._settleFrames = 30), this.points[0].x = e.x, this.points[0].y = e.y);
    }
    if (this.end) {
      const e = this.getElementCenter(this.end);
      if (e) {
        (e.x !== this._prevEndX || e.y !== this._prevEndY) && (this._prevEndX = e.x, this._prevEndY = e.y, this._settleFrames = 30);
        const n = this.points[this.points.length - 1];
        n.x = e.x, n.y = e.y;
      }
    }
    if (this._settleFrames <= 0 && !this.isDragging) return;
    for (let e = 1; e < this.points.length - 1; e++)
      this.points[e].y += this.config.gravity;
    const s = this.calculateSegmentLength();
    for (let e = 0; e < this.config.iterations; e++)
      this.solveConstraints(s);
    this._settleFrames--;
  }
  solveConstraints(t) {
    const s = this.points.length - 1;
    for (let e = 0; e < s; e++) {
      const n = this.points[e], i = this.points[e + 1], o = i.x - n.x, a = i.y - n.y, r = Math.sqrt(o * o + a * a) || 1e-3, d = (t - r) / r, l = o * 0.5 * d, h = a * 0.5 * d;
      e > 0 && (n.x -= l, n.y -= h), e < s - 1 && (i.x += l, i.y += h);
    }
  }
  calculateSegmentLength() {
    const t = this.points[0], s = this.points[this.points.length - 1], e = s.x - t.x, n = s.y - t.y;
    return Math.sqrt(e * e + n * n) * this.config.slack / (this.points.length - 1);
  }
  /**
   * Draw this cable's segments onto the canvas context.
   * Called by Patchbay after physics update.
   */
  draw() {
    const t = this._ctx;
    if (!t) return;
    t.strokeStyle = this.config.color, t.lineWidth = this.config.lineThickness, t.beginPath();
    const s = this.points;
    t.moveTo(s[0].x, s[0].y);
    for (let e = 1; e < s.length; e++)
      t.lineTo(s[e].x, s[e].y);
    if (t.stroke(), this.config.draggable) {
      const e = this.config.dragHandleSize / 2, n = s[0], i = s[s.length - 1];
      this.startHandle.style.left = `${n.x - e}px`, this.startHandle.style.top = `${n.y - e}px`, this.endHandle.style.left = `${i.x - e}px`, this.endHandle.style.top = `${i.y - e}px`;
    }
  }
  destroy() {
    this.config.draggable && (y.delete(this), R(), this._handlesContainer && this._handlesContainer.remove());
  }
}
class $ {
  /**
   * Create a new patchbay.
   * @param {Partial<PatchbayConfig>} [config] - Overrides for any default setting.
   */
  constructor(t = {}) {
    /** @type {PatchbayConfig} */
    m(this, "config", {
      container: document.body,
      gravity: 1,
      iterations: 5,
      color: "#000000",
      slack: 1.1,
      segments: 20,
      snapRadius: 100,
      dragHandleSize: 20,
      lineThickness: 2,
      snapTargetSelector: ".cable-connector",
      draggable: !0,
      zIndex: 9999,
      static: !1,
      canvas: !1
    });
    if (this.config = { ...this.config, ...t }, this.cables = [], this._rafId = null, this._frame = 0, this._ctx = null, !this.config.container)
      throw new Error("No container element provided for patchbay");
    this.root = this.config.canvas ? this.createCanvasRoot() : this.createRootElement(), this.config.container.appendChild(this.root);
  }
  /**
   * DOM root (default).
   * @returns {HTMLDivElement}
   * @private
   */
  createRootElement() {
    const t = document.createElement("div");
    return t.classList.add("patchbay-container"), Object.assign(t.style, {
      position: this.config.static ? "absolute" : "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: String(this.config.zIndex),
      pointerEvents: "none"
    }), this.config.static ? t.style.minHeight = "100vh" : t.style.inset = "0", t;
  }
  /**
   * Canvas root.
   * @returns {HTMLCanvasElement}
   * @private
   */
  createCanvasRoot() {
    const t = document.createElement("canvas");
    t.classList.add("patchbay-canvas"), t.style.cssText = `position:fixed;top:0;left:0;pointer-events:none;z-index:${this.config.zIndex};`;
    const s = () => {
      const n = window.devicePixelRatio || 1;
      t.width = window.innerWidth * n, t.height = window.innerHeight * n, t.style.width = window.innerWidth + "px", t.style.height = window.innerHeight + "px";
    };
    s();
    const e = t.getContext("2d");
    return this._ctx = e, window.addEventListener("resize", s), this._onResize = s, t;
  }
  /**
   * Internal helper — create cable with correct backend.
   * @param {Object} cableSettings
   * @returns {Cable|CanvasCable}
   * @private
   */
  _createCable(t) {
    const s = { ...this.config, ...t };
    delete s.container, delete s.zIndex;
    const e = this.config.canvas ? new M(s) : new X(s);
    return this.config.canvas && this._ctx && e._attachCanvas(this._ctx, this.config.zIndex), this.cables.push(e), this.config.canvas || this.root.appendChild(
      /** @type {Cable} */
      e.element
    ), e;
  }
  /**
   * Connect two DOM elements with a cable.
   * @param {HTMLElement} startElement
   * @param {HTMLElement} endElement
   * @param {Partial<CableConfig>} [cableConfig]
   * @returns {Cable|CanvasCable}
   */
  connect(t, s, e = {}) {
    return this._createCable({ start: t, end: s, ...e });
  }
  /**
   * Connect two arbitrary points with a cable.
   * @param {HTMLElement|{x: number, y: number}} startPoint
   * @param {{x: number, y: number}} endPoint
   * @param {Partial<CableConfig>} [cableConfig]
   * @returns {Cable|CanvasCable}
   */
  connectPoints(t, s, e = {}) {
    return this._createCable({ start: t, end: s, ...e });
  }
  /**
   * Start a cable from a point and immediately begin dragging the free end.
   * @param {HTMLElement|{x: number, y: number}} startPoint
   * @param {Partial<CableConfig>} [cableConfig]
   * @returns {Cable|CanvasCable}
   */
  startCable(t, s = {}) {
    const e = this._createCable({ start: t, end: t, ...s });
    return e.startDragging(null, "end"), e.update(), this._renderCanvas(), e;
  }
  /**
   * Remove a single cable from the patchbay.
   * @param {Cable|CanvasCable} cable
   */
  removeCable(t) {
    const s = this.cables.indexOf(t);
    s > -1 && (t.destroy(), this.config.canvas || this.root.removeChild(
      /** @type {Cable} */
      t.element
    ), this.cables.splice(s, 1), this._renderCanvas());
  }
  /**
   * Remove every cable.
   */
  clear() {
    for (let t = this.cables.length - 1; t >= 0; t--)
      this.cables[t].destroy(), this.config.canvas || this.root.removeChild(
        /** @type {Cable} */
        this.cables[t].element
      );
    if (this.cables.length = 0, this._ctx) {
      const t = this._ctx, s = window.devicePixelRatio || 1;
      t.save(), t.setTransform(1, 0, 0, 1, 0, 0), t.clearRect(0, 0, window.innerWidth * s, window.innerHeight * s), t.restore();
    }
  }
  /**
   * Advance the physics simulation for all cables by one step.
   */
  update() {
    this._frame++;
    const t = Symbol(), s = this.cables;
    for (let e = 0, n = s.length; e < n; e++)
      s[e].update(t);
    this._renderCanvas();
  }
  /** @private */
  _renderCanvas() {
    if (this._ctx) {
      const t = this._ctx, s = window.devicePixelRatio || 1, e = this.cables;
      t.save(), t.setTransform(1, 0, 0, 1, 0, 0), t.clearRect(0, 0, window.innerWidth * s, window.innerHeight * s), t.restore(), t.save();
      const n = this.config.static ? window.scrollX : 0, i = this.config.static ? window.scrollY : 0;
      t.setTransform(s, 0, 0, s, -n * s, -i * s);
      for (let o = 0, a = e.length; o < a; o++)
        e[o].draw();
      t.restore();
    }
  }
  /**
   * Start the `requestAnimationFrame` loop.
   */
  start() {
    this.isRunning || (this.isRunning = !0, this._tick());
  }
  /** @private */
  _tick() {
    this.isRunning && (this.update(), this._rafId = requestAnimationFrame(() => this._tick()));
  }
  /**
   * Stop the animation loop.
   */
  stop() {
    this.isRunning = !1, this._rafId !== null && (cancelAnimationFrame(this._rafId), this._rafId = null);
  }
  /**
   * Clean up the patchbay entirely.
   */
  destroy() {
    this.stop(), this.clear(), this._onResize && window.removeEventListener("resize", this._onResize), this.root.parentNode && this.root.parentNode.removeChild(this.root);
  }
}
export {
  $ as default
};
//# sourceMappingURL=patchbay.es.js.map
