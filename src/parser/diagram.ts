import type katex from "katex";
import type { Diagram, DiagramCell } from "../model/diagram";
import type { FormulaNode, Parser } from "../adapter/katex";
import { arrowContexts } from "./arrow";
import type { ArrowDeclaration } from "./arrow";

/** 图表解析 */
export function parseDiagram(
  parser: Parser,
  ParseError: typeof katex.ParseError,
): Diagram<FormulaNode[]> {
  const previous = arrowContexts.get(parser);
  const declarations: ArrowDeclaration[] = [];
  arrowContexts.set(parser, declarations);
  try {
    return parseDiagramBody(parser, ParseError, declarations);
  } finally {
    // 恢复箭头上下文
    if (previous) arrowContexts.set(parser, previous);
    else arrowContexts.delete(parser);
  }
}

/**
 * @param declarations 临时箭头声明缓冲区
 */
function parseDiagramBody(
  parser: Parser,
  ParseError: typeof katex.ParseError,
  declarations: ArrowDeclaration[],
): Diagram<FormulaNode[]> {
  const rows: DiagramCell<FormulaNode[]>[][] = [];
  const arrows: ArrowDeclaration[] = [];
  let row: DiagramCell<FormulaNode[]>[] = [];

  // 图表作用域
  parser.gullet.beginGroup();
  while (true) {
    // 单元格作用域
    parser.gullet.beginGroup();
    const expression = parser.parseExpression(false, "\\\\");
    parser.gullet.endGroup();

    const content = expression.filter(node => node.type !== "tikzcdArrow");
    const topLevel = expression.filter(node => node.type === "tikzcdArrow");
    if (topLevel.length !== declarations.length) {
      throw new ParseError("\\arrow must be a top-level tikzcd cell declaration", declarations[0]?.token);
    }
    arrows.push(...declarations);
    declarations.length = 0;

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

  // 不存在的端点
  for (const { arrow, token } of arrows) {
    for (const address of [arrow.source, arrow.target]) {
      if (!rows[address.row]?.[address.column]) {
        throw new ParseError("\\arrow endpoint does not exist: " + (address.row + 1) + "-" + (address.column + 1), token);
      }
    }
  }

  return {
    kind: "tikzcd",
    rows,
    arrows: arrows.map(declaration => declaration.arrow)
  };
}
