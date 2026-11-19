// 移植自 [quiver](https://github.com/varkor/quiver)

export function clamp(min: number, x: number, max: number): number {
  return Math.max(min, Math.min(x, max));
}

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  sub(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y);
  }

  mul(multiplier: number): Point {
    return new Point(this.x * multiplier, this.y * multiplier);
  }

  inv_scale(w: number, h: number): Point {
    return new Point(this.x / w, this.y / h);
  }

  length(): number {
    return Math.hypot(this.y, this.x);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** 限制在 [-90°, 90°] 的角度，用于使标签不会上下颠倒 */
  proper_angle(): number {
    const angle = this.angle();
    if (angle > Math.PI / 2) {
      return angle - Math.PI;
    }
    else if (angle < -Math.PI / 2) {
      return angle + Math.PI;
    }
    return angle;
  }

  /** 单位法向量，对应 SVG 坐标系中逆时针 90° 方向 */
  norm(): Point {
    const len = this.length();
    return new Point(this.y / len, -this.x / len);
  }

  /** 逆时针旋转 `theta`；在 SVG 坐标系中为顺时针 */
  rotate(theta: number): Point {
    return new Point(
      this.x * Math.cos(theta) - this.y * Math.sin(theta),
      this.y * Math.cos(theta) + this.x * Math.sin(theta),
    );
  }

  /** 在两个点之间线性插值 */
  lerp(other: Point, t: number): Point {
    return this.add(other.sub(this).mul(t));
  }
}

export function polar(length: number, angle: number): Point {
  return new Point(Math.cos(angle) * length, Math.sin(angle) * length);
}
