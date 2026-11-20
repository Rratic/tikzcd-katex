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

/** 直线的两个端点，或三次 Bézier 的端点和两个控制点 */
export type CurveSegment = [Point, Point] | [Point, Point, Point, Point];

/** 箭头布局和绘制共用的曲线接口，坐标与单元格相同 */
export interface Curve {
  /** 在 `t` 参数处的值 */
  point(t: number): Point;

  /** 获取沿曲线行进的切向量，不归一化 */
  tangent(t: number): Point;

  /** 从起点到参数 `t` 的近似弧长 */
  arc_length(t: number): number;

  /**
   * 将累计弧长转为曲线参数，超出时钳制到端点
   *
   * @param length 从起点开始的弧长
   * @returns 0 到 1 之间的曲线参数
   */
  t_after_length(length: number): number;

  /**
   * 提取子曲线
   *
   * @param start 起始曲线参数
   * @param end 结束曲线参数
   * @returns 控制参数
   */
  segment(start: number, end: number): CurveSegment;
}

/** 直线 */
export class Line implements Curve {
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

  tangent(_t: number): Point {
    return this.end.sub(this.origin);
  }

  segment(start: number, end: number): [Point, Point] {
    return [this.point(start), this.point(end)];
  }

  arc_length(t: number): number {
    return this.width * t;
  }

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

/** 三次 Bézier 曲线 */
export class CubicBezier implements Curve {
  private lengths?: number[];
  private start: Point;
  private first: Point;
  private second: Point;
  private end: Point;

  /**
   * @param start 起点
   * @param first 起点侧的控制点
   * @param second 终点侧的控制点
   * @param end 终点
   */
  constructor(start: Point, first: Point, second: Point, end: Point) {
    this.start = start;
    this.first = first;
    this.second = second;
    this.end = end;
  }

  point(t: number): Point {
    const a = this.start.lerp(this.first, t), b = this.first.lerp(this.second, t);
    const c = this.second.lerp(this.end, t);
    return a.lerp(b, t).lerp(b.lerp(c, t), t);
  }

  tangent(t: number): Point {
    return this.first.sub(this.start).mul(3 * (1 - t) ** 2)
      .add(this.second.sub(this.first).mul(6 * (1 - t) * t))
      .add(this.end.sub(this.second).mul(3 * t ** 2));
  }

  segment(start: number, end: number): [Point, Point, Point, Point] {
    const first = this.point(start), last = this.point(end), scale = (end - start) / 3;
    return [first, first.add(this.tangent(start).mul(scale)), last.sub(this.tangent(end).mul(scale)), last];
  }

  private lengthTable(): number[] {
    if (this.lengths) return this.lengths;
    let previous = -Infinity;
    // 倍增采样
    // 直到相邻两次采样的弧长差不超过 0.01
    for (let count = 32; ; count *= 2) {
      const lengths = [0];
      let point = this.start, length = 0;
      for (let index = 1; index <= count; index++) {
        const next = this.point(index / count);
        length += next.sub(point).length();
        lengths.push(length);
        point = next;
      }
      if (length - previous <= 0.01 || count >= 4096) return this.lengths = lengths;
      previous = length;
    }
  }

  /** 获取从起点到参数 `t` 的近似弧长 */
  arc_length(t: number): number {
    const lengths = this.lengthTable(), count = lengths.length - 1;
    const position = clamp(0, t, 1) * count, index = Math.min(Math.floor(position), count - 1);
    return lengths[index]! + (lengths[index + 1]! - lengths[index]!) * (position - index);
  }

  t_after_length(length: number): number {
    const lengths = this.lengthTable();
    const count = lengths.length - 1, total = lengths[count]!;
    if (length <= 0 || !total) return 0;
    if (length >= total) return 1;
    let low = 0, high = count;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (lengths[middle]! < length) low = middle;
      else high = middle;
    }
    return (low + (length - lengths[low]!) / (lengths[high]! - lengths[low]!)) / count;
  }
}
