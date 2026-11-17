import type katex from "katex";
import type { Token } from "katex";
import type { InternalKatex } from "./katex";
import { parseDiagram } from "../parser/diagram";
import { gridBuilder, renderGrid } from "../render/grid";
import { parseArrow } from "../parser/arrow";

const ENVIRONMENT_COMMAND = "\\tikzcdInternal";

/** 注册 tikzcd 环境、箭头命令及构建器 */
export function registerTikzcdEnvironment(instance: typeof katex): void {
  // 转化为暴露接口的版本
  const internal = instance as InternalKatex;
  for (const hook of ["__defineMacro", "__defineFunction"] as const) {
    if (typeof internal[hook] !== "function") {
      throw new Error("KaTeX " + hook + " is unavailable");
    }
  }
  if (typeof internal.__domTree?.Span !== "function") {
    throw new Error("KaTeX __domTree.Span is unavailable");
  }

  // 注册 tikzcd 功能
  internal.__defineFunction({
    type: "tikzcd",
    names: [ENVIRONMENT_COMMAND],
    numArgs: 0,
    handler({ parser }) {
      // 强制指定不生成 MathML
      parser.settings.output = "html";
      const diagram = parseDiagram(parser, instance.ParseError);
      return renderGrid(diagram, parser.mode);
    },
    htmlBuilder: gridBuilder(internal.__domTree.Span),
  });

  // 注入 `\begin` 命令
  internal.__defineMacro("\\begin", context => {
    const argument = context.consumeArgs(1)[0]!;
    const name = argument.slice().reverse().map(token => token.text).join("");
    const makeToken = (text: string): Token => ({
      text,
      loc: argument[0]?.loc,
    });

    if (name === "tikzcd") {
      return { tokens: [makeToken(ENVIRONMENT_COMMAND)], numArgs: 0 };
    }

    // 非 tikzcd 环境原样恢复
    return {
      tokens: [
        makeToken("}"),
        ...argument,
        makeToken("{"),
        { ...makeToken("\\begin"), noexpand: true },
      ],
      numArgs: 0,
    };
  });

  // 注册 `\arrow` 命令
  internal.__defineFunction({
    type: "tikzcdArrow",
    names: ["\\arrow"],
    numArgs: 0,
    handler: ({ parser, token }) => parseArrow(parser, instance.ParseError, token),
  });
}
