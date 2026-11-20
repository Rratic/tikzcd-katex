// 移植自 [quiver](https://github.com/varkor/quiver)

import type { Point } from "../geometry/point";

/** 创建 SVG 路径的辅助类 */
export class Path {
  private commands: string[] = [];

  toString(): string {
    return this.commands.join(" ");
  }

  move_to(p: Point): this {
    this.commands.push(`M ${p.x} ${p.y}`);
    return this;
  }

  line_by(p: Point): this {
    if (p.x === 0) this.commands.push(`v ${p.y}`);
    else if (p.y === 0) this.commands.push(`h ${p.x}`);
    else this.commands.push(`l ${p.x} ${p.y}`);
    return this;
  }

  /** 添加绝对三次 Bezier 曲线 */
  curve_to(first: Point, second: Point, end: Point): this {
    this.commands.push(`C ${first.x} ${first.y} ${second.x} ${second.y} ${end.x} ${end.y}`);
    return this;
  }

  /**
   * 添加相对椭圆弧
   *
   * @param r 椭圆的横、纵半径
   * @param angle 旋转角（角度）
   * @param largeArc 是否选择大弧
   * @param clockwise 是否顺时针绘制（SVG 坐标系）
   * @param next 从当前点到弧段终点的位移
   */
  arc_by(r: Point, angle: number, largeArc: boolean, clockwise: boolean, next: Point): this {
    this.commands.push(`a ${r.x} ${r.y} ${angle} ` +
      `${largeArc ? 1 : 0} ${clockwise ? 1 : 0} ${next.x} ${next.y}`);
    return this;
  }
}
