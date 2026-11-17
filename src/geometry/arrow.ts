// 移植自 [quiver](https://github.com/varkor/quiver)

import { Line } from "./curve";
import type { CurvePoint } from "./curve";
import { Path } from "./path";
import { Point } from "./point";
import { RoundedRectangle } from "./shape";

/** DOM 测量后的内容框 */
export interface CellBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 从边界交点中选择箭头的端点
 *
 * @param curve 连接两个内容框中心的直线
 * @param shape 包含留白的圆角边界
 * @param preferMin 取最小/最大参数
 */
function findEndpoint(curve: Line, shape: RoundedRectangle, preferMin: boolean): CurvePoint {
  // 退化
  if (shape.empty()) {
    const t = preferMin ? 0 : 1;
    return { point: curve.point(t), t };
  }

  const intersections = curve.intersections_with_rounded_rectangle(shape);
  // 直线含在图形内
  if (intersections.length == 0) {
    throw new RangeError("tikzcd arrow endpoints are too close");
  }

  intersections.sort((a, b) => a.t - b.t);

  // 退化矩形与线段重合
  // 起点取离开内容框端，终点取进入内容框端
  if (shape.size.x == 0 || shape.size.y == 0) {
    return intersections[preferMin ? intersections.length - 1 : 0]!;
  }

  return intersections[preferMin ? 0 : intersections.length - 1]!;
}

/**
 * 内容框外扩原有的 0.08em 留白，并以留白为圆角半径
 *
 * @param box 目标内容框
 * @param em 当前环境 1em 对应长度
 */
function extendMargin(box: CellBox, em: number) {
  const padding = em * 0.08;

  // 零大小不加留白
  const empty = box.width == 0 && box.height == 0;
  return new RoundedRectangle(
    new Point(box.x + box.width / 2, box.y + box.height / 2),
    new Point(box.width + (empty ? 0 : padding * 2), box.height + (empty ? 0 : padding * 2)),
    empty ? 0 : padding,
  );
}

/**
 * 生成基础直线箭头
 *
 * @param from 起点内容框
 * @param to 终点内容框
 * @param em 当前环境 1em 对应长度
 */
export function layoutArrow(from: CellBox, to: CellBox, em: number) {
  const padding = em * 0.08, headWidth = em * 0.28, headHeight = em * 0.24;
  const source = extendMargin(from, em), target = extendMargin(to, em);
  const curve = new Line(source.centre, target.centre);

  // 起始点
  const first = findEndpoint(curve, source, true), last = findEndpoint(curve, target, false);
  let startLength = curve.arc_length(first.t);
  let endLength = curve.arc_length(last.t);
  // 单独处理零大小
  if (source.empty()) startLength += padding;
  if (target.empty()) endLength += padding;
  if (endLength - startLength < headWidth + em * 0.1) {
    throw new RangeError("tikzcd arrow endpoints are too close");
  }

  // 裁剪后的端点
  const start = curve.point(curve.t_after_length(startLength));
  const tip = curve.point(curve.t_after_length(endLength));

  // 中间部分直线
  const path = new Path().move_to(start).line_by(tip.sub(start));

  // 在终点向后绘制两段椭圆弧
  const wingA = new Point(-headWidth, -headHeight / 2).rotate(curve.angle);
  const wingB = new Point(-headWidth, headHeight / 2).rotate(curve.angle);
  const radius = new Point(headWidth, headHeight / 2);
  const degrees = curve.angle * 180 / Math.PI;
  path.move_to(tip).arc_by(radius, degrees, false, true, wingA);
  path.move_to(tip).arc_by(radius, degrees, false, false, wingB);
  return {
    start, tip,
    head: [tip.add(wingA), tip, tip.add(wingB)],
    path: path.toString(),
    strokeWidth: em * 0.04,
  };
}
