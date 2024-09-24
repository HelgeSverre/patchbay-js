import Cable from "./Cable.js";

/**
 * @typedef {Object} PatchbayConfig
 * @property {HTMLElement} [container=document.body] - The container element for the patchbay.
 * @property {number} [gravity=1] - The gravity force applied to cables.
 * @property {number} [iterations=5] - The number of constraint solving iterations per update.
 * @property {string} [color='#000000'] - The default color of cables.
 * @property {number} [slack=1.1] - The default slack factor of cables.
 * @property {number} [segments=20] - The number of segments in cables.
 * @property {number} [snapRadius=100] - The radius for snapping to connector elements.
 * @property {number} [dragHandleSize=25] - The size of the drag handles.
 *
 */

class Patchbay {
  /**
   * @type {PatchbayConfig}
   */
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
    snapElementSelector: ".cable-connector",
    zIndex: 9999,
  };

  /**
   * @param {Partial<PatchbayConfig>} [config] - The configuration object to override default settings.
   */
  constructor(config = {}) {
    this.config = { ...this.config, ...config };
    this.cables = [];

    if (!this.config.container) {
      throw new Error("No container element provided for patchbay");
    }

    this.root = this.createRootElement();
    this.config.container.appendChild(this.root);
  }

  createRootElement() {
    const root = document.createElement("div");

    root.classList.add("patchbay-container");
    root.style.position = "fixed";
    root.style.top = "0";
    root.style.bottom = "0";
    root.style.left = "0";
    root.style.right = "0";
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.zIndex = this.config.zIndex || 9999;
    root.style.pointerEvents = "none";

    return root;
  }

  /**
   * Create a new cable and add it to the patchbay.
   *
   * @param {HTMLElement} startElement - The start element to attach the cable to.
   * @param {HTMLElement} endElement - The end element to attach the cable to.
   * @param {Partial<CableConfig>} [cableConfig] - Override default cable settings for this cable.
   * @returns {Cable}
   */
  connect(startElement, endElement, cableConfig = {}) {
    const cableSettings = { ...this.config, ...cableConfig };

    // Don't pass container to cable
    delete cableSettings.container;

    const cable = new Cable({
      start: startElement,
      end: endElement,
      ...cableSettings,
    });
    this.cables.push(cable);
    this.root.appendChild(cable.element);
    return cable;
  }

  /**
   *
   * @param {Point|{x: number, y: number}} startPoint
   * @param {Point|{x: number, y: number}} endPoint
   * @param cableConfig
   */
  connectPoints(startPoint, endPoint, cableConfig = {}) {
    const cableSettings = { ...this.config, ...cableConfig };

    // Don't pass container to cable
    delete cableSettings.container;

    const cable = new Cable({
      start: startPoint,
      end: endPoint,
      ...cableSettings,
    });
    this.cables.push(cable);
    this.root.appendChild(cable.element);

    return cable;
  }

  startCable(startPoint, cableConfig = {}) {
    const cableSettings = { ...this.config, ...cableConfig };

    // Don't pass container to cable
    delete cableSettings.container;

    const cable = new Cable({
      start: startPoint,
      end: startPoint,
      ...cableSettings,
    });

    cable.startDragging("end");
    cable.update();

    this.cables.push(cable);
    this.root.appendChild(cable.element);

    return cable;
  }

  /**
   * Remove a cable from the patchbay.
   * @param {Cable} cable - The Cable instance to remove.
   */
  removeCable(cable) {
    const index = this.cables.indexOf(cable);
    if (index > -1) {
      this.root.removeChild(cable.element);
      this.cables.splice(index, 1);
    }
  }

  /**
   * Update the physics simulation for all cables.
   */
  update() {
    for (let cable of this.cables) {
      cable.update();
    }
  }

  /**
   * Start the animation loop.
   */
  start() {
    this.isRunning = true;
    this.loop();
  }

  /**
   * Animation loop for physics simulation.
   */
  loop() {
    this.update();
    requestAnimationFrame(() => this.loop());
  }

  /**
   * Stop the animation loop.
   */
  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.loop);
  }
}

export default Patchbay;
