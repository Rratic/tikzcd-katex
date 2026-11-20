import type katex from "katex";
import type { Diagram, DiagramCell } from "../model/diagram";
import { to_key } from "../model/address";
import type { DiagramArrow } from "../model/arrow";
import type { FormulaNode, Parser } from "../adapter/katex";
import { arrowContexts, resolveArrow } from "./arrow";
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
  const cells: DiagramCell<FormulaNode[]>[][] = [];
  const arrows: { arrow: DiagramArrow; token?: ArrowDeclaration["token"] }[] = [];
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
    const origin = { row: cells.length, column: row.length };
    for (const declaration of declarations) {
      arrows.push({ arrow: resolveArrow(declaration, origin), token: declaration.token });
    }
    declarations.length = 0;

    row.push({ row: cells.length, column: row.length, content });
    const next = parser.fetch();
    if (next.text === "&") {
      parser.consume();
    } else if (next.text === "\\\\") {
      parser.consume();
      cells.push(row);
      row = [];
    } else if (next.text === "\\end") {
      // 末尾的换行无效
      if (row.length > 1 || content.length > 0 || topLevel.length > 0) cells.push(row);
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

  const width = cells.reduce((width, row) => Math.max(width, row.length), 0);
  const height = cells.length;

  // 检查端点存在性
  for (const { arrow, token } of arrows) {
    if (!cells[arrow.source.row]?.[arrow.source.column]) {
      throw new ParseError("\\arrow source does not exist: " + to_key(arrow.source), token);
    }
    if (!cells[arrow.target.row]?.[arrow.target.column]) {
      throw new ParseError("\\arrow target does not exist: " + to_key(arrow.target), token);
    }
  }

  return {
    kind: "tikzcd",
    width,
    height,
    cells,
    arrows: arrows.map(declaration => declaration.arrow)
  };
}
