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

---

使用 `setTikzcdStyle` 设置全局行列间距，如：

```js
TikzcdKaTeX.setTikzcdStyle({
  "row sep": 1.8,
  "column sep": 2.4
});
```

可以参考下表：

| size | row sep | column sep |
| :--: | :-----: | :--------: |
| tiny | 0.45 em | 0.6 em |
| small | 0.9 em | 1.2 em |
| scriptsize | 1.35 em | 1.8 em |
| normal | 1.8 em | 2.4 em |
| large | 2.7 em | 3.6 em |
| huge | 3.6 em | 4.8 em |

## 使用说明
用 `\begin{tikzcd}` 引入图表环境。单元格的位置指定与 `array`、`matrix` 等环境相同，使用 `&` 分列，使用 `\\` 分行。

箭头的命令为 `\arrow`，可以用 `from` 与 `to` 字段指定其起始点与终点：

```tex
\begin{tikzcd}
  \bullet & \bullet
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

用 `"math"` 在箭头上添加标签。标签默认在箭头行进方向的左侧，可以在第二个双引号后加 `'` 或用 `swap` 选项将它放在另一侧：

```tex
\begin{tikzcd}
  A \arrow[r, "f_i"] \arrow[d, "g"'] & B \arrow[d, "\frac{h}{k}"] \\
  C \arrow[r, "q", swap] & D
\end{tikzcd}
```

在标签后加 `description` 会将标签水平放在箭头中央，并留出空隙；加 `marking` 则会直接覆盖在箭头上：

```tex
\begin{tikzcd}
  A \arrow[r, "f" description] & B \\
  C \arrow[r, "g" marking] & D
\end{tikzcd}
```
