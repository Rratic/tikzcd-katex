// 移植自 [quiver](https://github.com/varkor/quiver)

import type { CellAddress } from "./diagram";
import type { NamedOption } from "../parser/options";
import type { FormulaNode } from "../adapter/katex";

/////////////////////////////
/// 箭头的样式
/////////////////////////////

export type ArrowBodyStyle = "line";

/** 附加在 `ArrowBodyStyle` 上的作用 */
export type ArrowDashStyle = "solid" | "dashed";

/** 箭头端点的样式，适用于两端 */
export type ArrowEndStyle =
  // 无
  "none" |
  // 正常箭头
  "normal";

/** 箭头的头部、主体和尾部样式 */
export interface ArrowStyle {
  body: ArrowBodyStyle,
  dash: ArrowDashStyle,
  head: ArrowEndStyle,
  tail: ArrowEndStyle
}

function default_arrow_style(): ArrowStyle {
  return {
    body: "line",
    dash: "solid",
    head: "normal",
    tail: "none",
  };
}

export function applyStyleOption(style: ArrowStyle, option: NamedOption): void {
  switch (option.key) {
    case "dashed": style.dash = "dashed"; break;
  }
}

/////////////////////////////
/// 标签的样式
/////////////////////////////

export type LabelAlignmentStyle =
  // 箭头行进方向的左侧
  "auto" |
  // 箭头行进方向的右侧
  "swap" |
  // 中心
  "center";

export interface LabelStyle {
  alignment: LabelAlignmentStyle,

  /** 按行进方向的位置 */
  pos: number,

  /** 是否遮盖箭头 */
  mask: boolean;

  /** 是否要旋转至与箭头方向相同 */
  sloped: boolean,
}

function default_label_style(): LabelStyle {
  return {
    alignment: "auto",
    pos: 0.5,
    mask: false,
    sloped: false,
  };
}

export function applyLabelOption(style: LabelStyle, option: NamedOption): void {
  switch (option.key) {
    case "swap": style.alignment = "swap"; break;
    case "description": {
      style.alignment = "center";
      style.mask = true;
      break;
    }
    case "marking": {
      style.alignment = "center";
      style.sloped = true;
      break;
    }
    case "pos": style.pos = Number(option.value!); break;
    // https://tikz.dev/tikz-shapes.html#section-pos-option
    case "at start": style.pos = 0; break;
    case "very near start": style.pos = 0.125; break;
    case "near start": style.pos = 0.25; break;
    case "midway": style.pos = 0.5; break;
    case "near end": style.pos = 0.75; break;
    case "very near end": style.pos = 0.875; break;
    case "at end": style.pos = 1; break;
  }
}

/** 图表标签 */
export interface DiagramLabel {
  literal: string,
  nodes: FormulaNode[],
  style: LabelStyle,
}

export function createLabel(): DiagramLabel {
  return {
    literal: "",
    nodes: [],
    style: default_label_style()
  }
}

/////////////////////////////
/// 标签的一般选项
/////////////////////////////

/** 箭头的所有选项 */
export interface ArrowOptions {
  /** 平移 */
  offset: number;

  /** 弯曲程度 */
  curve: number;

  /** 环形箭头的半径刻度和角度 */
  radius: number;
  angle: number;

  /** 从起点和终点缩短的百分比 */
  shorten: { source: number; target: number };

  /** 平行线的数量 */
  level: number;

  /** 使用的曲线类型 */
  shape: "bezier";

  /** 端点连接到其他箭头时，是否对齐该箭头的实际中点 */
  edge_alignment: { source: boolean; target: boolean };

  /** 箭头样式 */
  style: ArrowStyle;
}

/** 图表箭头 */
export interface DiagramArrow {
  source: CellAddress;
  target: CellAddress;

  /** n-箭头的 n；与 `options.level` 区分 */
  level: number;

  /** 标签 */
  labels: DiagramLabel[];
  options: ArrowOptions;
}

/** 创建默认箭头选项 */
export function createArrowOptions(): ArrowOptions {
  return {
    offset: 0,
    curve: 0,
    radius: 3,
    angle: 0,
    shorten: { source: 0, target: 0 },
    level: 1,
    shape: "bezier",
    edge_alignment: { source: true, target: true },
    style: default_arrow_style(),
  };
}

/** 创建箭头 */
export function createArrow(
  source: CellAddress, target: CellAddress, options: ArrowOptions = createArrowOptions(),
): DiagramArrow {
  return {
    source, target,
    level: 1,
    labels: [],
    options,
  };
}
