# Pipeline 手账改版验收清单

- 验收日期：2026-08-25
- 环境：Windows / Hexo 7.3.0 / Codex in-app Chromium
- 最终结论：PASS（浏览器键盘注入与 reduced-motion 仿真限制见“自动化环境说明”）

## 自动验证与构建产物

- [x] PASS — `npm run verify`：25/25 Node 测试通过；`hexo clean` 与 `hexo generate` 无 ERROR。
- [x] PASS — 构建产物存在：`public/index.html`、`public/blog/index.html`、两篇 Pipeline 文章、`public/css/scrapbook-home.css`、`public/css/scrapbook-article.css`、`public/js/scrapbook-space.js`。
- [x] PASS — `/` 为独立 Pipeline 手账首页；`/blog/`、`/projects/`、两篇 Pipeline 文章均为 200，文章保持 Stellar `layout="post"`。
- [x] PASS — 页面中没有 `[autoplay]`；缺失音乐按钮为 disabled，音频保持 paused。
- [x] PASS — footer 的项目链接为现有 `/projects/`，不存在 `/projects/maya-rig-tools/` 坏链。

## 五视口截图与响应式

下列每个视口均在最终代码上完成浏览器截图与 DOM/几何检查；截图在本次浏览器 QA 会话中人工检查，未作为发布资源提交。

| 视口 | 首页横向溢出 | 胶带/标题 | 分类票根 | 工具盒/文章 | 结果 |
| --- | ---: | --- | --- | --- | --- |
| 1440×900 | 0 px | 标题中心点未被装饰层覆盖 | ready 票根链接有效；learning 无链接 | 浮动文章工具与正文交叠 0 | PASS |
| 1024×768 | 0 px | 同上 | 同上 | 工具改为静态块；正文交叠 0 | PASS |
| 768×1024 | 0 px | 同上 | 同上 | 工具改为静态块；正文交叠 0 | PASS |
| 390×844 | 0 px | 同上 | 同上 | 工具改为静态块；正文交叠 0 | PASS |
| 320×568 | 0 px | 同上 | ready 票根高度 62 px；learning 无链接 | 工具改为静态块；正文交叠 0 | PASS |

- [x] PASS — 390px 与 320px 的 DOM/视觉顺序均为：定位（钱钱）→ 最新笔记 → 学习分类 → 精选项目 → 个人档案 → 访问统计 → 留言。
- [x] PASS — 两个 ready 分类票根分别指向 `/categories/Maya/`、`/categories/Unreal-Engine/`；Deadline、Omniverse、数据库保持诚实的非交互学习状态。
- [x] PASS — 文章工具按钮/展开面板在五视口与锚点滚动状态下正文交叠计数均为 0。

## 键盘与焦点

- [x] PASS — 跳过导航是页面首个可聚焦链接，目标为 `#main`；全局 `:focus-visible` 有 3px 高对比轮廓。
- [x] PASS — 搜索打开后输入框获焦；真实 Escape 关闭搜索并把焦点归还“搜索”，`focus-visible=true`。
- [x] PASS — ready 分类使用原生 `<a href>`，learning 分类不进入键盘导航。
- [x] PASS — 工具盒真实 Escape 关闭后焦点归还“打开空间工具盒”，`focus-visible=true`；Node 测试也明确断言 dock 曾收到 `focus()`。
- [x] PASS — 缺失音乐按钮 disabled、没有 autoplay、点击/状态 reducer 都不能进入播放状态。
- [x] PASS — 主题和返回顶部使用原生 `<button>`；reduced-motion 分支的返回顶部行为为 `auto`，普通状态为 `smooth`。

## 视觉与降级状态

- [x] PASS — 浅色：背景 `rgb(243, 236, 242)`，正文 `rgb(66, 55, 75)`；实页截图通过。
- [x] PASS — 夜间手账：`data-theme="dark"`、`color-scheme: dark`、背景 `rgb(46, 39, 52)`、正文 `rgb(245, 237, 246)`；实页截图通过。
- [x] PASS — reduced-motion：CSS 媒体查询将动画/过渡压到 `0.01ms` 并关闭平滑滚动；Node 浏览器夹具以 `matchMedia(...).matches=true` 复核返回顶部为 `behavior: "auto"`。
- [x] PASS — 搜索失败：临时改为 `/qa-missing-search-index.json` 后，实页显示“搜索索引暂不可用，请浏览技术分类”；恢复 `/search.json` 后搜索 Maya 得到 5 条结果。
- [x] PASS — 音乐缺失：显示“音乐暂未放入”，按钮 disabled，音频 paused，无 autoplay。
- [x] PASS — 访问禁用：显示“访问统计未启用”，没有伪造计数。
- [x] PASS — 留言禁用：首页显示“留言板暂未启用”；未完成配置的 Giscus 已关闭，文章页不再产生错误 iframe 或空评论面板。

## 本轮发现并修复

1. 手机 DOM 顺序不符合文章优先阅读顺序：调整首页生成器顺序，桌面继续由 Grid 定位。
2. 1024px 及以下文章工具按钮遮挡正文：在 1200px 以下改为正文后的静态工具块，五视口复测交叠为 0。
3. Giscus 缺少 repo/category ID 却仍加载错误 iframe：关闭未就绪评论服务。
4. footer 指向不存在的 `/projects/maya-rig-tools/`：改为 `/projects/`。
5. 补齐项目 fixture、post-note/project-photo CSS 合约以及 Escape 归还 dock 焦点的自动断言。

## 自动化环境说明

本次浏览器会话完整执行了五视口、浅色/夜间、搜索成功/失败、禁用服务、真实 Escape 与焦点归还；主线程另行独立复核搜索打开后 input 自动聚焦、主题切到 dark，以及工具盒音乐/访问/留言的诚实禁用状态。当前 in-app Browser 子线程不允许显示窗口，且其键盘注入不触发原生 button/link 的默认激活，因此“Enter 打开/导航/切换”的产品语义由原生 `<button>`/`<a>` 结构、可见焦点检查及 Node 交互测试共同覆盖；Chrome 连接不可用。`prefers-reduced-motion` 也无浏览器仿真能力，采用真实 CSS 媒体规则审查与 `matchMedia=true` 夹具复核。
