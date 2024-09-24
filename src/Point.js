class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
  }

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
