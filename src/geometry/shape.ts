// 移植自 [quiver](https://github.com/varkor/quiver)

import { Point, polar } from "./point";

/** 圆角矩形 */
export class RoundedRectangle {
  readonly centre: Point;
  readonly size: Point;
  readonly r: number;

  constructor(centre: Point, size: Point, radius: number) {
    this.centre = centre;
    this.size = size;
    this.r = radius;
  }

  empty(): boolean {
    return this.size.x == 0 && this.size.y == 0;
  }

  /**
   * 用外切多边形近似圆角矩形
   *
   * @param maxSegmentLength 采样的线段长度上限（参数对退化的矩形无效）
   * @returns 顺时针顺序的边界点（SVG 坐标系）
   */
  points(maxSegmentLength = 5): Point[] {
    const points: Point[] = [];
    const half = this.size.mul(0.5);

    // 退化为矩形
    if (this.r == 0) {
      return [
        new Point(half.x, half.y), new Point(-half.x, half.y),
        new Point(-half.x, -half.y), new Point(half.x, -half.y),
      ].map(p => this.centre.add(p));
    }

    // 计算等分数，保证四个角对称
    const n = Math.PI / Math.atan(maxSegmentLength / (2 * this.r));
    const sides = Math.max(4, Math.ceil(n / 4) * 4);

    // 增大为外切半径
    const radius = this.r / Math.cos(Math.PI / sides);
    const corner = (sx: number, sy: number, angle: number) => {
      const centre = this.centre.add(new Point((half.x - this.r) * sx, (half.y - this.r) * sy));
      points.push(centre.add(polar(this.r, angle)));
      for (let i = 0; i < sides / 4; i++) {
        points.push(centre.add(polar(radius, (i + 0.5) / sides * 2 * Math.PI + angle)));
      }
      points.push(centre.add(polar(this.r, angle + Math.PI / 2)));
    };
    corner(1, 1, 0);
    corner(-1, 1, Math.PI * 0.5);
    corner(-1, -1, Math.PI);
    corner(1, -1, Math.PI * 1.5);
    return points;
  }
}
