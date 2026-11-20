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

    <!-- 通过 JsDelivr 加载指定版本 -->
    <script src="https://cdn.jsdelivr.net/npm/tikzcd-katex@0.2.0/dist/tikzcd-katex.min.js"></script>

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
// 单位均为 em
TikzcdKaTeX.setTikzcdStyle({
  "row sep": 1.8,
  "column sep": 2.4,
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

用 `"math"` 在箭头上添加一个或多个标签。标签默认在箭头行进方向的左侧，可以在第二个双引号后加 `'` 将它放在另一侧：

```tex
\begin{tikzcd}
  A \arrow[r, "f", "g"'] & B
\end{tikzcd}
```

### 标签样式设置
标签支持的设置项如下：
| 设置项 | 效果 |
| :---: | :--: |
| `swap` | 同加 `'`，放在箭头行进方向的右侧 |
| `sloped` | 旋转至平行于箭头方向 |
| `description` | 放在箭头中央，并部分遮盖箭头 |
| `marking` | 使用正文字号，放在箭头中央，并旋转至平行于箭头方向 |
| `pos=x` | 设置在箭头行进方向位置 |
| `at start` | 设置 `pos` 为 0 |
| `very near start` | 设置 `pos` 为 0.125 |
| `near start` | 设置 `pos` 为 0.25 |
| `midway` | 设置 `pos` 为 0.5 |
| `near end` | 设置 `pos` 为 0.75 |
| `very near end` | 设置 `pos` 为 0.875 |
| `at end` | 设置 `pos` 为 1 |

使用示例如下：

```tex
\begin{tikzcd}
  A \arrow[r, "f"]
    \arrow[rd, "g \circ f", swap, sloped]
  & B \arrow[d, "g"] \\
  & C
\end{tikzcd}
```

```tex
\begin{tikzcd}
  A \arrow[r, "p" pos=0.25, "q" {swap, pos=0.75}] & B
\end{tikzcd}
```

### 箭头样式设置
箭头支持的设置项如下：

| 设置项 | 效果 |
| :---: | :---: |
| `dashed` | 设置箭身为虚线 |
| `to head` | 设置箭头为正常 |
| `rightarrow` | 正常箭头 |
| `leftarrow` | 反向箭头 |
| `leftrightarrow` | 双边箭头 |
| `dash` | 无头箭头 |
| `equal` | 等号 |
| `two heads` | 设置箭头为双头 |
| `twoheadrightarrow` | 双头箭头 |
| `twoheadleftarrow` | 反向双头箭头 |
| `tail` | 设置箭尾带尾 |
| `rightarrowtail` | 带尾箭头 |
| `leftarrowtail` | 反向带尾箭头 |
| `maps to` | 设置箭尾带杠 |
| `mapsto` | 带杠箭头 |
| `mapsfrom` | 反向带杠箭头 |
| `hook` | 设置箭尾带钩 |
| `hookrightarrow` | 带钩箭头 |
| `hookleftarrow` | 反向带钩箭头 |

```tex
\begin{tikzcd}
  X \arrow[r, "f"] \arrow[d, two heads] & Y \\
  \mathrm{coim}(f) \arrow[r, dashed] & \mathrm{im}(f) \arrow[u, hook]
\end{tikzcd}
```

```tex
\begin{tikzcd}
	Y \arrow[rd, "\phi" description, dashed]
    \arrow[rrd, "\varphi_1"]
	  \arrow[rdd, "\varphi_2"']
    && \\
	& P \arrow[r, "\pi_1"'] \arrow[d, "\pi_2"] & {X_1} \\
	& {X_2}
\end{tikzcd}
```

`phantom` 命令会隐藏箭头，并让标签默认出在箭头中央，使用正文大小：

```tex
\begin{tikzcd}
  A \arrow[r] \arrow[d] \arrow[dr, phantom, "\ulcorner", very near start]
    & B \arrow[d] \\
  C \arrow[r] & D
\end{tikzcd}
```
