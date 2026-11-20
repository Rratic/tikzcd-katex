import type { ArrowGeometry } from "../geometry/arrow";
import { Point, polar } from "../geometry/point";
import type { ArrowEndStyle, ArrowStyle } from "../model/arrow";
import type { DiagramMetrics } from "../layout/metrics";
import { Path } from "./path";

const SVG = "http://www.w3.org/2000/svg";

/**
 * 生成一个端点的路径，并计算其占用的轴向长度
 *
 * @param style 端点样式
 * @param endpoint 裁剪后的端点
 * @param angle 从箭身指向端点外侧的角度（弧度）
 * @param metrics 与端点使用相同单位的图表度量
 * @param hookSide 钩相对于端点局部坐标的朝向
 */
function endPath(style: ArrowEndStyle, endpoint: Point, angle: number, metrics: DiagramMetrics, hookSide: number) {
  const w = metrics.lineWidth;
  const innerLength = 5.2 * w, halfSpan = 6 * w;
  const path = new Path();
  let shorten = 0, length = 0;

  /** 以笔画中心的顶点绘制 Computer Modern 箭尖轮廓 */
  const chevron = (vertex: Point, direction: number) => {
    const at = (x: number, y: number) => vertex.add(new Point(x, y).rotate(direction));
    path.move_to(at(-innerLength, halfSpan))
      .curve_to(at(-0.81731 * innerLength, 0.4 * halfSpan), at(-0.41019 * innerLength, 0.11666666 * halfSpan), vertex)
      .curve_to(at(-0.41019 * innerLength, -0.11666666 * halfSpan), at(-0.81731 * innerLength, -0.4 * halfSpan), at(-innerLength, -halfSpan));
  };

  switch (style) {
    case "none": break;
    case "normal":
    case "twohead": {
      const spacing = 3.6 * w;
      const count = style === "twohead" ? 2 : 1;
      for (let index = 0; index < count; index++) {
        chevron(endpoint.sub(polar(w / 2 + index * spacing, angle)), angle);
      }
      shorten = w;
      length = 6.2 * w + (count - 1) * spacing;
      break;
    }
    case "tail": {
      chevron(endpoint.sub(polar(innerLength + w / 2, angle)), angle + Math.PI);
      shorten = innerLength;
      length = 6.2 * w;
      break;
    }
    case "bar": {
      const centre = endpoint.sub(polar(w / 2, angle));
      path.move_to(centre.add(new Point(0, -4.1 * w).rotate(angle)))
        .line_by(new Point(0, 8.2 * w).rotate(angle));
      shorten = 0.75 * w;
      length = w;
      break;
    }
    case "hook": {
      const rx = 3.1 * w, ry = 2.45 * w;
      const join = endpoint.sub(polar(3.6 * w, angle));
      path.move_to(join.add(new Point(0, hookSide * 2 * ry).rotate(angle))).arc_by(
        new Point(rx, ry), angle * 180 / Math.PI,
        false, hookSide < 0, new Point(0, -hookSide * 2 * ry).rotate(angle),
      );
      shorten = 3.6 * w;
      length = 4.1 * w;
      break;
    }
  }
  return { path: path.toString(), shorten, length };
}

/**
 * 根据几何信息和样式创建箭身及两端点
 *
 * @param document SVG 所属文档
 * @param geometry 已裁剪到节点边界的箭头几何
 * @param style 箭身和端点样式
 * @param metrics 与几何使用相同单位的图表度量
 */
export function drawArrow(document: Document, geometry: ArrowGeometry, style: ArrowStyle, metrics: DiagramMetrics): SVGGElement {
  const { start, tip, angle, length } = geometry;
  const tail = endPath(style.tail, start, angle + Math.PI, metrics, 1);
  const head = endPath(style.head, tip, angle, metrics, -1);
  if (length < tail.length + head.length) {
    throw new RangeError("tikzcd arrow endpoints are too close");
  }

  const bodyStart = start.add(polar(tail.shorten, angle));
  const bodyEnd = tip.sub(polar(head.shorten, angle));
  const body = new Path();
  const normal = tip.sub(start).norm();
  for (const offset of style.body === "double" ? [-0.225 * metrics.xHeight, 0.225 * metrics.xHeight] : [0]) {
    body.move_to(bodyStart.add(normal.mul(offset))).line_by(bodyEnd.sub(bodyStart));
  }
  const group = document.createElementNS(SVG, "g");
  group.setAttribute("stroke-width", String(metrics.lineWidth));
  for (const [part, data] of [["body", body.toString()], ["tail", tail.path], ["head", head.path]] as const) {
    if (!data) continue;
    const path = document.createElementNS(SVG, "path");
    // KaTeX CSS 默认设置 .katex svg path { stroke: none }
    path.style.cssText = "fill:none;stroke:currentColor;stroke-linecap:" + (part === "body" ? "butt" : "round") + ";stroke-linejoin:round";
    path.setAttribute("d", data);
    if (part === "body" && style.dash === "dashed") {
      path.setAttribute("stroke-dasharray", 7 * metrics.lineWidth + " " + 4 * metrics.lineWidth);
    }
    group.appendChild(path);
  }
  return group;
}
