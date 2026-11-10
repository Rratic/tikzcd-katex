/** 图表单元格 */
export interface DiagramCell<Formula> {
  row: number;
  column: number;
  content: Formula;
}

/** 图表 */
export interface Diagram<Formula> {
  kind: "tikzcd";
  rows: DiagramCell<Formula>[][];
}
