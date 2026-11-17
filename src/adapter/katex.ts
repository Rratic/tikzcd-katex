import type katex from "katex";
import type { Token } from "katex";

/////////////////////////////
/// 解析相关接口
/////////////////////////////

/** 解析模式 */
export interface FormulaNode {
  type: string;
  mode: "math" | "text";
}

/** 对标 KaTeX 的 `MacroExpander`，表示行为像宏但定义成宏/函数/符号的东西 */
export interface MacroContext {
  /** 开始一个作用域（可以层叠） */
  beginGroup(): void;

  /** 关闭当前作用域（可以层叠） */
  endGroup(): void;

  /** 消费指定数量的参数 */
  consumeArgs(count: number): Token[][];
}

export interface Parser {
  mode: FormulaNode["mode"];
  gullet: MacroContext;
  settings: { output: string };

  /**
   * 检查 `nextToken` 是否与 `text` 相符
   * 
   * @param consume 决定结束后是否调用 `consume()`
   */
  expect(text: string, consume?: boolean): void;

  /** 弃用 `nextToken`，视作消费 */
  consume(): void;

  /** 获取 `nextToken` */
  fetch(): Token;

  /**
   * 解析一个表达式（一列原子表达式）
   * 
   * @param breakOnInfix 到达中缀节点时是否停止
   * @param breakOnTokenText 表达式应停止的 token 文本
   */
  parseExpression(breakOnInfix: boolean, breakOnTokenText?: string): FormulaNode[];

  /** 解析整个函数 */
  parseFunction(): (FormulaNode & { name?: string }) | null;
}

export type InternalKatex = typeof katex & {
  __domTree: { Span: SpanConstructor };

  __defineMacro(name: string, handler: (context: MacroContext) => {
    tokens: Token[];
    numArgs: number;
  }): void;

  __defineFunction(definition: {
    type: string;
    names: string[];
    numArgs: number;
    handler(context: { parser: Parser; token?: Token }): FormulaNode;
    htmlBuilder?: HtmlBuilder;
  }): void;
};

/////////////////////////////
/// 渲染相关接口
/////////////////////////////

/** 构建选项 */
export interface BuildOptions {
  /** 获取当前样式对应的 text style */
  style: { text(): BuildOptions["style"] };
  sizeMultiplier: number;

  havingStyle(style: BuildOptions["style"]): BuildOptions;

  /** 获取当前字号对应的字体度量 */
  fontMetrics(): { axisHeight: number };
}

/** HTML 节点 */
export interface HtmlNode {
  height: number;
  depth: number;
  maxFontSize: number;
  children: HtmlNode[];
  style: Record<string, string>;

  setAttribute(name: string, value: string): void;
}

/**
 * 创建 KaTeX 的 HTML span 虚拟节点
 *
 * @param classes 节点的 CSS class 列表
 * @param children 子虚拟节点
 * @param options 构建选项
 * @param style 节点的内联 CSS 样式
 */
export type SpanConstructor = new (
  classes: string[], children: HtmlNode[], options?: BuildOptions,
  style?: Record<string, string>,
) => HtmlNode;

export interface StyledCell extends FormulaNode {
  style: "text" | "script";
  resetFont: true;
  body: (FormulaNode & { body: FormulaNode[] })[];
}

export interface CellBuilders {
  /**
   * 使用原生 styling 构建器排版单元格中的公式
   *
   * @param group 包含公式节点和 text style 设置的包装节点
   * @param options 构建选项
   */
  styling(group: StyledCell, options: BuildOptions): HtmlNode;
}

/**
 * 将解析节点构建为 HTML 虚拟节点
 *
 * @param this KaTeX 调用构建器时传入的原生构建器表
 * @param group 待构建的解析节点
 * @param options 构建选项
 */
export type HtmlBuilder = (
  this: CellBuilders, group: FormulaNode, options: BuildOptions,
) => HtmlNode;
