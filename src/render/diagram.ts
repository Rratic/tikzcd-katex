import { layoutArrow, shiftArrow } from "../geometry/arrow";
import type { CellNode } from "../geometry/arrow";
import { drawArrow } from "./arrow";
import { setStyle } from "./dom";
import { renderLabels } from "./label";
import { from_key, to_key } from "../model/address";
import type { ArrowOptions, DiagramArrow, LabelStyle } from "../model/arrow";
import { layoutGrid } from "../layout/grid";
import type { CellMetrics, GridSettings } from "../layout/grid";
import { scaleMetrics } from "../layout/metrics";

const ROOT = "[data-tikzcd]";
const SVG = "http://www.w3.org/2000/svg";
let nextDiagramId = 0;

type MountedArrow = Pick<DiagramArrow, "source" | "target">
  & Pick<ArrowOptions, "style" | "phantom">
  & { labels: LabelStyle[] };

interface MountedDiagram {
  id: number;
  root: HTMLElement;
  cells: HTMLElement[];
  arrows: MountedArrow[];
  labels: Map<string, HTMLElement>;
  svg?: SVGSVGElement;
  grid: HTMLElement;
  metrics: { cells: CellMetrics[][]; settings: GridSettings };
  depth: number;
  error?: string;
}

/** 查找给定节点自身及其后代中图表的根节点 */
function rootsIn(node: Node): HTMLElement[] {
  const roots: HTMLElement[] = [];
  if (node.nodeType === 1 && (node as Element).matches(ROOT)) roots.push(node as HTMLElement);
  if ("querySelectorAll" in node) {
    roots.push(...(node as ParentNode).querySelectorAll<HTMLElement>(ROOT));
  }
  return roots;
}

function unit(value: number): string {
  return Number(value.toFixed(6)) + "em";
}

/** 应用布局 */
function renderDiagram(diagram: MountedDiagram): void {
  const { root, cells, arrows, labels, svg, grid, metrics } = diagram;
  const document = root.ownerDocument;
  const window = document.defaultView!;
  if (!root.getClientRects().length || !root.getBoundingClientRect().height) return;
  const em = parseFloat(window.getComputedStyle(root).fontSize);
  for (const cell of cells) {
    const { row, column } = from_key(cell.dataset.tikzcdCell!)!;
    metrics.cells[row]![column]!.width = parseFloat(window.getComputedStyle(cell).width) / em;
  }
  const layout = layoutGrid(metrics.cells, metrics.settings);
  setStyle(grid, "width", unit(layout.width));
  for (const cell of cells) {
    const { row, column } = from_key(cell.dataset.tikzcdCell!)!;
    const box = layout.cells[row]![column]!;
    setStyle(cell, "left", unit(box.x));
    setStyle(cell, "top", unit(box.y));
  }
  if (!svg) return;
  const width = layout.width * em, height = layout.total * em;
  if (!width || !height) {
    svg.style.display = "none";
    for (const label of labels.values()) setStyle(label, "visibility", "hidden");
    return;
  }
  const drawingMetrics = scaleMetrics(metrics.settings, em);
  const boxes = new Map<string, CellNode>();
  for (const cell of cells) {
    const { row, column } = from_key(cell.dataset.tikzcdCell!)!;
    const box = layout.cells[row]![column]!;
    // 与单元格共用布局坐标，避免 DOM 像素取整使箭头倾斜
    boxes.set(cell.dataset.tikzcdCell!, {
      x: box.x * em,
      y: box.y * em,
      width: box.width * em,
      height: (box.height + box.depth) * em,
      baseline: box.baseline * em,
    });
  }
  try {
    const defs = document.createElementNS(SVG, "defs");
    const paths = arrows.flatMap((arrow, index) => {
      const path = layoutArrow(boxes.get(to_key(arrow.source))!, boxes.get(to_key(arrow.target))!, drawingMetrics, arrow.style.bends);
      const geometry = shiftArrow(path, arrow.style.shift * 0.56 * drawingMetrics.xHeight);
      const arrowLabels = arrow.labels.flatMap((style, labelIndex) => {
        const element = labels.get(index + ":" + labelIndex);
        return element ? [{ element, style }] : [];
      });
      const mask = renderLabels(document, arrowLabels, geometry, drawingMetrics, {
        id: "tikzcd-label-" + diagram.id + "-" + index, width, height,
      });
      if (arrow.phantom) return [];
      const group = drawArrow(document, geometry, arrow.style, drawingMetrics, "tikzcd-arrow-" + diagram.id + "-" + index);
      if (mask) {
        defs.appendChild(mask);
        group.setAttribute("mask", "url(#" + mask.id + ")");
      }
      return [group];
    });
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.replaceChildren(...(defs.childNodes.length ? [defs] : []), ...paths);
    svg.style.display = "block";
    delete diagram.error;
  } catch (error) {
    svg.style.display = "none";
    for (const label of labels.values()) setStyle(label, "visibility", "hidden");
    const message = error instanceof Error ? error.message : String(error);
    if (diagram.error !== message) {
      diagram.error = message;
      root.dispatchEvent(new window.CustomEvent("tikzcd:layout-error", {
        bubbles: true, detail: { message },
      }));
    }
  }
}

/**
 * 为一个文档创建公用管理器
 *
 * @param document 渲染容器所在浏览器文档
 * @returns 扫描并加载图表的函数
 */
function createManager(document: Document) {
  const window = document.defaultView!;
  const mounted = new Map<HTMLElement, MountedDiagram>();
  let timer: number | undefined;

  /** 更新已加载图表 */
  const schedule = () => {
    if (timer !== undefined || !mounted.size) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      // 先布置内层，再测量外层的单元格宽度
      for (const diagram of [...mounted.values()].sort((a, b) => b.depth - a.depth)) renderDiagram(diagram);
    }, 0);
  };
  const resize = new window.ResizeObserver(schedule);

  /** 释放资源 */
  const cleanup = () => {
    for (const [root, diagram] of mounted) {
      if (root.isConnected && root.ownerDocument === document) continue;
      resize.unobserve(root);
      for (const cell of diagram.cells) resize.unobserve(cell);
      for (const label of diagram.labels.values()) resize.unobserve(label);
      diagram.svg?.remove();
      mounted.delete(root);
    }
    if (!mounted.size && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };

  /** 扫描子树并加载未管理的图表 */
  const scan = (node: Node) => {
    cleanup();
    const added: MountedDiagram[] = [];
    for (const root of rootsIn(node)) {
      if (!root.isConnected || mounted.has(root)) continue;
      const cells = [...root.querySelectorAll<HTMLElement>("[data-tikzcd-cell]")]
        .filter(cell => cell.closest(ROOT) === root);
      const arrows = JSON.parse(root.dataset.tikzcd!) as MountedArrow[];
      const labels = new Map([...root.querySelectorAll<HTMLElement>("[data-tikzcd-label]")]
        .filter(label => label.closest(ROOT) === root)
        .map(label => [label.dataset.tikzcdLabel!, label] as const));
      let svg: SVGSVGElement | undefined;
      if (arrows.length) {
        svg = document.createElementNS(SVG, "svg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none";
        root.appendChild(svg);
      }
      let depth = 0;
      for (let parent = root.parentElement?.closest(ROOT); parent; parent = parent.parentElement?.closest(ROOT)) depth++;
      const diagram: MountedDiagram = {
        id: nextDiagramId++,
        root, cells, svg, arrows, labels, depth,
        grid: root.firstElementChild as HTMLElement,
        metrics: JSON.parse(root.dataset.tikzcdLayout!),
      };
      mounted.set(root, diagram);
      added.push(diagram);
      resize.observe(root);
      for (const cell of cells) resize.observe(cell);
      for (const label of labels.values()) resize.observe(label);
    }
    for (const diagram of added.sort((a, b) => b.depth - a.depth)) renderDiagram(diagram);
  };

  // 变化检测
  new window.MutationObserver(records => {
    cleanup();
    for (const record of records) {
      if (record.type === "attributes") {
        // SVG 自身的更新不触发更新
        if ((record.target as Element).namespaceURI !== SVG) schedule();
      } else {
        for (const node of record.addedNodes) scan(node);
      }
    }
  }).observe(document, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ["style", "class", "hidden"],
  });

  document.fonts.ready.then(schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  window.addEventListener("resize", schedule);

  return scan;
}

const managers = new WeakMap<Document, ReturnType<typeof createManager>>();

/**
 * 渲染入口
 *
 * @param base KaTeX 的渲染容器
 */
export function renderDiagrams(base: Node): void {
  if (rootsIn(base).length == 0) return;
  const document = base.ownerDocument!;
  let scan = managers.get(document);
  if (!scan) {
    scan = createManager(document);
    managers.set(document, scan);
  }
  scan(base);
}
