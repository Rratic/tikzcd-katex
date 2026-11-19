/** 单元格在图表中的地址，以 0 为起始 */
export interface CellAddress {
  row: number;
  column: number;
}

/** 将内部地址转为从 1 开始的行-列键 */
export function to_key(address: CellAddress): string {
  return (address.row + 1) + "-" + (address.column + 1);
}

/** 将行-列键解析为内部地址 */
export function from_key(key: string): CellAddress | undefined {
  const match = /^(\d+)-(\d+)$/.exec(key);
  const row = Number(match?.[1]), column = Number(match?.[2]);
  if (!Number.isSafeInteger(row) || !Number.isSafeInteger(column) || row < 1 || column < 1) return;
  return { row: row - 1, column: column - 1 };
}
