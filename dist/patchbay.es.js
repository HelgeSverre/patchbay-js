var f = Object.defineProperty;
var u = (l, t, e) => (t in l ? f(l, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : (l[t] = e));
var g = (l, t, e) => (u(l, typeof t != "symbol" ? t + "" : t, e), e);
class d {
  constructor(t, e) {
    (this.x = t), (this.y = e), (this.oldX = t), (this.oldY = e);
  }
  update(t) {
    const e = this.x - this.oldX,
      s = this.y - this.oldY + t;
    (this.oldX = this.x), (this.oldY = this.y), (this.x += e), (this.y += s);
  }
}
class p {
  /**
   * @param {CableConfig} [config] - The configuration object to override default settings.
   */
  constructor(t = {}) {
    g(this, "config", {
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
    });
    (this.config = { ...this.config, ...t }),
      (this.start = this.config.start),
      (this.end = this.config.end),
      (this.isDragging = !1),
      (this.draggedEnd = null),
      (this.element = this.createMainElement()),
      (this.points = this.initializePoints()),
      (this.segmentElements = this.createSegmentElements()),
      this.config.draggable && (this.setupDragHandles(), this.setupDragEvents());
  }
  createMainElement() {
    const t = document.createElement("div");
    return (
      t.classList.add("cable-container"),
      (t.style.position = "fixed"),
      (t.style.top = "0"),
      (t.style.left = "0"),
      (t.style.pointerEvents = "none"),
      t
    );
  }
  initializePoints() {
    const t = this.getElementCenter(this.start),
      e = this.getElementCenter(this.end),
      s = [new d(t.x, t.y)],
      n = e.x - t.x,
      i = e.y - t.y,
      o = (Math.sqrt(n * n + i * i) * this.config.slack) / (this.config.segments - 1);
    for (let r = 1; r < this.config.segments - 1; r++) {
      const h = r / (this.config.segments - 1);
      s.push(new d(t.x + n * h + (Math.random() - 0.5) * o, t.y + i * h + (Math.random() - 0.5) * o));
    }
    return s.push(new d(e.x, e.y)), s;
  }
  /**
   * Get the center of an element or point.
   *
   * @param {HTMLElement|Point|{x: number, y: number}} element
   * @returns {{x, y}|null|{x: number, y: number}}
   */
  getElementCenter(t) {
    if (t instanceof d || (t.hasOwnProperty("x") && t.hasOwnProperty("y")))
      return {
        x: t.x,
        y: t.y,
      };
    if (t instanceof HTMLElement) {
      const { height: e, left: s, top: n, width: i } = t.getBoundingClientRect();
      return {
        x: s + i / 2,
        y: n + e / 2,
      };
    }
    return null;
  }
  setupDragHandles() {
    (this.startHandle = this.createDragHandle()),
      (this.endHandle = this.createDragHandle()),
      this.element.appendChild(this.startHandle),
      this.element.appendChild(this.endHandle);
  }
  setupDragEvents() {
    this.startHandle.addEventListener("mousedown", (t) => this.startDragging(t, "start")),
      this.endHandle.addEventListener("mousedown", (t) => this.startDragging(t, "end")),
      document.addEventListener("mousemove", (t) => this.drag(t)),
      document.addEventListener("mouseup", (t) => this.stopDragging(t));
  }
  createDragHandle() {
    const t = document.createElement("div");
    return (
      t.classList.add("cable-drag-handle"),
      (t.style.width = `${this.config.dragHandleSize}px`),
      (t.style.height = `${this.config.dragHandleSize}px`),
      (t.style.position = "absolute"),
      (t.style.borderRadius = "50%"),
      (t.style.backgroundColor = "transparent"),
      (t.style.pointerEvents = "all"),
      (t.style.cursor = "move"),
      (t.style.zIndex = "9999"),
      t
    );
  }
  startDragging(t, e) {
    (this.isDragging = !0), (this.draggedEnd = e), e === "start" ? (this.start = null) : (this.end = null);
  }
  drag(t) {
    if (!this.isDragging) return;
    const { clientX: e, clientY: s } = t;
    this.draggedEnd === "start"
      ? ((this.points[0].x = e), (this.points[0].y = s))
      : ((this.points[this.points.length - 1].x = e), (this.points[this.points.length - 1].y = s)),
      this.update();
  }
  stopDragging() {
    if (!this.isDragging) return;
    const t = this.draggedEnd === "start" ? this.points[0] : this.points[this.points.length - 1],
      e = this.findSnapTarget(t.x, t.y);
    if (e) {
      this.draggedEnd === "start" ? (this.start = e) : (this.end = e);
      const s = this.getElementCenter(e);
      (t.x = s.x), (t.y = s.y);
    }
    (this.isDragging = !1), (this.draggedEnd = null), this.update();
  }
  findSnapTarget(t, e) {
    const s = document.querySelectorAll(this.config.snapTargetSelector);
    let n = null,
      i = 1 / 0;
    for (let a of s) {
      const o = a.getBoundingClientRect(),
        r = o.left + o.width / 2,
        h = o.top + o.height / 2,
        c = Math.sqrt((t - r) ** 2 + (e - h) ** 2);
      c < i && ((i = c), (n = a));
    }
    return i <= this.config.snapRadius ? n : null;
  }
  createSegmentElements() {
    return this.points.slice(0, -1).map((t, e) => {
      const s = document.createElement("div");
      return (
        s.classList.add("cable-segment"),
        (s.style.position = "absolute"),
        (s.style.background = this.config.color),
        (s.style.height = this.config.lineThickness + "px"),
        (s.style.transformOrigin = "0 50%"),
        this.element.appendChild(s),
        s
      );
    });
  }
  update() {
    if (this.start) {
      const t = this.getElementCenter(this.start);
      (this.points[0].x = t.x), (this.points[0].y = t.y);
    }
    if (this.end) {
      const t = this.getElementCenter(this.end);
      (this.points[this.points.length - 1].x = t.x), (this.points[this.points.length - 1].y = t.y);
    }
    for (let t = 1; t < this.points.length - 1; t++) this.points[t].y += this.config.gravity;
    for (let t = 0; t < this.config.iterations; t++) this.solveConstraints();
    this.render();
  }
  solveConstraints() {
    const t = this.calculateSegmentLength();
    for (let e = 0; e < this.points.length - 1; e++) {
      const s = this.points[e],
        n = this.points[e + 1],
        i = n.x - s.x,
        a = n.y - s.y,
        o = Math.sqrt(i * i + a * a),
        r = (t - o) / o,
        h = i * 0.5 * r,
        c = a * 0.5 * r;
      e > 0 && ((s.x -= h), (s.y -= c)), e < this.points.length - 2 && ((n.x += h), (n.y += c));
    }
  }
  calculateSegmentLength() {
    return this.calculateTotalLength() / (this.config.segments - 1);
  }
  calculateTotalLength() {
    const t = this.points[0],
      e = this.points[this.points.length - 1],
      s = e.x - t.x,
      n = e.y - t.y;
    return Math.sqrt(s * s + n * n) * this.config.slack;
  }
  render() {
    this.segmentElements.forEach((t, e) => {
      const s = this.points[e],
        n = this.points[e + 1],
        i = n.x - s.x,
        a = n.y - s.y,
        o = Math.sqrt(i * i + a * a),
        r = Math.atan2(a, i);
      (t.style.width = `${o}px`),
        (t.style.left = `${s.x}px`),
        (t.style.top = `${s.y}px`),
        (t.style.transform = `rotate(${r}rad)`);
    }),
      this.config.draggable &&
        (this.updateDragHandlePosition(this.startHandle, this.points[0]),
        this.updateDragHandlePosition(this.endHandle, this.points[this.points.length - 1]));
  }
  updateDragHandlePosition(t, e) {
    (t.style.left = `${e.x - this.config.dragHandleSize / 2}px`),
      (t.style.top = `${e.y - this.config.dragHandleSize / 2}px`);
  }
}
class m {
  /**
   * @param {Partial<PatchbayConfig>} [config] - The configuration object to override default settings.
   */
  constructor(t = {}) {
    /**
     * @type {PatchbayConfig}
     */
    g(this, "config", {
      container: document.body,
      gravity: 1,
      iterations: 5,
      color: "#000000",
      slack: 1.1,
      segments: 20,
      snapRadius: 100,
      dragHandleSize: 20,
      lineThickness: 2,
      snapElementSelector: ".cable-connector",
      zIndex: 9999,
    });
    if (((this.config = { ...this.config, ...t }), (this.cables = []), !this.config.container))
      throw new Error("No container element provided for patchbay");
    (this.root = this.createRootElement()), this.config.container.appendChild(this.root);
  }
  createRootElement() {
    const t = document.createElement("div");
    return (
      t.classList.add("patchbay-container"),
      (t.style.position = "fixed"),
      (t.style.top = "0"),
      (t.style.bottom = "0"),
      (t.style.left = "0"),
      (t.style.right = "0"),
      (t.style.width = "100%"),
      (t.style.height = "100%"),
      (t.style.zIndex = this.config.zIndex || 9999),
      (t.style.pointerEvents = "none"),
      t
    );
  }
  /**
   * Create a new cable and add it to the patchbay.
   *
   * @param {HTMLElement} startElement - The start element to attach the cable to.
   * @param {HTMLElement} endElement - The end element to attach the cable to.
   * @param {Partial<CableConfig>} [cableConfig] - Override default cable settings for this cable.
   * @returns {Cable}
   */
  connect(t, e, s = {}) {
    const n = { ...this.config, ...s };
    delete n.container;
    const i = new p({
      start: t,
      end: e,
      ...n,
    });
    return this.cables.push(i), this.root.appendChild(i.element), i;
  }
  /**
   *
   * @param {Point|{x: number, y: number}} startPoint
   * @param {Point|{x: number, y: number}} endPoint
   * @param cableConfig
   */
  connectPoints(t, e, s = {}) {
    const n = { ...this.config, ...s };
    delete n.container;
    const i = new p({
      start: t,
      end: e,
      ...n,
    });
    return this.cables.push(i), this.root.appendChild(i.element), i;
  }
  startCable(t, e = {}) {
    const s = { ...this.config, ...e };
    delete s.container;
    const n = new p({
      start: t,
      end: t,
      ...s,
    });
    return n.startDragging("end"), n.update(), this.cables.push(n), this.root.appendChild(n.element), n;
  }
  /**
   * Remove a cable from the patchbay.
   * @param {Cable} cable - The Cable instance to remove.
   */
  removeCable(t) {
    const e = this.cables.indexOf(t);
    e > -1 && (this.root.removeChild(t.element), this.cables.splice(e, 1));
  }
  /**
   * Update the physics simulation for all cables.
   */
  update() {
    for (let t of this.cables) t.update();
  }
  /**
   * Start the animation loop.
   */
  start() {
    (this.isRunning = !0), this.loop();
  }
  /**
   * Animation loop for physics simulation.
   */
  loop() {
    this.update(), requestAnimationFrame(() => this.loop());
  }
  /**
   * Stop the animation loop.
   */
  stop() {
    (this.isRunning = !1), cancelAnimationFrame(this.loop);
  }
}
export { p as Cable, m as Patchbay, d as Point };
//# sourceMappingURL=patchbay.es.js.map
