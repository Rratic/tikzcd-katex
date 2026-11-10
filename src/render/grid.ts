import type { Diagram } from "../model/diagram";
import type { FormulaNode } from "../adapter/katex";

/** 渲染后端 */
export function renderGrid(
  diagram: Diagram<FormulaNode[]>,
  mode: FormulaNode["mode"],
) {
  const columns = Math.max(0, ...diagram.rows.map(row => row.length));
  return {
    type: "array",
    mode,
    diagram,
    body: diagram.rows.map(row => row.map(cell => ({
      type: "styling",
      mode,
      style: "text",
      resetFont: true,
      body: [{ type: "ordgroup", mode, body: cell.content }],
    }))),
    cols: Array.from({ length: columns }, () => ({ type: "align", align: "c" })),
    arraystretch: 1,
    rowGaps: [],
    hskipBeforeAndAfter: false,
    hLinesBeforeRow: Array.from({ length: diagram.rows.length + 1 }, () => []),
  };
}
