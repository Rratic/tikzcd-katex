import type katex from "katex";
import { registerTikzcdEnvironment } from "./adapter/environment";
import { renderDiagrams } from "./render/diagram";

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
