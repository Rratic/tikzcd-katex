import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = await readFile(new URL("../package.json", import.meta.url), "utf8");
const { name, version } = JSON.parse(manifest);
const banner = "/*!\n * " + [
  `${name} v${version}`,
  "@license MIT",
  "",
  "Third-party notices:",
  "",
  "Partly adapted from [Quiver](https://github.com/varkor/quiver/commit/2f289ecbae9b7e5a473e04b924750c538ed5c4cf) under MIT license.",
].join("\n").replace(/\r?\n/g, "\n * ") + "\n */";

const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  globalName: "TikzcdKaTeX",
  platform: "browser",
  target: "es2020",
  minify: false,
  banner: { js: banner },
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
await writeFile(new URL("../dist/tikzcd-katex.js", import.meta.url), code);
