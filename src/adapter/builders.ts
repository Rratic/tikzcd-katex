import type { BuildOptions, CellBuilders, FormulaNode, HtmlNode } from "./katex";

/**
 * 用 KaTeX 原生构建器排版单元格或标签，应用指定数学样式并重置公式字体
 *
 * @param builders 当前 HTML 分支的原生构建器表
 * @param content 已由 KaTeX 解析的单元格公式节点
 * @param mode 单元格所在的解析模式
 * @param options 外层公式的构建选项
 * @param style 单元格使用 text，箭头标签使用 script
 * @returns 公式的 HTML 虚拟节点
 */
export function buildCell(
  builders: CellBuilders, content: FormulaNode[],
  mode: FormulaNode["mode"], options: BuildOptions,
  style: "text" | "script" = "text",
): HtmlNode {
  if (typeof builders?.styling !== "function") {
    throw new Error("KaTeX native cell builders are unavailable");
  }
  return builders.styling({
    type: "styling", mode, style, resetFont: true,
    body: [{ type: "ordgroup", mode, body: content }],
  }, options);
}
