/** 单元格度量 */
export interface CellMetrics {
  width: number;
  height: number;
  depth: number;
}

export interface GridSettings {
  /** 相邻两列内容框之间的间距 */
  columnGap: number;
  /** 相邻两行的下降区与上升区之间的净距 */
  rowGap: number;
  /** 每行在基线上方保留的最小高度 */
  minHeight: number;
  /** 每行在基线下方保留的最小深度 */
  minDepth: number;
  /** 对齐的轴在外层基线上方的高度 */
  axis: number;
}

/** 计算布局 */
export function layoutGrid(rows: CellMetrics[][], settings: GridSettings) {
  const columns: number[] = [];
  const tracks = rows.map(row => {
    let height = settings.minHeight, depth = settings.minDepth;
    row.forEach((cell, column) => {
      columns[column] = Math.max(columns[column] ?? 0, cell.width);
      height = Math.max(height, cell.height);
      depth = Math.max(depth, cell.depth);
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
  const height = rows.length ? total / 2 + settings.axis : 0;
  return { columns, tracks, cells, width, total, height, depth: total - height };
}
