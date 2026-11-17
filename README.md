# Tikzcd-KaTeX
为 [KaTeX](https://katex.org/) 提供基础的 [`tikzcd`](https://tikz.dev/tikz-cd/) 环境支持。

项目移植了部分来自 [quiver](https://github.com/varkor/quiver) 的代码，详见 [NOTICE](NOTICE.md).

## 使用
```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="../node_modules/katex/dist/katex.min.css">

    <!-- 引入 KaTeX 样式表 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css" integrity="sha384-WwGtaC6ywCHxA5cstpj/3+xIZvTez8dq2IcBQaXRkenHZ7FVVq1ZROtURwfbtTlG" crossorigin="anonymous">

    <!-- 加载 KaTeX 主体 -->
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.js" integrity="sha384-a1WQdjRj162i159OYq041X6I4K8NenkrI09LlPmiHg0YOb7CR+wJOraXwK9abpnE" crossorigin="anonymous"></script>

    <!-- 加载本地 Tikzcd-KaTeX -->
    <script src="/dist/tikzcd-katex.min.js"></script>

    <!-- 使用 KaTeX auto-render -->
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/contrib/auto-render.min.js" integrity="sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz" crossorigin="anonymous"
      onload="TikzcdKaTeX.installTikzcd(katex); window.renderMathInElement(document.body);"></script>
  </head>
  ...
</html>
```

## API
以如下方式安装到 KaTeX 实例中：

```js
TikzcdKaTeX.installTikzcd(katex);
```

之后可以调用 `katex.render`，但不支持 `katex.renderToString`，因为需要在 DOM 中操作。且 `katex.render` 强制为 `string` 模式，不提供对应的 MathML 标记。

## 使用说明
用 `\begin{tikzcd}` 引入图表环境。单元格的位置指定与 `array`、`matrix` 等环境相同，使用 `&` 分列，使用 `\\` 分行。

箭头的命令为 `\arrow`，可以用 `from` 与 `to` 字段指定其起始点与终点：

```tex
\begin{tikzcd}
  \bullet &amp; \bullet
  \arrow[from=1-1, to=1-2]
\end{tikzcd}
```

也可以用 `r`、`d`、`l`、`u` 来指定指向的相对位置：
```tex
\begin{tikzcd}
  A \arrow[r] \arrow[d] \arrow[rd] & B \arrow[d] \\
  C \arrow[r] & D
\end{tikzcd}
```
