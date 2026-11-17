import type katex from "katex";
import type { Token } from "katex";
import type { FormulaNode, Parser } from "../adapter/katex";
import type { CellAddress } from "../model/diagram";
import { createArrow, createArrowOptions } from "../model/arrow";
import type { ArrowOptions, DiagramArrow } from "../model/arrow";

export interface ArrowDeclaration extends FormulaNode {
  type: "tikzcdArrow";
  endpoints: Partial<Record<"source" | "target", ArrowPosition>>;
  label?: FormulaNode[];
  options: ArrowOptions;
  token?: Token;
}

/** 未统一处理为绝对位置的箭头位置 */
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

/**
 * 解析目标位置
 *
 * @param value 形如 `row-column` 的绝对位置或 `r`、`d`、`l`、`u` 组成的相对位置
 * @param ParseError 当前 KaTeX 实例的解析错误构造器
 * @param token 箭头命令的 token
 */
function parsePosition(value: string, ParseError: typeof katex.ParseError, token?: Token): ArrowPosition {
  if (/^[rdlu]+$/.test(value)) {
    const offset = { row: 0, column: 0 };
    for (const direction of value) {
      switch (direction) {
        case "r": offset.column++; break;
        case "d": offset.row++; break;
        case "l": offset.column--; break;
        case "u": offset.row--; break;
      }
    }
    return { kind: "relative", offset };
  }
  const match = /^([1-9]\d*)\s*-\s*([1-9]\d*)$/.exec(value);
  if (match) {
    const row = Number(match[1]), column = Number(match[2]);
    return { kind: "absolute", address: { row: row - 1, column: column - 1 } };
  }
  throw new ParseError("Expected row-column or r/d/l/u directions in \\arrow", token);
}

export const arrowContexts = new WeakMap<Parser, ArrowDeclaration[]>();

/**
 * 解析 `\arrow` 的参数
 *
 * @param parser 已消费 `\arrow` 的 KaTeX 解析器
 * @param ParseError 当前 KaTeX 实例的解析错误构造器
 * @param token 箭头命令的 token，用于在错误中保留源码位置
 */
export function parseArrow(
  parser: Parser,
  ParseError: typeof katex.ParseError,
  token?: Token,
): ArrowDeclaration {
  const declarations = arrowContexts.get(parser);
  if (!declarations) throw new ParseError("\\arrow is only allowed in tikzcd", token);

  const declaration: ArrowDeclaration = {
    type: "tikzcdArrow", mode: parser.mode, endpoints: {}, options: createArrowOptions(), token,
  };
  readArrowOptions(parser, declaration, ParseError);
  declarations.push(declaration);
  return declaration;
}

/** 读取选项 */
function readArrowOptions(parser: Parser, declaration: ArrowDeclaration, ParseError: typeof katex.ParseError): void {
  while (parser.fetch().text === " ") parser.consume();
  parser.expect("[");
  while (true) {
    while (parser.fetch().text === " ") parser.consume();
    if (parser.fetch().text === '"') {
      parseLabel(parser, declaration, ParseError);
    } else {
      let option = "";
      while (![",", "]"].includes(parser.fetch().text)) {
        const next = parser.fetch();
        if (["EOF", "\\end", "&", "\\\\", "}", "{", '"'].includes(next.text)) {
          throw new ParseError("Expected , or ] in \\arrow options", next);
        }
        option += next.text;
        parser.consume();
      }
      parseArrowOption(option.trim(), declaration, ParseError);
    }
    while (parser.fetch().text === " ") parser.consume();
    if (parser.fetch().text === "]") {
      parser.consume();
      return;
    }
    parser.expect(",");
  }
}

/** 解析标签 */
function parseLabel(parser: Parser, declaration: ArrowDeclaration, ParseError: typeof katex.ParseError): void {
  const token = parser.fetch();
  if (declaration.label) throw new ParseError("Only one label per \\arrow is supported", token);
  parser.consume();
  parser.gullet.beginGroup();
  try {
    declaration.label = parser.parseExpression(false, '"');
    parser.expect('"');
  } finally {
    parser.gullet.endGroup();
  }
  while (parser.fetch().text === " ") parser.consume();
  while (parser.fetch().text === "'") {
    parseLabelOption("swap", declaration.options);
    parser.consume();
  }
  while (parser.fetch().text === " ") parser.consume();
  if (parser.fetch().text !== "{") return;
  parser.consume();
  let option = "";
  while (true) {
    const next = parser.fetch();
    if (["EOF", "\\end", "&", "\\\\", "]", "{", '"'].includes(next.text)) {
      throw new ParseError("Expected } in \\arrow label options", next);
    }
    if (next.text === "," || next.text === "}") {
      parseLabelOption(option.trim(), declaration.options);
      option = "";
      parser.consume();
      if (next.text === "}") return;
    } else {
      option += next.text;
      parser.consume();
    }
  }
}

/**
 * 应用标签对齐选项
 *
 * @param option 单个标签选项，亦可出现在箭头选项列表中
 * @param options 接收解析结果的箭头选项
 */
function parseLabelOption(option: string, options: ArrowOptions): void {
  switch (option) {
    case "description": options.label_alignment = "centre"; break;
    case "marking": options.label_alignment = "over"; break;
    case "swap":
      if (options.label_alignment === "left") options.label_alignment = "right";
      else if (options.label_alignment === "right") options.label_alignment = "left";
      break;
  }
}

/**
 * 读取形如 `key=value` 的参数并分配
 *
 * @param option 已去除首尾空白的单个选项
 * @param declaration 接收解析结果的临时声明
 * @param ParseError 当前 KaTeX 实例的解析错误构造器
 */
function parseArrowOption(
  option: string, declaration: ArrowDeclaration, ParseError: typeof katex.ParseError,
): void {
  const assignment = /^([^=]+)\s*=\s*(.*)$/.exec(option);
  const key = assignment ? assignment[1]!.trim() : /^[rdlu]+$/.test(option) ? "to" : option;
  const value = assignment ? assignment[2]!.trim() : option;
  switch (key) {
    case "from":
    case "to": {
      if (!assignment && !/^[rdlu]+$/.test(value)) break;
      const endpoint = key === "from" ? "source" : "target";
      declaration.endpoints[endpoint] = parsePosition(value, ParseError, declaration.token);
      return;
    }
  }
  parseLabelOption(option, declaration.options);
}

/** 将端点位置归一化为绝对位置 */
export function resolveArrow(declaration: ArrowDeclaration, origin: CellAddress): DiagramArrow<FormulaNode[]> {
  return createArrow(
    resolve(origin, declaration.endpoints.source),
    resolve(origin, declaration.endpoints.target),
    declaration.label ?? [], declaration.options,
  );
}
