# Tikzcd-KaTeX
为 [KaTeX](https://katex.org/) 提供基础的 [`tikzcd`](https://tikz.dev/tikz-cd/) 环境支持。

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
```js
TikzcdKaTeX.installTikzcd(katex);
```
