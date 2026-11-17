import { layoutArrow } from "../geometry/arrow";
import type { CellBox } from "../geometry/arrow";
import { addressKey } from "../model/diagram";
import type { DiagramArrow } from "../model/diagram";
import { layoutGrid } from "../layout/grid";
import type { CellMetrics, GridSettings } from "../layout/grid";

const ROOT = "[data-tikzcd]";
const SVG = "http://www.w3.org/2000/svg";

interface MountedDiagram {
  root: HTMLElement;
  cells: HTMLElement[];
  arrows: DiagramArrow[];
  svg?: SVGSVGElement;
  grid: HTMLElement;
  metrics: { rows: CellMetrics[][]; settings: GridSettings; cellAxis: number };
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

/** 写入样式 */
function setStyle(element: HTMLElement, property: "left" | "top" | "width", value: string): void {
  // 仅在值发生变化时进行
  // 避免重复触发 DOM 属性观察器
  if (element.style[property] !== value) element.style[property] = value;
}

function unit(value: number): string {
  return Number(value.toFixed(6)) + "em";
}

/** 应用布局 */
function renderDiagram(diagram: MountedDiagram): void {
  const { root, cells, arrows, svg, grid, metrics } = diagram;
  const window = root.ownerDocument.defaultView!;
  if (!root.getClientRects().length || !root.getBoundingClientRect().height) return;
  const em = parseFloat(window.getComputedStyle(root).fontSize);
  for (const cell of cells) {
    const [r, c] = cell.dataset.tikzcdCell!.split(":").map(Number) as [number, number];
    metrics.rows[r]![c]!.width = parseFloat(window.getComputedStyle(cell).width) / em;
  }
  const layout = layoutGrid(metrics.rows, metrics.settings);
  setStyle(grid, "width", unit(layout.width));
  for (const cell of cells) {
    const [r, c] = cell.dataset.tikzcdCell!.split(":").map(Number) as [number, number];
    const box = layout.cells[r]![c]!;
    setStyle(cell, "left", unit(box.x));
    setStyle(cell, "top", unit(box.y));
  }
  if (!svg) return;
  const rect = root.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    svg.style.display = "none";
    return;
  }
  const style = root.ownerDocument.defaultView!.getComputedStyle(root);
  const width = parseFloat(style.width), height = parseFloat(style.height);
  // 将 viewport 坐标转为 SVG 坐标
  const sx = rect.width / width, sy = rect.height / height;
  const boxes = new Map<string, CellBox>();
  for (const cell of cells) {
    const box = cell.getBoundingClientRect();
    const empty = cell.dataset.tikzcdEmpty === "true";
    boxes.set(cell.dataset.tikzcdCell!, {
      x: (box.x - rect.x) / sx,
      y: (box.y - rect.y) / sy - (empty ? em * metrics.cellAxis : 0),
      width: empty ? 0 : box.width / sx,
      height: empty ? 0 : box.height / sy,
    });
  }
  try {
    const paths = arrows.map(arrow => {
      const geometry = layoutArrow(boxes.get(addressKey(arrow.from))!, boxes.get(addressKey(arrow.to))!, em);
      const path = root.ownerDocument.createElementNS(SVG, "path");
      // KaTeX CSS 默认设置 .katex svg path { stroke: none }。
      path.style.cssText = "fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round";
      path.setAttribute("d", geometry.path);
      path.setAttribute("stroke-width", String(geometry.strokeWidth));
      return path;
    });
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.replaceChildren(...paths);
    svg.style.display = "block";
    delete diagram.error;
  } catch (error) {
    svg.style.display = "none";
    const message = error instanceof Error ? error.message : String(error);
    if (diagram.error !== message) {
      diagram.error = message;
      root.dispatchEvent(new root.ownerDocument.defaultView!.CustomEvent("tikzcd:layout-error", {
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
      const arrows = JSON.parse(root.dataset.tikzcd!) as DiagramArrow[];
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
        root, cells, svg, arrows, depth,
        grid: root.firstElementChild as HTMLElement,
        metrics: JSON.parse(root.dataset.tikzcdLayout!),
      };
      mounted.set(root, diagram);
      added.push(diagram);
      resize.observe(root);
      for (const cell of cells) resize.observe(cell);
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
