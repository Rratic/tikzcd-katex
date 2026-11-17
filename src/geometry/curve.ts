// 移植自 [quiver](https://github.com/varkor/quiver)

import { Point, clamp } from "./point";
import type { RoundedRectangle } from "./shape";

export const EPSILON = 10 ** -6;
const INV_EPSILON = 1 / EPSILON;

/** 边界交点及其在线段上的参数 */
export interface CurvePoint {
  point: Point;
  t: number;
}

/** 直线 */
export class Line {
  private origin: Point;
  private end: Point;
  readonly width: number;
  readonly angle: number;

  constructor(origin: Point, end: Point) {
    this.origin = origin;
    this.end = end;
    const vector = end.sub(origin);
    this.width = vector.length();
    this.angle = vector.angle();
  }

  point(t: number): Point {
    return this.origin.lerp(this.end, t);
  }

  arc_length(t: number): number {
    return this.width * t;
  }

  /**
   * 将弧长转为曲线参数，超出线段时钳制到端点
   *
   * @param length 从起点开始的弧长
   * @returns 0 到 1 之间的曲线参数
   */
  t_after_length(length: number): number {
    return clamp(0, length / this.width, 1);
  }

  /**
   * 与圆角矩形求交
   *
   * @returns 与有限线段的交点
   */
  intersections_with_rounded_rectangle(rect: RoundedRectangle): CurvePoint[] {
    // 使用 16 边外切多边形
    // 归一化到水平线段 (0, 0) -> (1, 0)
    const points = rect.points(rect.r * 0.4)
      .map(p => p.sub(this.origin).rotate(-this.angle).inv_scale(this.width, 1));

    const intersections: CurvePoint[] = [];
    const add = (x: number) => {
      const t = Math.round(x * INV_EPSILON) / INV_EPSILON;
      intersections.push({ point: this.point(t), t });
    };

    for (let i = 0; i < points.length; i++) {
      const a = points[i]!, b = points[(i + 1) % points.length]!;
      // 垂直
      if (Math.abs(a.x - b.x) <= EPSILON) {
        if (a.x >= 0 && a.x <= 1 && Math.min(a.y, b.y) <= 0 && Math.max(a.y, b.y) >= 0) add(a.x);
      } else {
        const m = (b.y - a.y) / (b.x - a.x);
        const c = a.y - m * a.x;
        // 不重合
        if (Math.abs(m) > EPSILON) {
          const x = -c / m;
          if (x >= 0 && x <= 1 && x >= Math.min(a.x, b.x) - EPSILON &&
            x <= Math.max(a.x, b.x) + EPSILON) add(x);
        } else if (Math.abs(a.y) <= EPSILON) {
          // 只保留两端
          const min = Math.min(a.x, b.x), max = Math.max(a.x, b.x);
          if (min <= 1 && max >= 0) {
            add(Math.max(min, 0));
            add(Math.min(max, 1));
          }
        }
      }
    }
    return intersections;
  }
}
