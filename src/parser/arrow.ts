import type katex from "katex";
import type { Token } from "katex";
import type { FormulaNode, Parser } from "../adapter/katex";
import type { CellAddress, DiagramArrow } from "../model/diagram";

export interface ArrowDeclaration extends FormulaNode {
  type: "tikzcdArrow";
  arrow: DiagramArrow;
  token?: Token;
}

export const arrowContexts = new WeakMap<Parser, ArrowDeclaration[]>();

/**
 * @param parser 解析器，已消费 `\arrow`、当前位置为其选项起点
 * @param token 箭头命令的 token，用于在错误中保留源码位置
 */
export function parseArrow(
  parser: Parser,
  ParseError: typeof katex.ParseError,
  token?: Token,
): ArrowDeclaration {
  const declarations = arrowContexts.get(parser);
  if (!declarations) throw new ParseError("\\arrow is only allowed in tikzcd", token);
  while (parser.fetch().text === " ") parser.consume();
  parser.expect("[");
  let options = "";
  while (parser.fetch().text !== "]") {
    const next = parser.fetch();
    if (["EOF", "\\end", "&", "\\\\", "}", "{"].includes(next.text)) {
      throw new ParseError("Expected ] in \\arrow options", next);
    }
    options += next.text;
    parser.consume();
  }
  parser.consume();

  // 解析端点
  const endpoints: Partial<Record<"from" | "to", CellAddress>> = {};
  for (const option of options.split(",")) {
    const match = /^\s*(from|to)\s*=\s*([1-9]\d*)\s*-\s*([1-9]\d*)\s*$/.exec(option);
    if (!match) throw new ParseError("Expected from=row-column or to=row-column in \\arrow", token);
    const key = match[1] as "from" | "to";
    if (endpoints[key]) throw new ParseError("Duplicate \\arrow option: " + key, token);
    const row = Number(match[2]), column = Number(match[3]);
    endpoints[key] = { row: row - 1, column: column - 1 };
  }
  if (!endpoints.from || !endpoints.to) {
    throw new ParseError("\\arrow requires both from and to", token);
  }

  const declaration: ArrowDeclaration = {
    type: "tikzcdArrow", mode: parser.mode,
    arrow: { from: endpoints.from, to: endpoints.to }, token,
  };
  declarations.push(declaration);
  return declaration;
}
