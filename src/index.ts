import type katex from "katex";
import { registerTikzcdEnvironment } from "./adapter/environment";
import { renderDiagrams } from "./render/diagram";
import { setRowSep, setColumnSep } from "./render/grid";

const installed = new WeakSet<object>();

/** 在 KaTeX 实例上安装 Tikzcd-KaTeX 环境 */
export function installTikzcd(instance: typeof katex): void {
  // 避免重复安装
  if (installed.has(instance)) return;

  registerTikzcdEnvironment(instance);

  // 补充独立渲染
  const render = instance.render;
  instance.render = (expression, base, options) => {
    render.call(instance, expression, base, options);
    renderDiagrams(base);
  };

  installed.add(instance);
}

/** 设置全局样式 */
export function setTikzcdStyle(setting: Record<string, unknown>): void {
  if (typeof setting["row sep"] === "number") {
    setRowSep(setting["row sep"]);
  }
  if (typeof setting["column sep"] === "number") {
    setColumnSep(setting["column sep"]);
  }
}
