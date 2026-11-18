// 移植自 [quiver](https://github.com/varkor/quiver)

import type { ArrowGeometry } from "../geometry/arrow";
import { Point, polar } from "../geometry/point";
import type { ArrowEndStyle, ArrowStyle } from "../model/arrow";
import { Path } from "./path";

const SVG = "http://www.w3.org/2000/svg";

/**
 * 生成一个端点的路径，并计算其占用的轴向长度
 *
 * @param style 端点样式
 * @param endpoint 裁剪后的端点
 * @param angle 从箭身指向端点外侧的角度（弧度）
 * @param em 一个 em 的大小
 */
function endPath(style: ArrowEndStyle, endpoint: Point, angle: number, em: number) {
  const width = em * 0.28, height = em * 0.24;
  const path = new Path();
  let shorten = 0, length = 0;

  /** 在指定位置绘制两段椭圆弧组成的箭尖 */
  const chevron = (tip: Point, direction: number) => {
    for (const side of [-1, 1]) {
      path.move_to(tip).arc_by(
        new Point(width, height / 2), direction * 180 / Math.PI,
        false, side < 0, new Point(-width, side * height / 2).rotate(direction),
      );
    }
  };

  switch (style) {
    case "none": break;
    case "normal":
    case "twohead": {
      const spacing = width / 2 + em * 0.08;
      const count = style === "twohead" ? 2 : 1;
      for (let index = 0; index < count; index++) {
        chevron(endpoint.sub(polar(index * spacing, angle)), angle);
      }
      length = width + (count - 1) * spacing;
      break;
    }
    case "tail": {
      chevron(endpoint.sub(polar(width, angle)), angle + Math.PI);
      shorten = length = width;
      break;
    }
    case "bar": {
      path.move_to(endpoint.add(new Point(0, -height / 2).rotate(angle)))
        .line_by(new Point(0, height).rotate(angle));
      break;
    }
    case "hook": {
      const radius = height / 2;
      path.move_to(endpoint.sub(polar(radius, angle))).arc_by(
        new Point(radius, radius), angle * 180 / Math.PI,
        false, true, new Point(0, radius * 2).rotate(angle),
      );
      shorten = length = radius;
      break;
    }
  }
  return { path: path.toString(), shorten, length };
}

/** 根据几何信息和样式创建箭身及两端点 */
export function drawArrow(document: Document, geometry: ArrowGeometry, style: ArrowStyle, em: number): SVGGElement {
  const { start, tip, angle, length } = geometry;
  const tail = endPath(style.tail, start, angle + Math.PI, em);
  const head = endPath(style.head, tip, angle, em);
  if (length < tail.length + head.length + em * 0.1) {
    throw new RangeError("tikzcd arrow endpoints are too close");
  }

  const bodyStart = start.add(polar(tail.shorten, angle));
  const bodyEnd = tip.sub(polar(head.shorten, angle));
  const body = new Path().move_to(bodyStart).line_by(bodyEnd.sub(bodyStart));
  const group = document.createElementNS(SVG, "g");
  group.setAttribute("stroke-width", String(em * 0.04));
  for (const [part, data] of [["body", body.toString()], ["tail", tail.path], ["head", head.path]] as const) {
    if (!data) continue;
    const path = document.createElementNS(SVG, "path");
    // KaTeX CSS 默认设置 .katex svg path { stroke: none }
    path.style.cssText = "fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round";
    path.setAttribute("d", data);
    if (part === "body" && style.dash === "dashed") {
      path.setAttribute("stroke-dasharray", em * 0.3 + " " + em * 0.2);
    }
    group.appendChild(path);
  }
  return group;
}
