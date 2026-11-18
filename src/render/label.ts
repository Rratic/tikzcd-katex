import type { ArrowGeometry, CellBox } from "../geometry/arrow";
import type { LabelStyle } from "../model/arrow";
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

/** 定位标签 */
function positionLabel(label: HTMLElement, geometry: ArrowGeometry, labelStyle: LabelStyle, em: number): CellBox {
  const { start, tip } = geometry;
  const dx = tip.x - start.x, dy = tip.y - start.y;
  const length = Math.hypot(dx, dy);
  const side = labelStyle.alignment === "center" ? 0 : labelStyle.alignment === "swap" ? -1 : 1;
  const nx = side * dy / length, ny = -side * dx / length;
  const style = label.ownerDocument.defaultView!.getComputedStyle(label);
  const width = parseFloat(style.width), height = parseFloat(style.height);
  const distance = (labelStyle.sloped ? height : Math.abs(nx) * width + Math.abs(ny) * height) / 2 + em * 0.12;
  const position = labelStyle.pos;
  const x = start.x + dx * position + nx * distance - width / 2;
  const y = start.y + dy * position + ny * distance - height / 2;
  setStyle(label, "left", unit_px(x));
  setStyle(label, "top", unit_px(y));
  setStyle(label, "transform", labelStyle.sloped ? "rotate(" + Math.atan2(dy, dx) + "rad)" : "none");
  setStyle(label, "visibility", "visible");
  return { x, y, width, height };
}

/** 定位一个箭头的所有标签，并生成它们共用的箭线遮罩 */
export function renderLabels(document: Document, labels: readonly MountedLabel[], geometry: ArrowGeometry, em: number, viewport: LabelMaskViewport): SVGMaskElement | undefined {
  const masked: { box: CellBox; sloped: boolean }[] = [];
  for (const { element, style } of labels) {
    const box = positionLabel(element, geometry, style, em);
    if (style.mask) masked.push({ box, sloped: style.sloped });
  }
  if (!masked.length) return;

  // 只裁剪此箭头，避免依赖页面背景色或遮住交叉的其他箭头
  const mask = document.createElementNS(SVG, "mask");
  mask.id = viewport.id;
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", String(-em));
  mask.setAttribute("y", String(-em));
  mask.setAttribute("width", String(viewport.width + 2 * em));
  mask.setAttribute("height", String(viewport.height + 2 * em));
  const background = document.createElementNS(SVG, "rect");
  background.setAttribute("x", String(-em));
  background.setAttribute("y", String(-em));
  background.setAttribute("width", String(viewport.width + 2 * em));
  background.setAttribute("height", String(viewport.height + 2 * em));
  background.style.fill = "white";
  mask.appendChild(background);
  // 同一箭头的所有遮挡区域共享一个 mask，避免后一个标签覆盖前一个
  for (const { box, sloped } of masked) {
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", String(box.x - em * 0.12));
    rect.setAttribute("y", String(box.y - em * 0.12));
    rect.setAttribute("width", String(box.width + em * 0.24));
    rect.setAttribute("height", String(box.height + em * 0.24));
    if (sloped) {
      const angle = Math.atan2(geometry.tip.y - geometry.start.y, geometry.tip.x - geometry.start.x) * 180 / Math.PI;
      rect.setAttribute("transform", "rotate(" + angle + " " + (box.x + box.width / 2) + " " + (box.y + box.height / 2) + ")");
    }
    rect.style.fill = "black";
    mask.appendChild(rect);
  }
  return mask;
}
