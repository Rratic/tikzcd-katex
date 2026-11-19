import type { DiagramArrow } from "./arrow";
import type { CellAddress } from "./address";

/** 图表单元格 */
export interface DiagramCell<Formula> extends CellAddress {
  content: Formula;
}

/** 图表 */
export interface Diagram<Formula> {
  kind: "tikzcd";
  width: number; // 列数
  height: number; // 行数
  cells: DiagramCell<Formula>[][];
  arrows: DiagramArrow[];
}
