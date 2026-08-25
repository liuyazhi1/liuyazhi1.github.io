# 钱钱的 Pipeline 手账 Final Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline in this worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复最终审查的 10 个 Important 与同区域 2 个 Minor，并用单元、构建和真实 Playwright 证据锁定行为。

**Architecture:** 保持 Hexo/Stellar 边界不变；扩展纯首页模型与安全渲染器，使用稳定 `data-*` 协议让原生脚本分别管理导航、搜索、空间工具盒与文章增强。文章目录和阅读时间仅在生成后的 DOM 上增强，不修改 Stellar 或文章 Markdown。

**Tech Stack:** Hexo 7.3、Stellar、Node.js `node:test`、原生 HTML/CSS/JavaScript、Playwright Chromium

**Spec:** `docs/superpowers/specs/2026-08-25-scrapbook-blog-redesign.md`

## Global Constraints

- 不修改 `themes/stellar` 或文章 Markdown。
- 不新增前端框架或运行时网络依赖。
- 音乐只在明确用户操作后播放，不使用 `autoplay`。
- 保持 HTML/URL 转义、幂等挂载、storage 异常容错、键盘焦点和 reduced motion。
- 不伪造访问量、访客、留言或项目数据。

---

### Task 1: 数据与语义渲染契约

**Files:**
- Modify: `_config.yml`
- Modify: `scripts/scrapbook/model.js`
- Modify: `scripts/scrapbook/render-home.js`
- Test: `test/scrapbook-model.test.js`
- Test: `test/scrapbook-render.test.js`

**Interfaces:**
- Consumes: Hexo posts/categories/tags 与 `scrapbook` 配置。
- Produces: 安全纯文本摘要、分类、最多三个标签、项目技术栈、enabled visitor/comments href，以及正式品牌 Hero/导航/三栏 grid-area markup。

- [x] 先写失败测试，覆盖 `brand/tagline/direction`、post metadata、project `techStack`、enabled service href 和配置→模型→渲染。
- [x] 运行 `npm test`，确认新测试因字段/markup 缺失失败。
- [x] 实现最小模型归一化与渲染；所有动态文本继续经过 `escapeHtml`，URL 继续经过 `hrefFor`。
- [x] 运行 `npm test`，确认 Task 1 测试通过。

### Task 2: 独立交互状态与文章增强

**Files:**
- Modify: `source/js/scrapbook-space.js`
- Modify: `source/css/scrapbook-article.css`
- Test: `test/scrapbook-space.test.js`
- Test: `test/scrapbook-render.test.js`

**Interfaces:**
- Consumes: scoped `[data-search-status]`、`[data-space-status]`、`[data-audio-track]`、`[data-nav-toggle]`、Stellar article/TOC DOM。
- Produces: `mountNavigation`、`estimateReadingMinutes`、`shouldShowScrollTop`、PREVIOUS/NEXT reducer；移动 TOC 在文章前、标题元数据阅读时间、独立 live region。

- [x] 先写失败测试，覆盖菜单 Escape/focus return、多曲目环绕切换、source 更新、搜索计数播报、live region 隔离、返回顶部一屏阈值、文章增强幂等。
- [x] 运行 `npm test`，确认新测试失败。
- [x] 实现 reducer 与 DOM 挂载；任何 `audio.play()` 只能位于点击 handler 内。
- [x] 运行 `npm test`，确认 Task 2 测试通过。

### Task 3: 布局、对比度与路由

**Files:**
- Modify: `source/css/scrapbook-home.css`
- Modify: `source/css/scrapbook-article.css`
- Modify: `_config.stellar.yml`
- Test: `test/scrapbook-render.test.js`

**Interfaces:**
- Produces: desktop/tablet grid areas、mobile collapsed navigation、AA nav/learning/code-label contrast、正确 `/blog/` 与 taxonomy routes。

- [x] 先写具体颜色比值、选择器与 route target 测试。
- [x] 运行定向测试确认失败。
- [x] 实现本地表面/文字调整与 Stellar consumer route 更新。
- [x] 运行 `npm run verify`。

### Task 4: 可重复真实 QA 与交付

**Files:**
- Modify: `scripts/qa-scrapbook.js`
- Modify: `docs/qa/scrapbook-blog-checklist.md`
- Regenerate: `docs/qa/screenshots/qa-results.json`
- Create: desktop/mobile article screenshots
- Create: `.superpowers/sdd/2026-08-25-scrapbook-blog-redesign/final-fix-report.md`

**Interfaces:**
- Produces: hero/post/project/menu/TOC/routes/contrast/scroll-threshold 真实断言和截图证据。

- [x] 构建并启动本地 Hexo server。
- [x] 运行 Playwright QA，只有实际断言通过才写 PASS。
- [x] 运行 `npm run verify`、`git diff --check` 与最终自审。
- [ ] 写 finding→文件→测试/QA 映射报告并提交。
