import type katex from "katex";
import type { Diagram, DiagramCell } from "../model/diagram";
import type { FormulaNode, Parser } from "../adapter/katex";

/** 图表解析 */
export function parseDiagram(
  parser: Parser,
  ParseError: typeof katex.ParseError,
): Diagram<FormulaNode[]> {
  const rows: DiagramCell<FormulaNode[]>[][] = [];
  let row: DiagramCell<FormulaNode[]>[] = [];

  // 图表作用域
  parser.gullet.beginGroup();
  while (true) {
    // 单元格作用域
    parser.gullet.beginGroup();
    const content = parser.parseExpression(false, "\\\\");
    parser.gullet.endGroup();

    row.push({ row: rows.length, column: row.length, content });
    const next = parser.fetch();
    if (next.text === "&") {
      parser.consume();
    } else if (next.text === "\\\\") {
      parser.consume();
      rows.push(row);
      row = [];
    } else if (next.text === "\\end") {
      // 末尾的换行无效
      if (row.length > 1 || content.length > 0) rows.push(row);
      break;
    } else { // EOF
      throw new ParseError("Expected & or \\\\ or \\end{tikzcd}", next);
    }
  }

  const endToken = parser.fetch();
  const end = parser.parseFunction();

  // 未匹配到 `\end{tikzcd}`
  if (end?.type !== "environment" || end.name !== "tikzcd") {
    throw new ParseError(
      "Environment mismatch: expected tikzcd, got " + (end?.name ?? endToken.text),
      endToken,
    );
  }
  parser.gullet.endGroup();

  return { kind: "tikzcd", rows };
}
