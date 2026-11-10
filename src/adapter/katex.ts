import type katex from "katex";
import type { Token } from "katex";

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
   * @param breakOnInfix 到达中缀节点是是否停止
   * @param breakOnTokenText 表达式应停止的 token 文本
   */
  parseExpression(breakOnInfix: boolean, breakOnTokenText?: string): FormulaNode[];

  /** 解析整个函数 */
  parseFunction(): (FormulaNode & { name?: string }) | null;
}

export type InternalKatex = typeof katex & {
  __defineMacro(name: string, handler: (context: MacroContext) => {
    tokens: Token[];
    numArgs: number;
  }): void;

  __defineFunction(definition: {
    type: string;
    names: string[];
    numArgs: number;
    handler(context: { parser: Parser }): FormulaNode;
  }): void;
};
