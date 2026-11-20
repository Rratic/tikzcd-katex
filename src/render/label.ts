import type { ArrowGeometry, CellBox } from "../geometry/arrow";
import type { LabelStyle } from "../model/arrow";
import type { DiagramMetrics } from "../layout/metrics";
import { Point } from "../geometry/point";
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
  const vector = geometry.tip.sub(geometry.start);

  // 切向量
  // 为之后非直线预留
  const tangent = vector;
  const norm = tangent.norm();

  const pos = labelStyle.pos;
  const side = labelStyle.alignment === "center" ? 0 : labelStyle.alignment === "swap" ? -1 : 1;

  // 获取标签渲染结果的大小
  const style = label.ownerDocument.defaultView!.getComputedStyle(label);
  const width = parseFloat(style.width), height = parseFloat(style.height);
  const distance = (labelStyle.sloped ? height : Math.abs(norm.x) * width + Math.abs(norm.y) * height) / 2 + padding;

  // 计算标签中心位置
  const position = geometry.start.add(vector.mul(pos)).add(norm.mul(side * distance));

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
  const masked: { box: CellBox; sloped: boolean }[] = [];
  for (const { element, style } of labels) {
    const box = positionLabel(element, geometry, style, padding + metrics.lineWidth / 2);
    if (style.mask) masked.push({ box, sloped: style.sloped });
  }
  if (!masked.length) return;

  // 只裁剪此箭头，避免依赖页面背景色或遮住交叉的其他箭头
  const mask = document.createElementNS(SVG, "mask");
  mask.id = viewport.id;
  mask.setAttribute("stroke", "none");
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", String(-margin));
  mask.setAttribute("y", String(-margin));
  mask.setAttribute("width", String(viewport.width + 2 * margin));
  mask.setAttribute("height", String(viewport.height + 2 * margin));
  const background = document.createElementNS(SVG, "rect");
  background.setAttribute("x", String(-margin));
  background.setAttribute("y", String(-margin));
  background.setAttribute("width", String(viewport.width + 2 * margin));
  background.setAttribute("height", String(viewport.height + 2 * margin));
  background.style.fill = "white";
  mask.appendChild(background);
  // 同一箭头的所有遮挡区域共享一个 mask，避免后一个标签覆盖前一个
  for (const { box, sloped } of masked) {
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", String(box.x - padding));
    rect.setAttribute("y", String(box.y - padding));
    rect.setAttribute("width", String(box.width + 2 * padding));
    rect.setAttribute("height", String(box.height + 2 * padding));
    if (sloped) {
      const angle = geometry.tip.sub(geometry.start).proper_angle() * 180 / Math.PI;
      rect.setAttribute("transform", "rotate(" + angle + " " + (box.x + box.width / 2) + " " + (box.y + box.height / 2) + ")");
    }
    rect.style.fill = "black";
    mask.appendChild(rect);
  }
  return mask;
}
