// 移植自 [quiver](https://github.com/varkor/quiver)

import type { CellAddress } from "./address";
import type { NamedOption } from "../parser/options";
import type { FormulaNode } from "../adapter/katex";

/////////////////////////////
/// 箭头的样式
/////////////////////////////

export type ArrowBodyStyle =
  // 无边不作为一种箭体设置
  // 正常直线 (-)
  "line" |
  // 双线 (=)
  "double";

/** 附加在 `ArrowBodyStyle` 上的作用 */
export type ArrowDashStyle = "solid" | "dashed";

/** 箭头端点的样式，适用于两端 */
export type ArrowEndStyle =
  // 无 (-)
  "none" |
  // 正常箭头 (→)
  "normal" |
  // 双头箭头 (↠)
  "twohead" |
  // 反转箭头 (⤚)
  "tail" |
  // 带杠箭头 (↦)
  "bar" |
  // 带钩箭头 (↪)
  "hook";

/** 箭头的主体、端点和路径样式 */
export interface ArrowStyle {
  body: ArrowBodyStyle,
  dash: ArrowDashStyle,
  head: ArrowEndStyle,
  tail: ArrowEndStyle,
  shift: number,
  bend: number,
}

function default_arrow_style(): ArrowStyle {
  return {
    body: "line",
    dash: "solid",
    head: "normal",
    tail: "none",
    shift: 0,
    bend: 0,
  };
}

export function applyStyleOption(style: ArrowStyle, option: NamedOption): boolean {
  switch (option.key) {
    case "dashed": style.dash = "dashed"; break;
    case "to head": style.head = "normal"; break;
    case "rightarrow": {
      style.head = "normal";
      style.tail = "none";
      break;
    }
    case "leftarrow": {
      style.head = "none";
      style.tail = "normal";
      break;
    }
    case "leftrightarrow": {
      style.head = "normal";
      style.tail = "normal";
      break;
    }
    case "dash": {
      style.head = "none";
      style.tail = "none";
      break;
    }
    case "equal": {
      style.body = "double";
      style.head = "none";
      style.tail = "none";
      break;
    }
    case "two heads": style.head = "twohead"; break;
    case "twoheadrightarrow": {
      style.head = "twohead";
      style.tail = "none";
      break;
    }
    case "twoheadleftarrow": {
      style.head = "none";
      style.tail = "twohead";
      break;
    }
    case "tail": style.tail = "tail"; break;
    case "rightarrowtail": {
      style.head = "normal";
      style.tail = "tail";
      break;
    }
    case "leftarrowtail": {
      style.head = "tail";
      style.tail = "normal";
      break;
    }
    case "maps to": style.tail = "bar"; break;
    case "mapsto": {
      style.head = "normal";
      style.tail = "bar";
      break;
    }
    case "mapsfrom": {
      style.head = "bar";
      style.tail = "normal";
      break;
    }
    case "hook": style.tail = "hook"; break;
    case "hookrightarrow": {
      style.head = "normal";
      style.tail = "hook";
      break;
    }
    case "hookleftarrow": {
      style.head = "hook";
      style.tail = "normal";
      break;
    }
    case "shift left":
    case "shift right": {
      const value = option.value;
      const shift = value === undefined ? 1 : Number(value);
      if (!Number.isFinite(shift)) return false;
      // 统一 0 与 -0
      style.shift = (option.key === "shift left" ? shift : -shift) || 0;
      break;
    }
    case "bend left":
    case "bend right": {
      const value = option.value;
      const angle = value === undefined ? 30 : Number(value);
      if (!Number.isFinite(angle)) return false;
      style.bend = (option.key === "bend left" ? angle : -angle) || 0;
      break;
    }
  }
  return true;
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

  /** 数学字号 */
  size: "text" | "script",

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
    size: "script",
    pos: 0.5,
    mask: false,
    sloped: false,
  };
}

export function applyLabelOption(style: LabelStyle, option: NamedOption): void {
  switch (option.key) {
    case "'":
    case "swap": style.alignment = "swap"; break;
    case "sloped": style.sloped = true; break;
    case "description": {
      style.alignment = "center";
      style.mask = true;
      break;
    }
    case "marking": {
      style.alignment = "center";
      style.size = "text";
      style.sloped = true;
      break;
    }
    case "pos": {
      const pos = Number(option.value!);
      if (Number.isFinite(pos)) style.pos = pos;
      break;
    }
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
  /** Phantom 模式 */
  phantom: boolean;

  /** 箭头样式 */
  style: ArrowStyle;
}

/** 图表箭头 */
export interface DiagramArrow {
  source: CellAddress;
  target: CellAddress;

  /** 标签 */
  labels: DiagramLabel[];
  options: ArrowOptions;
}

/** 创建默认箭头选项 */
export function createArrowOptions(): ArrowOptions {
  return {
    phantom: false,
    style: default_arrow_style(),
  };
}

/** 创建箭头 */
export function createArrow(
  source: CellAddress, target: CellAddress, options: ArrowOptions = createArrowOptions(),
): DiagramArrow {
  return {
    source,
    target,
    labels: [],
    options,
  };
}
