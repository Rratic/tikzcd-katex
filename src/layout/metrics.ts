/** 图式的数学字体度量和节点内边距 */
export interface DiagramMetrics {
  /** 一个 TeX pt 在当前坐标单位中的长度 */
  pt: number;
  axis: number;
  xHeight: number;
  lineWidth: number;
  innerXSep: number;
  innerYSep: number;
}

/**
 * 从当前单元格字体取得图式度量
 *
 * @param font KaTeX 的数学字体度量
 * @param scale 单元格字号与图式容器字号的比例
 * @returns 相对于图式容器 em 的度量
 */
export function diagramMetrics(font: { axisHeight: number; xHeight: number; defaultRuleThickness: number }, scale: number): DiagramMetrics {
  return {
    pt: scale / 10,
    axis: font.axisHeight * scale,
    xHeight: font.xHeight * scale,
    lineWidth: font.defaultRuleThickness * scale,
    innerXSep: font.xHeight * scale,
    innerYSep: 0.85 * font.xHeight * scale,
  };
}

/** 将所有长度同时换算到另一单位 */
export function scaleMetrics(metrics: DiagramMetrics, factor: number): DiagramMetrics {
  return {
    pt: metrics.pt * factor,
    axis: metrics.axis * factor,
    xHeight: metrics.xHeight * factor,
    lineWidth: metrics.lineWidth * factor,
    innerXSep: metrics.innerXSep * factor,
    innerYSep: metrics.innerYSep * factor,
  };
}
