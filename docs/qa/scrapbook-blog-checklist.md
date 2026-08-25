# Pipeline 手账改版验收清单

- 最终复测日期：2026-08-25
- 环境：Windows / Hexo 7.3.0 / Node 24.19.0 / Playwright Chromium / Edge Chromium 151.0.4129.78
- 可重复脚本：`scripts/qa-scrapbook.js`
- 结构化证据：[qa-results.json](screenshots/qa-results.json)
- 最终结论：PASS

## 自动验证与数据契约

- [x] PASS — `npm run verify`：39/39 Node 测试通过；`hexo clean` 与 `hexo generate` 无 ERROR；70 个文件生成。
- [x] PASS — 正式品牌为“钱钱的 Pipeline 手账”；Hero 同时包含批准的 tagline、Pipeline TD、技术方向和 Omniverse/数据库学习状态。
- [x] PASS — 首页文章模型输出安全纯文本摘要、分类和最多三个标签；两个精选项目都输出配置中核验过的技术栈。
- [x] PASS — enabled visitor/comments 的 href 从配置经模型保留到真实链接；multi-track reducer 与 DOM 测试覆盖上一首、下一首、环绕索引和 source 切换。
- [x] PASS — 仍无 `autoplay`；storage 读写异常、重复挂载、URL/HTML 转义和 reduced-motion 既有测试继续通过。

## 路由、导航与搜索

- [x] PASS — `/`、`/blog/`、`/projects/`、`/categories/`、`/tags/`、`/archives/` 和两篇文章均返回 200，横向溢出为 0。
- [x] PASS — Stellar 的博客/近期发布链接指向 `/blog/`；分类、标签、归档分别指向 `/categories/`、`/tags/`、`/archives/`；旧 `/blog/{categories,tags,archives}/` 链接数为 0。
- [x] PASS — 顶部提供品牌/主页/技术日志/项目相册/关于我/留言板/搜索/主题控制；390 与 320 宽度菜单默认折叠，展开后 `aria-expanded=true`，Escape 关闭并归还焦点。
- [x] PASS — 搜索 “Maya” 实际返回并播报“找到 5 条结果”；无结果提示为“没有找到匹配笔记，请调整关键词或浏览技术分类”。
- [x] PASS — `[data-search-status]` 与 `[data-space-status]` 分属各自 panel；主题/音量变化后搜索播报未被覆盖。

## 响应式布局与文章阅读

| 视口与截图 | 首页溢出 | Grid / 移动顺序 | 文章 TOC / 阅读时间 | 结果 |
| --- | ---: | --- | --- | --- |
| [1440×900](screenshots/home-1440x900.png) | 0 px | 三栏 named areas | 桌面 sticky TOC；预计阅读 3 分钟 | PASS |
| [1024×768](screenshots/home-1024x768.png) | 0 px | 两栏 named areas | 预计阅读 3 分钟 | PASS |
| [768×1024](screenshots/home-768x1024.png) | 0 px | 两栏 named areas | 预计阅读 3 分钟 | PASS |
| [390×844](screenshots/home-390x844.png) | 0 px | 单栏 DOM 顺序 | 移动 disclosure 在正文前 | PASS |
| [320×568](screenshots/home-320x568.png) | 0 px | 单栏 DOM 顺序 | 移动 disclosure 在正文前 | PASS |

- [x] PASS — 桌面 grid areas 为：左栏 profile/categories/visitor，中栏 positioning/posts，右栏 projects/message。
- [x] PASS — 手机 DOM 顺序为定位 → 最新文章 → 分类 → 项目 → 个人信息 → 访客 → 留言/状态。
- [x] PASS — 新增[桌面文章截图](screenshots/article-1440x900.png)与[手机文章截图](screenshots/article-390x844.png)；手机目录紧邻正文之前，文章正文与工具盒交叠为 0。
- [x] PASS — 项目相册在窄右栏改为单列，项目标题和技术栈不再被双列卡片挤压。

## WCAG、键盘与状态降级

- [x] PASS — 浏览器 computed style 对比度：浅色导航 6.13:1、learning label 7.97:1、Stellar code language label 14.96:1；均 ≥ 4.5:1，label opacity 为 1。
- [x] PASS — 真实键盘遍历记录 57 次 Tab 转移/67 个焦点事件，覆盖 skip link、完整导航、搜索、分类、项目、工具盒、主题和返回顶部。
- [x] PASS — 返回顶部在 0 和正好一屏时隐藏，超过一屏后显示；reduced-motion 下调用 `{ top: 0, behavior: "auto" }`。
- [x] PASS — [浅色](screenshots/theme-light-390x844.png)、[夜间](screenshots/theme-dark-390x844.png)、[reduced-motion](screenshots/reduced-motion-390x844.png)、[搜索失败](screenshots/search-failure-390x844.png)和[禁用服务](screenshots/disabled-services-390x844.png)证据已重新生成。
- [x] PASS — 当前未配置音乐、访问和留言服务时，分别显示“音乐暂未放入”“访问统计未启用”“留言板暂未启用”，无假数字、无不可用提交表单。

## 复现命令

```powershell
npm run verify
npm run server -- --port 44120
$env:NODE_PATH='C:\Users\yazhi.liu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:SCRAPBOOK_BASE_URL='http://127.0.0.1:44120'
node scripts\qa-scrapbook.js
```

输出：`PASS scrapbook QA: 5 viewports, keyboard, reduced-motion and fallbacks`；`PASS keyboard traversal: 57 Tab transitions / 67 total focus events`。
