// 移植自 [quiver](https://github.com/varkor/quiver)

import { CubicBezier, EPSILON, Line } from "./curve";
import type { Curve, CurvePoint } from "./curve";
import { Point, polar } from "./point";
import { RoundedRectangle } from "./shape";
import type { DiagramMetrics } from "../layout/metrics";
import type { ArrowBendStyle } from "../model/arrow";

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
  curve: Curve;
  length: number;
}

/**
 * 沿起终点连线的法向量整体平移箭头，端点重合时使用起点切线
 *
 * @param geometry 已完成节点边界裁剪的箭头几何
 * @param distance 与几何使用相同单位的距离，正数向行进方向左侧平移
 * @returns 包含平移后端点和曲线的几何，弧长保持不变
 */
export function shiftArrow(geometry: ArrowGeometry, distance: number): ArrowGeometry {
  if (distance === 0) return geometry;
  const chord = geometry.tip.sub(geometry.start);
  const direction = chord.length() > EPSILON ? chord : geometry.curve.tangent(0);
  const offset = direction.norm().mul(distance);
  const points = geometry.curve.segment(0, 1).map(point => point.add(offset));
  const curve = points.length === 2
    ? new Line(points[0]!, points[1]!)
    : new CubicBezier(points[0]!, points[1]!, points[2]!, points[3]!);
  return { start: points[0]!, tip: points[points.length - 1]!, curve, length: geometry.length };
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
 * 按出入射角裁剪节点边界并构建三次曲线
 *
 * @param line 连接两个节点数学轴锚点的直线
 * @param source 起点包含留白的边界
 * @param target 终点包含留白的边界
 * @param bends TikZ 坐标系中逆时针为正的出入射角，以及是否相对起终点连线
 * @param looseness 控制点距离相对于默认值的倍数
 * @param minDistance 控制点与其端点之间的最小距离，与节点坐标使用相同单位
 */
function layoutBend(line: Line, source: RoundedRectangle, target: RoundedRectangle, bends: ArrowBendStyle, looseness = 1, minDistance = 0): ArrowGeometry {
  // SVG 的纵轴向下，角度符号与 TikZ 相反
  const out = -(bends.out % 360) * Math.PI / 180, incoming = -(bends.in % 360) * Math.PI / 180;
  const boundary = (anchor: Point, shape: RoundedRectangle, direction: number) => {
    const distance = shape.size.length() + anchor.sub(shape.centre).length() + 1;
    return findEndpoint(new Line(anchor, anchor.add(polar(distance, direction))), shape, true).point;
  };
  const reference = bends.is_relative ? line.angle : 0;
  const start = boundary(line.point(0), source, reference + out);
  const tip = boundary(line.point(1), target, reference + incoming);
  const vector = tip.sub(start), distance = vector.length();
  if (distance <= EPSILON && minDistance === 0) throw new RangeError("tikzcd arrow endpoints are too close");
  // TikZ 默认 looseness=1，控制距离为边界锚点间距离的 0.3915 倍
  const control = Math.max(looseness * 0.3915 * distance, minDistance);
  const direction = bends.is_relative ? vector.angle() : 0;
  const curve = new CubicBezier(
    start, start.add(polar(control, direction + out)),
    tip.add(polar(control, direction + incoming)), tip,
  );
  return { start, tip, curve, length: curve.arc_length(1) };
}

/**
 * 计算箭头端点和路径；弯曲箭头采用 TikZ 的出入射角和默认控制距离
 *
 * @param from 起点内容框
 * @param to 终点内容框
 * @param metrics 与内容框使用相同单位的图式度量
 * @param bends 曲线的出入射角与相对模式；不设置时使用直线
 * @param loop 是否忽略终点并返回起点，以 TikZ 的默认松弛度和最小距离构建自环
 */
export function layoutArrow(from: CellNode, to: CellNode, metrics: DiagramMetrics, bends?: ArrowBendStyle, loop = false): ArrowGeometry {
  // 连接数学轴上的锚点
  const source = extendMargin(from, metrics), target = extendMargin(to, metrics);
  const origin = new Point(source.centre.x, from.baseline - metrics.axis);
  if (loop) {
    // 自环没有不同的起终点连线，角度直接使用画布坐标系；5mm 换算为 TeX pt
    const angles = { ...(bends ?? { in: 135, out: 45 }), is_relative: false };
    return layoutBend(new Line(origin, origin), source, source, angles, 8, 5 * 72.27 / 25.4 * metrics.pt);
  }
  const end = new Point(target.centre.x, to.baseline - metrics.axis);
  const line = new Line(origin, end);
  if (line.width <= EPSILON) throw new RangeError("tikzcd arrow endpoints are too close");

  // 没有弯曲时直接使用直线
  if (bends && !(bends.is_relative && bends.out % 360 === 0 && (bends.in - 180) % 360 === 0)) {
    return layoutBend(line, source, target, bends);
  }

  // 起始点
  const first = findEndpoint(line, source, true), last = findEndpoint(line, target, false);
  if (last.t <= first.t) {
    throw new RangeError("tikzcd arrow endpoints are too close");
  }

  // 裁剪后的端点
  const start = first.point, tip = last.point;
  const curve = new Line(start, tip);

  return {
    start, tip, curve, length: curve.width,
  };
}
