# Scrapbook Blog Final Fix Report

日期：2026-08-25
权威规格：`docs/superpowers/specs/2026-08-25-scrapbook-blog-redesign.md`
审查输入：`.superpowers/sdd/2026-08-25-scrapbook-blog-redesign/final-review-findings.md`
实现提交：`7a1913b3e169ecac2b6218505a6a2110c8bc7468`（`fix: complete scrapbook final review`）

## 结果

最终审查中的 10 个 Important 与同区域 2 个 Minor 已全部修复。未修改 `themes/stellar` 或 `source/_posts` 下的文章 Markdown；未新增前端框架或运行时网络依赖。动态文本与路径继续通过既有转义边界，音乐仍只可能在明确点击后播放，挂载保持幂等，storage 读写保持异常容错。

## Finding 修复映射

### Important 1 — Hero / 品牌

- 修复：站点配置改为“钱钱的 Pipeline 手账”，加入规格指定 tagline、Pipeline TD 角色、技术方向与学习状态；Hero 使用正式品牌作为语义 H1。
- 文件：`_config.yml`、`scripts/scrapbook/model.js`、`scripts/scrapbook/render-home.js`、`source/css/scrapbook-home.css`。
- 锁定：模型/渲染测试；Playwright 在 5 个视口断言正式 Hero 文案。

### Important 2 — 完整桌面与移动导航

- 修复：顶栏加入品牌、主页、技术日志、项目相册、关于我、留言板、搜索与主题控制；移动菜单默认折叠，`aria-expanded` 同步，Escape 关闭并归还焦点。
- 文件：`scripts/scrapbook/render-home.js`、`source/js/scrapbook-space.js`、`source/css/scrapbook-home.css`。
- 锁定：导航单元测试；390/320 Playwright 菜单、Escape、焦点与真实键盘遍历断言。

### Important 3 — 文章与项目元数据

- 修复：文章模型归一化安全纯文本摘要、首个分类、最多三个标签；项目保留经过核实的技术栈。摘要去除 script/style/HTML、解码实体并限制长度；超范围数字实体不再终止生成。
- 文件：`_config.yml`、`scripts/scrapbook/model.js`、`scripts/scrapbook/render-home.js`、`source/css/scrapbook-home.css`。
- 锁定：模型/渲染测试覆盖元数据、标签上限、技术栈、转义和畸形实体；Playwright 检查真实生成结果。

### Important 4 — 三栏信息架构与 grid areas

- 修复：DOM 保持移动阅读顺序“定位→文章→分类→项目→个人→访客→留言”；桌面 named areas 为左栏 profile/categories/visitor、中栏 positioning/posts、右栏 projects/message；平板两栏，手机单栏。窄右栏项目卡改为单列。
- 文件：`scripts/scrapbook/render-home.js`、`source/css/scrapbook-home.css`。
- 锁定：结构测试、computed grid areas、移动 DOM 顺序，以及 1440/1024/768/390/320 无横向溢出。

### Important 5 — Enabled visitor / comments / 多曲目

- 修复：配置→模型→渲染保留 enabled visitor/comments 的真实 `href`；enabled 输出链接，disabled 保持诚实提示；多曲目加入上一首/下一首、环绕 reducer、显式 source 切换与曲名更新。切歌不会调用播放，`audio.play()` 仍只在播放按钮点击 handler 中。
- 文件：`scripts/scrapbook/model.js`、`scripts/scrapbook/render-home.js`、`source/js/scrapbook-space.js`。
- 锁定：配置→模型→渲染 integration tests、多曲目环绕/source 切换与 no-autoplay 测试。

### Important 6 — Live region 隔离

- 修复：搜索使用 panel 内 `[data-search-status]`，空间工具盒使用 panel 内 `[data-space-status]`；空间初始化、主题和音量不再写搜索状态。搜索成功播报“找到 N 条结果”。
- 文件：`scripts/scrapbook/render-home.js`、`source/js/scrapbook-space.js`。
- 锁定：DOM/挂载测试；Playwright 搜索 Maya 播报“找到 5 条结果”，切换空间主题后播报不变。

### Important 7 — 移动 TOC 与阅读时间

- 修复：仅在 post layout 中克隆 Stellar TOC body 为移动 disclosure，并放在文章正文紧前；中英文正文估算阅读时间后加入 `#post-meta`。不修改文章 Markdown 或 Stellar，挂载保持幂等。
- 文件：`source/js/scrapbook-space.js`、`source/css/scrapbook-article.css`。
- 锁定：文章 fixture 测试；Playwright 验证移动 TOC 位置、桌面隐藏、预计阅读 3 分钟及正文/工具盒无重叠；新增桌面/手机文章截图。

### Important 8 — WCAG AA 三处对比度

- 修复：导航表面改为 `#79547c`；learning label 改为不透明 `#5c4964`；Stellar code language label 用本地高特异度规则设为 `#fffafc`、opacity 1。保留紫粉色板且不修改 Stellar。
- 文件：`source/css/scrapbook-tokens.css`、`source/css/scrapbook-home.css`、`source/css/scrapbook-article.css`。
- 锁定：具体颜色/选择器测试；浏览器 computed contrast 为导航 6.13:1、learning 7.97:1、code label 14.96:1，均 ≥ 4.5:1。

### Important 9 — Stellar 消费路由

- 修复：顶部博客和 footer 近期发布改为 `/blog/`；taxonomy consumers 改为 `/categories/`、`/tags/`、`/archives/`。
- 文件：`_config.stellar.yml`。
- 锁定：路由配置测试；Playwright 检查 8 个目标 200、生成 consumer link 目标存在、旧 `/blog/{categories,tags,archives}/` 链接为 0。

### Important 10 — 可重复 QA 与文章证据

- 修复：QA 新增 Hero、文章/项目元数据、named grid、移动菜单、移动 TOC/阅读时间、Stellar routes、实际 contrast、live region 和返回顶部精确阈值断言；重写 checklist 并重生成全部 JSON/PNG 证据。
- 文件：`scripts/qa-scrapbook.js`、`docs/qa/scrapbook-blog-checklist.md`、`docs/qa/screenshots/qa-results.json`、`docs/qa/screenshots/*.png`。
- 新证据：`docs/qa/screenshots/article-1440x900.png`、`docs/qa/screenshots/article-390x844.png`。

### Minor 1 — 返回顶部阈值

- 修复：按钮初始 hidden；scroll/resize 时只有 `scrollY > innerHeight` 才显示；一屏整仍隐藏；reduced-motion 保持 `behavior: "auto"`。
- 文件：`scripts/scrapbook/render-home.js`、`source/js/scrapbook-space.js`。
- 锁定：纯函数/reduced-motion 测试；Playwright 精确检查 0、一屏、超过一屏。

### Minor 2 — 无搜索结果引导

- 修复：无结果文案为“没有找到匹配笔记，请调整关键词或浏览技术分类”。
- 文件：`source/js/scrapbook-space.js`。
- 锁定：搜索挂载测试与 Playwright 实际搜索断言。

## TDD、测试与 QA 记录

### 红灯证据

- 首轮 finding 回归测试得到 16 个失败，分别暴露品牌/导航/元数据/grid/enabled services/live region/文章工具/对比度/路由/返回顶部等缺失契约。
- 最终安全自审先新增畸形实体测试并得到 `RangeError: Invalid code point 999999999`，加入 Unicode scalar 边界保护后转绿。

### 最终命令与输出

`npm run verify`

- PASS：40 tests / 40 pass / 0 fail。
- PASS：`hexo clean`。
- PASS：`hexo generate`，70 files generated，无错误。

Playwright 复现：

```powershell
npm run server -- --port 44120
$env:NODE_PATH='C:\Users\yazhi.liu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:SCRAPBOOK_BASE_URL='http://127.0.0.1:44120'
node scripts\qa-scrapbook.js
```

- PASS：`PASS scrapbook QA: 5 viewports, keyboard, reduced-motion and fallbacks`。
- PASS：`PASS keyboard traversal: 57 Tab transitions / 67 total focus events`。
- Evidence：`docs/qa/screenshots`。

最终自审：

- `git diff --check`：PASS，无 whitespace error（仅 Windows LF→CRLF 提示）。
- `git diff --name-only -- themes/stellar source/_posts`：PASS，输出为空。
- `node --check`：QA、model、renderer 和浏览器脚本全部 PASS。

## 提交

- `7a1913b3e169ecac2b6218505a6a2110c8bc7468` — `fix: complete scrapbook final review`。
- 本报告与完成态计划使用后续独立文档提交交付。

## Concerns

- 无阻塞 concern。
- 当前配置有意保持 music、visitor、comments 为 disabled，因为没有已选择的真实本地曲目或服务；enabled href 与多曲目行为由 integration/交互测试覆盖。未添加假数据，也没有 autoplay。
