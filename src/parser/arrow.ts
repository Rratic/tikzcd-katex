import type katex from "katex";
import type { Token } from "katex";
import type { FormulaNode, Parser } from "../adapter/katex";
import { from_key } from "../model/address";
import type { CellAddress } from "../model/address";
import { applyLabelOption, applyStyleOption, createArrow, createArrowOptions, createLabel } from "../model/arrow";
import type { ArrowOptions, DiagramArrow, DiagramLabel } from "../model/arrow";
import { OptionsSyntaxError, parseOptions } from "./options";
import type { NamedOption, Option, OptionToken } from "./options";

export interface ArrowDeclaration extends FormulaNode {
  type: "tikzcdArrow";
  endpoints: Partial<Record<"source" | "target", ArrowPosition>>;
  labels: DiagramLabel[];
  options: ArrowOptions;
  token?: Token;
}

export const arrowContexts = new WeakMap<Parser, ArrowDeclaration[]>();

/** 未统一处理为绝对位置的端点位置 */
type ArrowPosition =
  | { kind: "absolute"; address: CellAddress }
  | { kind: "relative"; offset: CellAddress };

function resolve(origin: CellAddress, position?: ArrowPosition): CellAddress {
  if (position?.kind === "absolute") {
    return position.address;
  }
  else {
    return {
      row: origin.row + (position?.offset.row ?? 0),
      column: origin.column + (position?.offset.column ?? 0),
    };
  }
}

function parse_relative_position(literal: string): ArrowPosition {
  const offset = { row: 0, column: 0 };
  for (const direction of literal) {
    switch (direction) {
      case "r": offset.column++; break;
      case "d": offset.row++; break;
      case "l": offset.column--; break;
      case "u": offset.row--; break;
    }
  }
  return { kind: "relative", offset };
}

/**
 * 解析箭头配置
 *
 * @param parser 已消费 `\arrow` 的 KaTeX 解析器
 * @param ParseError 当前 KaTeX 实例的解析错误构造器
 * @param token 箭头命令的 token，用于在错误中保留源码位置
 * @returns 箭头声明
 */
export function parseArrow(
  parser: Parser,
  ParseError: typeof katex.ParseError,
  token?: Token,
): ArrowDeclaration {
  const declarations = arrowContexts.get(parser);
  if (!declarations) throw new ParseError("\\arrow is only allowed in tikzcd", token);

  let parameters: Option<DiagramLabel>[];
  try {
    parameters = parseOptions(readOptionTokens(parser));
  } catch (error) {
    if (error instanceof OptionsSyntaxError) {
      throw new ParseError(error.message + " in \\arrow " + (error.quoted ? "label options" : "options"), token);
    }
    throw error;
  }

  // 按顺序应用到箭头声明
  const declaration: ArrowDeclaration = {
    type: "tikzcdArrow", mode: parser.mode, endpoints: {}, labels: [], options: createArrowOptions(), token,
  };

  // 配置箭头
  for (const parameter of parameters) {
    if (parameter.type === "option") applyArrowOption(parameter, declaration, ParseError);
  }
  const labelStyle = createLabel().style;
  if (declaration.options.phantom) labelStyle.alignment = "center";

  // 箭头层的标签选项作为每个标签的共同配置
  for (const parameter of parameters) {
    if (parameter.type === "option") applyLabelOption(labelStyle, parameter);
  }
  for (const parameter of parameters) {
    if (parameter.type !== "quoted") continue;
    const label = parameter.value;
    label.style = { ...labelStyle };
    if (parameter.primes) applyLabelOption(label.style, { type: "option", key: "swap" });
    for (const option of parameter.options) applyLabelOption(label.style, option);
    declaration.labels.push(label);
  }
  declarations.push(declaration);
  return declaration;
}

/**
 * 读取箭头选项，将引号内的公式交给 KaTeX 解析并保留源码
 *
 * @param parser 已消费 `\arrow` 的 KaTeX 解析器
 * @returns 字符串选项 token 和包含公式节点的标签对象
 */
function* readOptionTokens(parser: Parser): Generator<OptionToken<DiagramLabel>> {
  while (true) {
    const token = parser.fetch();
    if (["EOF", "\\end", "&", "\\\\"].includes(token.text)) return;
    parser.consume();
    if (token.text !== '"') {
      yield token.text;
    } else {
      parser.gullet.beginGroup();
      const value = createLabel();
      try {
        value.nodes = parser.parseExpression(false, '"');
        const end = parser.fetch();
        parser.expect('"');
        if (token.loc && end.loc && token.loc.lexer === end.loc.lexer) {
          value.literal = token.loc.lexer.input.slice(token.loc.end, end.loc.start);
        }
      } finally {
        parser.gullet.endGroup();
      }
      yield { value };
    }
  }
}

/** 对 `NamedOption` 执行配置 */
function applyArrowOption(option: NamedOption, declaration: ArrowDeclaration, ParseError: typeof katex.ParseError): void {
  // 单独处理相对位置
  if (/^[rdlu]+$/.test(option.key)) {
    declaration.endpoints.target = parse_relative_position(option.key);
    return;
  }

  // 单独处理绝对位置
  if (option.key === "from" || option.key === "to") {
    const position = from_key(option.value?.trim() ?? "");
    if (!position) {
      throw new ParseError("expects \\arrow[" + option.key + "=row-column]", declaration.token);
    }
    declaration.endpoints[option.key == "from" ? "source" : "target"] = {
      kind: "absolute",
      address: position!
    };
    return;
  }

  // 单独处理 phantom 模式
  if (option.key === "phantom") {
    declaration.options.phantom = true;
    return;
  }

  // 处理普通配置
  applyStyleOption(declaration.options.style, option);
}

/** 将端点位置归一化为绝对位置 */
export function resolveArrow(declaration: ArrowDeclaration, origin: CellAddress): DiagramArrow {
  const arrow = createArrow(
    resolve(origin, declaration.endpoints.source),
    resolve(origin, declaration.endpoints.target),
    declaration.options,
  );
  arrow.labels = declaration.labels;
  return arrow;
}
