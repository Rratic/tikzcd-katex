import type { ArrowGeometry, CellBox } from "../geometry/arrow";
import type { LabelStyle } from "../model/arrow";
import type { DiagramMetrics } from "../layout/metrics";
import { setStyle } from "./dom";

const SVG = "http://www.w3.org/2000/svg";

/** 标签 DOM 及其解析后的样式 */
interface MountedLabel {
  element: HTMLElement;
  style: LabelStyle;
}

interface LabelMaskViewport {
  id: string;
  width: number;
  height: number;
}

function unit_px(value: number): string {
  return Number(value.toFixed(6)) + "px";
}

/**
 * 按 TikZ 的侧边或角点锚定标签，并保持旋转后的文字正立
 *
 * @param label 已构建公式的标签元素
 * @param geometry 箭头的裁剪后几何
 * @param labelStyle 标签的位置和朝向设置
 * @param padding 标签内容与锚点之间的留白
 */
function positionLabel(label: HTMLElement, geometry: ArrowGeometry, labelStyle: LabelStyle, padding: number): CellBox {
  const pos = labelStyle.pos;
  const tangent = geometry.curve.tangent(pos);
  const norm = tangent.norm();
  const side = labelStyle.alignment === "center" ? 0 : labelStyle.alignment === "swap" ? -1 : 1;

  // 获取标签渲染结果的大小
  const style = label.ownerDocument.defaultView!.getComputedStyle(label);
  const width = parseFloat(style.width), height = parseFloat(style.height);
  const distance = (labelStyle.sloped ? height : Math.abs(norm.x) * width + Math.abs(norm.y) * height) / 2 + padding;

  // 计算标签中心位置
  const position = geometry.curve.point(pos).add(norm.mul(side * distance));

  const x = position.x - width / 2;
  const y = position.y - height / 2;

  setStyle(label, "left", unit_px(x));
  setStyle(label, "top", unit_px(y));
  if (labelStyle.sloped) {
    const rotation = tangent.proper_angle();
    setStyle(label, "transform", "rotate(" + rotation + "rad)");
  }
  setStyle(label, "visibility", "visible");
  return { x, y, width, height };
}

/**
 * 定位一个箭头的所有标签，并生成它们共用的箭线遮罩
 *
 * @param document 标签和 SVG 所属文档
 * @param labels 已构建的标签及其样式
 * @param geometry 箭头的裁剪后几何
 * @param metrics 与几何使用相同单位的图表度量
 * @param viewport 遮罩的标识及覆盖范围
 */
export function renderLabels(document: Document, labels: readonly MountedLabel[], geometry: ArrowGeometry, metrics: DiagramMetrics, viewport: LabelMaskViewport): SVGMaskElement | undefined {
  const padding = 0.5 * metrics.xHeight;
  const margin = metrics.xHeight * 2;
  const masked: { box: CellBox; angle: number }[] = [];
  for (const { element, style } of labels) {
    const box = positionLabel(element, geometry, style, padding + metrics.lineWidth / 2);
    if (style.mask) masked.push({ box, angle: style.sloped ? geometry.curve.tangent(style.pos).proper_angle() : 0 });
  }
  if (!masked.length) return;

  // 只裁剪此箭头，避免依赖页面背景色或遮住交叉的其他箭头
  const mask = document.createElementNS(SVG, "mask");
  mask.id = viewport.id;
  mask.setAttribute("stroke", "none");
  mask.setAttribute("maskUnits", "userSpaceOnUse");

  // 控制点的包围盒覆盖整条曲线，避免向图式外弯曲的箭线被遮罩截断
  const points = geometry.curve.segment(0, 1);
  const x = Math.min(0, ...points.map(point => point.x)) - margin;
  const y = Math.min(0, ...points.map(point => point.y)) - margin;
  const width = Math.max(viewport.width, ...points.map(point => point.x)) - x + margin;
  const height = Math.max(viewport.height, ...points.map(point => point.y)) - y + margin;
  for (const [name, value] of Object.entries({ x, y, width, height })) mask.setAttribute(name, String(value));
  const background = document.createElementNS(SVG, "rect");
  for (const [name, value] of Object.entries({ x, y, width, height })) background.setAttribute(name, String(value));
  background.style.fill = "white";
  mask.appendChild(background);
  // 同一箭头的所有遮挡区域共享一个 mask，避免后一个标签覆盖前一个
  for (const { box, angle } of masked) {
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", String(box.x - padding));
    rect.setAttribute("y", String(box.y - padding));
    rect.setAttribute("width", String(box.width + 2 * padding));
    rect.setAttribute("height", String(box.height + 2 * padding));
    if (angle) {
      rect.setAttribute("transform", "rotate(" + angle * 180 / Math.PI + " " + (box.x + box.width / 2) + " " + (box.y + box.height / 2) + ")");
    }
    rect.style.fill = "black";
    mask.appendChild(rect);
  }
  return mask;
}
