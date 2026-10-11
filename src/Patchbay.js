import Cable from "./Cable.js";
import CanvasCable from "./CanvasCable.js";

/**
 * @typedef {Object} PatchbayConfig
 * @property {HTMLElement} [container=document.body] - The container element for the patchbay.
 * @property {number} [gravity=1] - Gravity applied to cables each frame. Higher = more sag.
 * @property {number} [iterations=5] - Constraint-solving passes per frame. More = stiffer cables.
 * @property {string} [color='#000000'] - Default cable color.
 * @property {number} [slack=1.1] - Multiplier for cable resting length. Values > 1 let the cable droop.
 * @property {number} [segments=20] - Number of segments per cable. More = smoother curves, more DOM.
 * @property {number} [snapRadius=100] - Radius in pixels for auto-snapping cable ends to targets.
 * @property {number} [dragHandleSize=20] - Diameter of drag handles in pixels.
 * @property {boolean} [draggable=true] - Whether cables accept mouse drag.
 * @property {string} [snapTargetSelector='.cable-connector'] - CSS selector for snap-target elements.
 * @property {number} [lineThickness=2] - Cable line thickness in pixels.
 * @property {number} [zIndex=9999] - CSS z-index of the patchbay container.
 * @property {boolean} [static=false] - When true, cables use page coordinates and ignore scroll.
 * @property {boolean} [canvas=false] - Render cables via Canvas2D instead of DOM elements.
 */

class Patchbay {
  /** @type {PatchbayConfig} */
  config = {
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
    draggable: true,
    zIndex: 9999,
    static: false,
    canvas: false,
  };

  /**
   * Create a new patchbay.
   * @param {Partial<PatchbayConfig>} [config] - Overrides for any default setting.
   */
  constructor(config = {}) {
    this.config = { ...this.config, ...config };
    /** @type {(Cable|CanvasCable)[]} */
    this.cables = [];
    this._rafId = null;
    this._frame = 0;
    /** @type {CanvasRenderingContext2D|null} */
    this._ctx = null;

    if (!this.config.container) {
      throw new Error("No container element provided for patchbay");
    }

    this.root = this.config.canvas ? this.createCanvasRoot() : this.createRootElement();
    this.config.container.appendChild(this.root);
  }

  /**
   * DOM root (default).
   * @returns {HTMLDivElement}
   * @private
   */
  createRootElement() {
    const root = document.createElement("div");
    root.classList.add("patchbay-container");
    Object.assign(root.style, {
      position: this.config.static ? "absolute" : "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: String(this.config.zIndex),
      pointerEvents: "none",
    });
    if (this.config.static) {
      root.style.minHeight = "100vh";
    } else {
      root.style.inset = "0";
    }
    return root;
  }

  /**
   * Canvas root.
   * @returns {HTMLCanvasElement}
   * @private
   */
  createCanvasRoot() {
    const canvas = document.createElement("canvas");
    canvas.classList.add("patchbay-canvas");
    canvas.style.cssText = `position:fixed;top:0;left:0;pointer-events:none;z-index:${this.config.zIndex};`;

    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    size();

    const ctx = canvas.getContext("2d");
    this._ctx = ctx;

    window.addEventListener("resize", size);
    this._onResize = size;

    return canvas;
  }

  /**
   * Internal helper — create cable with correct backend.
   * @param {Object} cableSettings
   * @returns {Cable|CanvasCable}
   * @private
   */
  _createCable(cableSettings) {
    const settings = { ...this.config, ...cableSettings };
    delete settings.container;
    delete settings.zIndex;

    const cable = this.config.canvas ? new CanvasCable(settings) : new Cable(settings);

    if (this.config.canvas && this._ctx) {
      /** @type {CanvasCable} */ (cable)._attachCanvas(this._ctx, this.config.zIndex);
    }

    this.cables.push(cable);
    if (!this.config.canvas) {
      this.root.appendChild(/** @type {Cable} */ (cable).element);
    }
    return cable;
  }

  /**
   * Connect two DOM elements with a cable.
   * @param {HTMLElement} startElement
   * @param {HTMLElement} endElement
   * @param {Partial<CableConfig>} [cableConfig]
   * @returns {Cable|CanvasCable}
   */
  connect(startElement, endElement, cableConfig = {}) {
    return this._createCable({ start: startElement, end: endElement, ...cableConfig });
  }

  /**
   * Connect two arbitrary points with a cable.
   * @param {HTMLElement|{x: number, y: number}} startPoint
   * @param {{x: number, y: number}} endPoint
   * @param {Partial<CableConfig>} [cableConfig]
   * @returns {Cable|CanvasCable}
   */
  connectPoints(startPoint, endPoint, cableConfig = {}) {
    return this._createCable({ start: startPoint, end: endPoint, ...cableConfig });
  }

  /**
   * Start a cable from a point and immediately begin dragging the free end.
   * @param {HTMLElement|{x: number, y: number}} startPoint
   * @param {Partial<CableConfig>} [cableConfig]
   * @returns {Cable|CanvasCable}
   */
  startCable(startPoint, cableConfig = {}) {
    const cable = this._createCable({ start: startPoint, end: startPoint, ...cableConfig });
    cable.startDragging(null, "end");
    cable.update();
    this._renderCanvas();
    return cable;
  }

  /**
   * Remove a single cable from the patchbay.
   * @param {Cable|CanvasCable} cable
   */
  removeCable(cable) {
    const index = this.cables.indexOf(cable);
    if (index > -1) {
      cable.destroy();
      if (!this.config.canvas) {
        this.root.removeChild(/** @type {Cable} */ (cable).element);
      }
      this.cables.splice(index, 1);
      this._renderCanvas();
    }
  }

  /**
   * Remove every cable.
   */
  clear() {
    for (let i = this.cables.length - 1; i >= 0; i--) {
      this.cables[i].destroy();
      if (!this.config.canvas) {
        this.root.removeChild(/** @type {Cable} */ (this.cables[i]).element);
      }
    }
    this.cables.length = 0;

    if (this._ctx) {
      const ctx = this._ctx;
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);
      ctx.restore();
    }
  }

  /**
   * Advance the physics simulation for all cables by one step.
   */
  update() {
    this._frame++;
    const frame = Symbol();
    const cables = this.cables;
    for (let i = 0, len = cables.length; i < len; i++) {
      cables[i].update(frame);
    }

    this._renderCanvas();
  }

  /** @private */
  _renderCanvas() {
    if (this._ctx) {
      const ctx = this._ctx;
      const dpr = window.devicePixelRatio || 1;
      const cables = this.cables;

      // Clear entire canvas in pixel space, then translate to page space
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);
      ctx.restore();

      ctx.save();
      const scrollX = this.config.static ? window.scrollX : 0;
      const scrollY = this.config.static ? window.scrollY : 0;
      ctx.setTransform(dpr, 0, 0, dpr, -scrollX * dpr, -scrollY * dpr);
      for (let i = 0, len = cables.length; i < len; i++) {
        /** @type {CanvasCable} */ (cables[i]).draw();
      }
      ctx.restore();
    }
  }

  /**
   * Start the `requestAnimationFrame` loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._tick();
  }

  /** @private */
  _tick() {
    if (!this.isRunning) return;
    this.update();
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  /**
   * Stop the animation loop.
   */
  stop() {
    this.isRunning = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Clean up the patchbay entirely.
   */
  destroy() {
    this.stop();
    this.clear();
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
    }
    if (this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }
}

export default Patchbay;
