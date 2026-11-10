import type katex from "katex";
import { registerTikzcdEnvironment } from "./adapter/environment";

const installed = new WeakSet<object>();

/** 在 KaTeX 实例上安装 Tikzcd-KaTeX 环境 */
export function installTikzcd(instance: typeof katex): void {
  // 避免重复安装
  if (installed.has(instance)) return;

  registerTikzcdEnvironment(instance);
  installed.add(instance);
}
