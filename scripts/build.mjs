import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  globalName: "TikzcdKaTeX",
  platform: "browser",
  target: "es2020",
  minify: true,
  legalComments: "inline",
  metafile: true,
  write: false,
});

// 生成单一 js 文件
assert.equal(result.outputFiles.length, 1);

// 扩展中不含入运行时依赖
assert.ok(Object.keys(result.metafile.inputs).every(input => input.startsWith("src/")));

// 导出到 dist
const code = result.outputFiles[0].contents;
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/tikzcd-katex.min.js", import.meta.url), code);
