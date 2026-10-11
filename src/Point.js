/**
 * A 2D point with Verlet integration for physics simulation.
 */
class Point {
  /**
   * @param {number} x - Initial x position.
   * @param {number} y - Initial y position.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
  }

  /**
   * Advance the point one step using Verlet integration.
   * @param {number} gravity - Gravity acceleration to apply on the y axis.
   */
  update(gravity) {
    const vx = this.x - this.oldX;
    const vy = this.y - this.oldY + gravity;

    this.oldX = this.x;
    this.oldY = this.y;

    this.x += vx;
    this.y += vy;
  }
}

export default Point;
