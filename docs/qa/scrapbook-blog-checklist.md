# Pipeline 手账改版验收清单

- 验收日期：2026-08-25
- 环境：Windows / Hexo 7.3.0 / bundled Node 24.19.0 / bundled Playwright Chromium API / Edge Chromium 151.0.4129.78
- 可重复脚本：`scripts/qa-scrapbook.js`
- 结构化证据：[qa-results.json](screenshots/qa-results.json)
- 最终结论：PASS

## 自动验证与构建产物

- [x] PASS — `npm run verify`：25/25 Node 测试通过；`hexo clean` 与 `hexo generate` 无 ERROR。
- [x] PASS — 构建产物存在：`public/index.html`、`public/blog/index.html`、`public/projects/index.html`、两篇 Pipeline 文章、两份 scrapbook CSS、scrapbook JS 与 `search.json`。
- [x] PASS — `/`、`/blog/`、`/projects/`、两篇 Pipeline 文章均返回 200 且横向溢出为 0；文章保持 Stellar `layout="post"`。
- [x] PASS — 最终产物不含 `/projects/maya-rig-tools/`、Giscus client 或 QA 临时搜索路径。

## 五视口截图与响应式

每个视口均由真实 Playwright Chromium 页面生成 PNG，并同时执行 DOM 与几何断言。

| 视口与截图 | 首页横向溢出 | 胶带/标题 | 分类票根 | 文章工具/正文 | 结果 |
| --- | ---: | --- | --- | --- | --- |
| [1440×900](screenshots/home-1440x900.png) | 0 px | 未遮字 | ready 有链接；learning 无链接 | 展开/关闭交叠 0 | PASS |
| [1024×768](screenshots/home-1024x768.png) | 0 px | 未遮字 | 同上 | 静态工具块；交叠 0 | PASS |
| [768×1024](screenshots/home-768x1024.png) | 0 px | 未遮字 | 同上 | 静态工具块；交叠 0 | PASS |
| [390×844](screenshots/home-390x844.png) | 0 px | 未遮字 | 同上 | 静态工具块；交叠 0 | PASS |
| [320×568](screenshots/home-320x568.png) | 0 px | 未遮字 | ready 票根 63px 高；learning 无链接 | 静态工具块；交叠 0 | PASS |

- [x] PASS — 390px 与 320px 的 DOM/视觉顺序为：定位（钱钱）→ 最新笔记 → 学习分类 → 精选项目 → 个人档案 → 访问统计 → 留言。
- [x] PASS — ready 分类分别指向 `/categories/Maya/`、`/categories/Unreal-Engine/`；Deadline、Omniverse、数据库为非链接学习状态。
- [x] PASS — 页面中没有 `[autoplay]`；五视口文章工具面板打开后均可见，且与正文交叠计数为 0。

## 原生键盘与焦点

页面 reload 后从 `document.body` 开始，以下全程只用 `page.keyboard.press('Tab')`（以及当前焦点上的 Enter/Space/Escape）完成；没有用 `locator.focus()` 或 `locator.press()` 跳到目标。完整记录见 [qa-results.json 的 `keyboard.focusTrace` / `focusOrder`](screenshots/qa-results.json)：53 个焦点事件、43 次 Tab 转移，每步均保存 path、tag、role、aria-label、text、href、disabled 与 `focus-visible`。

- [x] PASS — `Tab` 首先聚焦 skip link；`Enter` 激活后 URL hash 为 `#main`。
- [x] PASS — “搜索”按 `Enter` 打开 panel 且 input 自动获焦；input 按 `Escape` 关闭，焦点归还“搜索”。
- [x] PASS — Maya ready 票根按 `Enter` 导航到 `/categories/Maya/`。
- [x] PASS — dock 按 `Space` 展开工具盒；disabled 音乐按钮被 Tab 顺序跳过，音频不存在/保持 paused 且无 autoplay。
- [x] PASS — 主题按钮按 `Enter` 从 light 切到 dark。
- [x] PASS — Tab 实际聚焦“返回顶部”时页面 `scrollY>0`（本次 trace 为 12）；按 `Enter` 后 `scrollY=0`。
- [x] PASS — 工具盒内按 `Escape` 关闭 panel，焦点归还 dock；`:focus-visible=true`，轮廓为 3px solid。
- [x] PASS — Task 4 自动测试同步断言 dock 的 `focus()` 确实被调用。
- [x] PASS — trace 完整覆盖：首页 skip → 正文链接/ready 分类/项目/dock → 环回主导航/search；搜索关闭后继续到 Maya；分类页 Tab 到主页链接返回；再次从 body 遍历至 dock → theme → top。learning 分类与 disabled 音乐/访问/留言控件均未进入焦点顺序。

## 视觉与降级状态

- [x] PASS — [浅色截图](screenshots/theme-light-390x844.png)：背景 `rgb(243, 236, 242)`，正文 `rgb(66, 55, 75)`。
- [x] PASS — [夜间手账截图](screenshots/theme-dark-390x844.png)：`data-theme="dark"`、`color-scheme: dark`、背景 `rgb(46, 39, 52)`、正文 `rgb(245, 237, 246)`。
- [x] PASS — [reduced-motion 截图](screenshots/reduced-motion-390x844.png)：通过 `page.emulateMedia({ reducedMotion: 'reduce' })` 激活；媒体查询为 true；入场 animation、hover/focus transition 均为 `1e-05s`；滚动样式为 `auto`。
- [x] PASS — reduced-motion 下真实返回顶部调用参数为 `{ top: 0, behavior: "auto" }`。
- [x] PASS — [搜索失败截图](screenshots/search-failure-390x844.png)：Playwright 将真实 `/search.json` 请求返回 503，页面显示“搜索索引暂不可用，请浏览技术分类”；生产源码仍指向 `/search.json`。
- [x] PASS — [禁用服务截图](screenshots/disabled-services-390x844.png)：显示“音乐暂未放入”“访问统计未启用”“留言板暂未启用”，按钮 disabled，无伪造数字、空面板或 autoplay。
- [x] PASS — 未配置 Giscus 已关闭，文章页不再生成错误 iframe。

## 本轮发现并修复

1. 手机 DOM 顺序不符合文章优先阅读顺序：调整生成器顺序，桌面继续由 Grid 定位。
2. 1024px 及以下文章工具按钮遮挡正文：在 1200px 以下改为正文后的静态工具块，五视口复测交叠为 0。
3. Giscus 缺少 repo/category ID 却仍加载错误 iframe：关闭未就绪评论服务。
4. footer 指向不存在 `/projects/maya-rig-tools/`：改为 `/projects/`。
5. 补齐项目 fixture、post-note/project-photo CSS 合约与 Escape 归还 dock 焦点断言。

## 复现命令

```powershell
$env:NODE_PATH='C:\Users\yazhi.liu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:SCRAPBOOK_BASE_URL='http://127.0.0.1:44120'
& 'C:\Users\yazhi.liu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts\qa-scrapbook.js
```

结果：`PASS scrapbook QA: 5 viewports, keyboard, reduced-motion and fallbacks`。

键盘结果：`PASS keyboard traversal: 43 Tab transitions / 53 total focus events`。
