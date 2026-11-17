// 移植自 [quiver](https://github.com/varkor/quiver)

import type { CellAddress } from "./diagram";
import type { NamedOption } from "../parser/options";

/** 箭头的头部、主体和尾部样式 */
export interface ArrowOptionsStyle {
  name: "arrow";
  tail: { name: "none" };
  body: { name: "cell" };
  head: { name: "arrowhead" };
}

/** 箭头的所有选项 */
export interface ArrowOptions {
  label_alignment: "left" | "right" | "centre" | "over";

  /** 标签位置，取值 0–100 */
  label_position: number;

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
  style: ArrowOptionsStyle;
}

export function applyLabelOption(option: NamedOption, options: ArrowOptions): void {
  if (option.value !== undefined) return;
  switch (option.key) {
    case "description": options.label_alignment = "centre"; break;
    case "marking": options.label_alignment = "over"; break;
    case "swap": options.label_alignment = "right"; break;
  }
}

/** 图表箭头 */
export interface DiagramArrow<Label = string> {
  source: CellAddress;
  target: CellAddress;

  /** n-箭头的 n；与 `options.level` 区分 */
  level: number;
  label: Label;
  options: ArrowOptions;
}

/** 创建默认箭头选项 */
export function createArrowOptions(): ArrowOptions {
  return {
    label_alignment: "left",
    label_position: 50,
    offset: 0,
    curve: 0,
    radius: 3,
    angle: 0,
    shorten: { source: 0, target: 0 },
    level: 1,
    shape: "bezier",
    edge_alignment: { source: true, target: true },
    style: {
      name: "arrow",
      tail: { name: "none" },
      body: { name: "cell" },
      head: { name: "arrowhead" },
    },
  };
}

/** 创建箭头 */
export function createArrow<Label>(
  source: CellAddress, target: CellAddress, label: Label, options: ArrowOptions = createArrowOptions(),
): DiagramArrow<Label> {
  return {
    source, target,
    level: 1,
    label,
    options,
  };
}
