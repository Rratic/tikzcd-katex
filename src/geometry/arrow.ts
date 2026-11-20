// 移植自 [quiver](https://github.com/varkor/quiver)

import { Line } from "./curve";
import type { CurvePoint } from "./curve";
import { Point } from "./point";
import { RoundedRectangle } from "./shape";
import type { DiagramMetrics } from "../layout/metrics";

/** 布局中的内容框 */
export interface CellBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 包含基线位置的单元格内容框 */
export interface CellNode extends CellBox {
  baseline: number;
}

/** 裁剪后的箭头几何信息，不包含端点样式或 SVG 路径 */
export interface ArrowGeometry {
  start: Point;
  tip: Point;
  angle: number;
  length: number;
}

/**
 * 从边界交点中选择箭头的端点
 *
 * @param curve 连接两个节点数学轴锚点的直线
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
 * 在内容框外加入横纵内边距和半个笔画的边界留白
 *
 * @param box 目标内容框
 * @param metrics 与内容框使用相同单位的图式度量
 */
function extendMargin(box: CellBox, metrics: DiagramMetrics) {
  const x = metrics.innerXSep + metrics.lineWidth / 2;
  const y = metrics.innerYSep + metrics.lineWidth / 2;
  return new RoundedRectangle(
    new Point(box.x + box.width / 2, box.y + box.height / 2),
    new Point(box.width + x * 2, box.height + y * 2),
    0,
  );
}

/**
 * 计算直线箭头的端点
 *
 * @param from 起点内容框
 * @param to 终点内容框
 * @param metrics 与内容框使用相同单位的图式度量
 */
export function layoutArrow(from: CellNode, to: CellNode, metrics: DiagramMetrics): ArrowGeometry {
  // 连接数学轴上的锚点
  const source = extendMargin(from, metrics), target = extendMargin(to, metrics);
  const curve = new Line(
    new Point(source.centre.x, from.baseline - metrics.axis),
    new Point(target.centre.x, to.baseline - metrics.axis),
  );

  // 起始点
  const first = findEndpoint(curve, source, true), last = findEndpoint(curve, target, false);
  const startLength = curve.arc_length(first.t);
  const endLength = curve.arc_length(last.t);
  if (endLength <= startLength) {
    throw new RangeError("tikzcd arrow endpoints are too close");
  }

  // 裁剪后的端点
  const start = curve.point(curve.t_after_length(startLength));
  const tip = curve.point(curve.t_after_length(endLength));

  return {
    start, tip, angle: curve.angle, length: tip.sub(start).length(),
  };
}
