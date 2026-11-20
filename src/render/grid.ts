import type { Diagram } from "../model/diagram";
import type { FormulaNode, HtmlBuilder, SpanConstructor } from "../adapter/katex";
import { buildCell } from "../adapter/builders";
import { to_key } from "../model/address";
import { layoutGrid } from "../layout/grid";
import { diagramMetrics } from "../layout/metrics";

/** 全局行间距，单位为 em */
let ROW_SEP = 1.8;
/** 全局列间距，单位为 em */
let COLUMN_SEP = 2.4;

/** 设置全局行列间距 */
export function setRowSep(rowSep: number): void {
  if (Number.isFinite(rowSep) && rowSep >= 0) {
    ROW_SEP = rowSep;
  }
}
export function setColumnSep(columnSep: number): void {
  if (Number.isFinite(columnSep) && columnSep >= 0) {
    COLUMN_SEP = columnSep;
  }
}

export interface DiagramNode extends FormulaNode {
  diagram: Diagram<FormulaNode[]>;
}

/** 渲染后端 */
export function renderGrid(
  diagram: Diagram<FormulaNode[]>,
  mode: FormulaNode["mode"],
): DiagramNode {
  return { type: "tikzcd", mode, diagram };
}

const em = (value: number) => value + "em";

/**
 * 创建 tikzcd 的 HTML 构建器
 *
 * @param Span `<span>` 虚拟节点构造器
 */
export function gridBuilder(Span: SpanConstructor): HtmlBuilder {
  /**
   * 构建单元格公式和图表容器
   *
   * @param group tikzcd 解析节点
   * @param options 构建选项
   * @returns 已设置高度和深度的 HTML 虚拟节点
   */
  return function (group, options) {
    const { diagram, mode } = group as DiagramNode;
    const native = diagram.cells.map(row => row.map(cell => buildCell(this, cell.content, mode, options)));
    const textOptions = options.havingStyle(options.style.text());
    const scale = textOptions.sizeMultiplier / options.sizeMultiplier;
    const settings = {
      ...diagramMetrics(textOptions.fontMetrics(), scale),
      columnGap: COLUMN_SEP * scale,
      rowGap: ROW_SEP * scale,
    };
    const metrics = native.map(row => row.map(cell => ({ width: 0, height: cell.height, depth: cell.depth })));
    const layout = layoutGrid(metrics, settings);

    const cells = diagram.cells.flatMap((row, r) => row.map((cell, c) => {
      const formula = native[r]![c]!;
      const strut = new Span([], [], undefined, {
        display: "inline-block", width: "0", height: em(formula.height + formula.depth),
        verticalAlign: em(-formula.depth),
      });
      const span = new Span([], [formula, strut], undefined, {
        display: "inline-block", whiteSpace: "nowrap", lineHeight: "0",
        height: em(formula.height + formula.depth),
        position: "absolute", width: "max-content",
        top: em(layout.cells[r]![c]!.y),
      });
      span.setAttribute("data-tikzcd-cell", to_key(cell));
      return span;
    }));

    const grid = new Span([], cells, undefined, {
      display: "block", position: "relative", height: "0",
    });

    const labels = diagram.arrows.flatMap((arrow, index) => arrow.labels.flatMap((content, labelIndex) => {
      if (!content.nodes.length) return [];
      const formula = buildCell(this, content.nodes, mode, options, content.style.size);
      const strut = new Span([], [], undefined, {
        display: "inline-block", width: "0", height: em(formula.height + formula.depth),
        verticalAlign: em(-formula.depth),
      });
      const label = new Span([], [formula, strut], undefined, {
        display: "inline-block", position: "absolute", whiteSpace: "nowrap", lineHeight: "0",
        width: "max-content", height: em(formula.height + formula.depth),
        visibility: "hidden", pointerEvents: "none", zIndex: "1",
      });
      label.setAttribute("data-tikzcd-label", index + ":" + labelIndex);
      return [label];
    }));

    // 独立的基线支撑
    const baseline = new Span([], [], undefined, {
      display: "inline-block", width: "0", height: em(layout.total), verticalAlign: "baseline",
    });

    // 根节点
    const root = new Span(["mord", "tikzcd"], [grid, baseline, ...labels], options, {
      display: "inline-block", position: "relative", textAlign: "initial", lineHeight: "0",
      height: em(layout.total), verticalAlign: em(-layout.depth),
    });
    root.height = layout.height;
    root.depth = layout.depth;
    root.maxFontSize = Math.max(options.sizeMultiplier, ...native.flat().map(cell => cell.maxFontSize));
    root.setAttribute("data-tikzcd", JSON.stringify(diagram.arrows.map(({ source, target, labels, options }) => ({
      source, target, style: options.style, phantom: options.phantom,
      labels: labels.map(label => label.style),
    }))));
    root.setAttribute("data-tikzcd-layout", JSON.stringify({
      cells: metrics, settings,
    }));

    return root;
  };
}
