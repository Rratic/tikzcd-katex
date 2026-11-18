import type katex from "katex";
import type { Token } from "katex";
import type { FormulaNode, Parser } from "../adapter/katex";
import type { CellAddress } from "../model/diagram";
import { applyLabelOption, createArrow, createArrowOptions } from "../model/arrow";
import type { ArrowOptions, DiagramArrow } from "../model/arrow";
import { OptionsSyntaxError, parseOptions } from "./options";
import type { NamedOption, Option, OptionToken } from "./options";

export interface ArrowDeclaration extends FormulaNode {
  type: "tikzcdArrow";
  endpoints: Partial<Record<"source" | "target", ArrowPosition>>;
  label?: FormulaNode[];
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

function parse_absolute_position(literal: string): ArrowPosition {
  const match = /^([1-9]\d*)\s*-\s*([1-9]\d*)$/.exec(literal)!;
  return {
    kind: "absolute",
    address: {
      row: Number(match[1]) - 1,
      column: Number(match[2]) - 1
    }
  };
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

  let parameters: Option<FormulaNode[]>[];
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
    type: "tikzcdArrow", mode: parser.mode, endpoints: {}, options: createArrowOptions(), token,
  };
  for (const parameter of parameters) {
    if (parameter.type === "option") {
      applyArrowOption(parameter, declaration);
    } else {
      if (declaration.label) throw new ParseError("Only one label per \\arrow is supported", token);
      declaration.label = parameter.value;
      for (let prime = 0; prime < parameter.primes; prime++) {
        applyLabelOption({ type: "option", key: "swap" }, declaration.options);
      }
      for (const option of parameter.options) applyLabelOption(option, declaration.options);
    }
  }
  declarations.push(declaration);
  return declaration;
}

function* readOptionTokens(parser: Parser): Generator<OptionToken<FormulaNode[]>> {
  while (true) {
    const token = parser.fetch();
    if (["EOF", "\\end", "&", "\\\\"].includes(token.text)) return;
    parser.consume();
    if (token.text !== '"') {
      yield token.text;
    } else {
      parser.gullet.beginGroup();
      let value: FormulaNode[];
      try {
        value = parser.parseExpression(false, '"');
        parser.expect('"');
      } finally {
        parser.gullet.endGroup();
      }
      yield { value };
    }
  }
}

/** 对 `NamedOption` 执行配置 */
function applyArrowOption(option: NamedOption, declaration: ArrowDeclaration): void {
  // 单独处理相对位置
  if (/^[rdlu]+$/.test(option.key)) {
    declaration.endpoints.target = parse_relative_position(option.key);
    return;
  }

  // 单独处理绝对位置
  if (option.key === "from") {
    declaration.endpoints["source"] = parse_absolute_position(option.value!);
    return;
  }
  if (option.key === "to") {
    declaration.endpoints["target"] = parse_absolute_position(option.value!);
    return;
  }

  // 处理普通配置
  if (option.key === "dashed" && option.value === undefined) {
    declaration.options.style.dash = "dashed";
    return;
  }
  applyLabelOption(option, declaration.options);
}

/** 将端点位置归一化为绝对位置 */
export function resolveArrow(declaration: ArrowDeclaration, origin: CellAddress): DiagramArrow<FormulaNode[]> {
  return createArrow(
    resolve(origin, declaration.endpoints.source),
    resolve(origin, declaration.endpoints.target),
    declaration.label ?? [], declaration.options,
  );
}
