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
  arrows: DiagramArrow[];
}

/** 单元格在图表中的地址，以 0 为起始 */
export interface CellAddress {
  row: number;
  column: number;
}

/** 图表箭头 */
export interface DiagramArrow {
  from: CellAddress;
  to: CellAddress;
}

/** 将单元格地址转为键 */
export function addressKey(address: CellAddress): string {
  return address.row + ":" + address.column;
}
