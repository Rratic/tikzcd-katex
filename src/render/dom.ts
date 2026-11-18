/** 设置样式，仅在值不同时写入，避免重复触发 DOM 属性观察器 */
export function setStyle(element: HTMLElement, property: "left" | "top" | "width" | "visibility" | "transform", value: string): void {
  if (element.style[property] !== value) element.style[property] = value;
}
