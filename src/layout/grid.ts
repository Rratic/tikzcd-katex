import type { DiagramMetrics } from "./metrics";

/** 单元格度量 */
export interface CellMetrics {
  width: number;
  height: number;
  depth: number;
}

export interface GridSettings extends DiagramMetrics {
  /** 相邻两列带内边距的节点之间的间距 */
  columnGap: number;
  /** 相邻两行带内边距的节点之间的净距 */
  rowGap: number;
}

/** 计算布局 */
export function layoutGrid(rows: CellMetrics[][], settings: GridSettings) {
  const columns: number[] = [];
  const tracks = rows.map(row => {
    let height = settings.innerYSep, depth = settings.innerYSep;
    row.forEach((cell, column) => {
      columns[column] = Math.max(columns[column] ?? 0, cell.width + 2 * settings.innerXSep);
      height = Math.max(height, cell.height + settings.innerYSep);
      depth = Math.max(depth, cell.depth + settings.innerYSep);
    });
    return { height, depth };
  });
  const offsets: number[] = [];
  let width = 0;
  columns.forEach((column, index) => {
    if (index) width += settings.columnGap;
    offsets.push(width);
    width += column;
  });
  let total = 0;
  const cells = rows.map((row, index) => {
    if (index) total += settings.rowGap;
    const baseline = total + tracks[index]!.height;
    const result = row.map((cell, column) => ({
      ...cell,
      x: offsets[column]! + (columns[column]! - cell.width) / 2,
      y: baseline - cell.height,
      baseline,
    }));
    total += tracks[index]!.height + tracks[index]!.depth;
    return result;
  });

  // 单行沿单元格基线对齐
  // 多行沿整个矩阵的中心对齐
  const height = rows.length === 1 ? tracks[0]!.height : total / 2;
  return { columns, tracks, cells, width, total, height, depth: total - height };
}
