# 钱钱的 Pipeline 手账 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留 Hexo + Stellar 文章系统的前提下，实现紫粉星梦配色的手账贴纸首页、专注阅读的文章页和可降级的 QQ 空间工具盒。

**Architecture:** 将默认文章索引迁到 `/blog/`，由根仓库中的 Hexo generator 生成独立首页，避免修改不可维护的 Stellar 子模块。首页数据模型和 HTML 渲染保持纯函数；全站视觉通过站点级 CSS 实现，空间工具盒使用一个可测试的无依赖浏览器脚本增强首页与文章页。

**Tech Stack:** Hexo 7.3、Stellar、CommonJS、Node.js 内置 `node:test`、原生 HTML/CSS/JavaScript

**Spec:** `docs/superpowers/specs/2026-08-25-scrapbook-blog-redesign.md`

## Global Constraints

- 不修改 `themes/stellar` 子模块内容。
- 不改变现有文章 Markdown 正文。
- 首页使用已批准的 A“紫粉星梦”色板：`#8F6F91`、`#42374B`、`#F3ECF2`、`#D7C7E7`、`#F4CADA`、`#C8DBEA`、`#FFF7BD`、`#FFFDF8`。
- 音乐只能在用户点击后播放，不得自动播放。
- 没有可靠数据源时不得伪造访问量、最近访客或留言状态。
- 所有交互必须支持键盘和可见焦点，并尊重 `prefers-reduced-motion`。
- 320px 至 1440px 视口不得出现页面级横向滚动。
- 不新增前端框架或运行时网络依赖。

---

## File Structure

- `scripts/scrapbook/model.js`：把 Hexo locals 与配置归一化为首页视图模型。
- `scripts/scrapbook/render-home.js`：将视图模型渲染为完整首页 HTML。
- `scripts/scrapbook.js`：注册根路径首页 generator。
- `source/css/scrapbook-tokens.css`：浅色、夜间手账和共享设计令牌。
- `source/css/scrapbook-home.css`：首页手账、拍立得、票根、便签、相册与响应式布局。
- `source/css/scrapbook-article.css`：Stellar 文章页、目录、代码块和降级状态的覆盖样式。
- `source/js/scrapbook-space.js`：空间工具盒、音乐、主题、返回顶部和状态持久化。
- `test/scrapbook-model.test.js`：首页数据选择与降级状态测试。
- `test/scrapbook-render.test.js`：生成 HTML 的结构、转义与可访问性测试。
- `test/scrapbook-space.test.js`：工具盒纯状态逻辑测试。
- `_config.yml`：索引路径和 `scrapbook` 内容配置。
- `_config.stellar.yml`：全站 CSS/JS 注入与 Stellar 文章页配置。
- `package.json`：增加测试与完整验证命令。

---

### Task 1: 首页数据模型与配置契约

**Files:**
- Create: `scripts/scrapbook/model.js`
- Create: `test/scrapbook-model.test.js`
- Modify: `_config.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: Hexo `locals.posts`、`locals.categories` 与 `_config.yml.scrapbook`。
- Produces: `buildHomeModel(locals, config): HomeModel`；`HomeModel` 包含 `profile`、`status`、`categories`、`latestPosts`、`featuredProjects`、`space`。

- [ ] **Step 1: 添加 Node 内置测试入口**

在 `package.json` 的 `scripts` 中加入：

```json
"test": "node --test test/*.test.js",
"verify": "npm test && npm run clean && npm run build"
```

- [ ] **Step 2: 写首页模型的失败测试**

创建 `test/scrapbook-model.test.js`，用最小的 posts/categories stub 验证：文章按日期倒序并限制为 3 篇；精选项目按 slug 查找；空分类显示“学习中”但数量为 0；未配置访问服务时状态为 `disabled`。

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHomeModel } = require('../scripts/scrapbook/model');

test('builds honest homepage data and keeps configured ordering', () => {
  const locals = {
    posts: [{ slug: 'maya', title: 'Maya 工具', date: new Date('2026-07-23'), path: 'maya/' }],
    categories: [{ name: 'Maya', length: 1 }]
  };
  const config = { scrapbook: {
    categories: ['Maya', 'Unreal', 'Omniverse', '数据库'],
    featured_projects: ['maya'],
    latest_limit: 3,
    visitor: { enabled: false }
  }};
  const model = buildHomeModel(locals, config);
  assert.equal(model.latestPosts[0].title, 'Maya 工具');
  assert.deepEqual(model.categories.map(x => [x.name, x.count]), [
    ['Maya', 1], ['Unreal', 0], ['Omniverse', 0], ['数据库', 0]
  ]);
  assert.equal(model.featuredProjects[0].slug, 'maya');
  assert.equal(model.space.visitor.status, 'disabled');
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="builds honest homepage"`

Expected: FAIL，错误包含 `Cannot find module '../scripts/scrapbook/model'`。

- [ ] **Step 4: 实现最小数据模型**

在 `scripts/scrapbook/model.js` 导出以下纯函数，并把 Hexo collection 先用 `toArray()` 或 `Array.from()` 转为数组：

```js
function buildHomeModel(locals, config) {
  const settings = config.scrapbook || {};
  const posts = toArray(locals.posts).filter(post => post.indexing !== false)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const categories = (settings.categories || []).map(name => {
    const found = toArray(locals.categories).find(item => item.name === name);
    return { name, count: found ? found.length : 0, status: found ? 'ready' : 'learning' };
  });
  const featuredProjects = (settings.featured_projects || [])
    .map(slug => posts.find(post => post.slug === slug)).filter(Boolean);
  return {
    profile: settings.profile || {},
    status: settings.status || {},
    categories,
    latestPosts: posts.slice(0, settings.latest_limit || 3),
    featuredProjects,
    space: {
      music: settings.music || { tracks: [] },
      visitor: { status: settings.visitor?.enabled ? 'enabled' : 'disabled' },
      comments: { status: settings.comments?.enabled ? 'enabled' : 'disabled' }
    }
  };
}
```

同时实现并导出 `toArray(value)`，对数组、含 `toArray()` 的 Hexo collection 和空值分别返回稳定数组。

- [ ] **Step 5: 写入明确的站点配置**

在 `_config.yml` 中将 `index_generator.path` 改为 `blog`，并新增 `scrapbook`：

```yaml
scrapbook:
  latest_limit: 3
  categories: [Maya, Unreal Engine, Deadline, Omniverse, 数据库]
  featured_projects: [ue-submit-render-farm, maya-asset-batch-submit]
  profile:
    name: 钱钱
    role: Pipeline TD
    experience: 3 年流程开发经验
  status:
    text: 正在学习 Omniverse 与数据库
  music:
    tracks: []
  visitor:
    enabled: false
  comments:
    enabled: false
```

- [ ] **Step 6: 运行测试并提交**

Run: `npm test`

Expected: PASS。

```bash
git add package.json _config.yml scripts/scrapbook/model.js test/scrapbook-model.test.js
git commit -m "feat: add scrapbook homepage data model"
```

---

### Task 2: 独立首页生成器与语义结构

**Files:**
- Create: `scripts/scrapbook/render-home.js`
- Create: `scripts/scrapbook.js`
- Create: `test/scrapbook-render.test.js`

**Interfaces:**
- Consumes: Task 1 的 `buildHomeModel(locals, config)`。
- Produces: `renderHome(model, site): string`；Hexo generator 输出 `{ path: 'index.html', data: html, layout: false }`。

- [ ] **Step 1: 写 HTML 渲染失败测试**

创建 `test/scrapbook-render.test.js`，验证首页包含 `main`、唯一 `h1`、导航可访问名称、三类内容区、真实文章 URL、空服务状态，以及恶意标题被转义。

```js
test('renders semantic scrapbook homepage and escapes content', () => {
  const html = renderHome({
    profile: { name: '钱钱', role: 'Pipeline TD' },
    status: { text: '学习中' },
    categories: [{ name: 'Maya', count: 1, status: 'ready' }],
    latestPosts: [{ title: '<script>alert(1)</script>', path: 'maya/', date: new Date('2026-07-23') }],
    featuredProjects: [],
    space: { music: { tracks: [] }, visitor: { status: 'disabled' }, comments: { status: 'disabled' } }
  }, { title: '钱钱的博客', root: '/' });
  assert.match(html, /<main/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /aria-label="主导航"/);
  assert.match(html, /href="\/maya\/"/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /访问统计未启用/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="renders semantic scrapbook"`

Expected: FAIL，错误包含 `Cannot find module '../scripts/scrapbook/render-home'`。

- [ ] **Step 3: 实现安全 HTML helper 与首页渲染器**

在 `scripts/scrapbook/render-home.js` 实现并导出：

```js
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const urlFor = path => '/' + String(path || '').replace(/^\/+/, '');

function renderHome(model, site) {
  return `<!doctype html><html lang="zh-CN" data-theme="light">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(site.title)}</title>
  <link rel="stylesheet" href="/css/scrapbook-tokens.css">
  <link rel="stylesheet" href="/css/scrapbook-home.css"></head>
  <body class="scrapbook-home"><a class="skip-link" href="#main">跳到主要内容</a>
  ${renderNavigation(site)}<main id="main">${renderHero(model)}${renderScrapbookGrid(model)}</main>
  ${renderSpaceDock(model.space)}<script src="/js/scrapbook-space.js" defer></script></body></html>`;
}
```

同文件实现 `renderNavigation`、`renderHero`、`renderScrapbookGrid`、`renderProfile`、`renderCategoryTickets`、`renderPostNotes`、`renderProjectPhotos` 和 `renderSpaceDock`。每个按钮使用 `<button type="button">`，每个导航动作使用真实 `<a>`；装饰元素统一带 `aria-hidden="true"`。

- [ ] **Step 4: 注册根路径 generator**

创建 `scripts/scrapbook.js`：

```js
const { buildHomeModel } = require('./scrapbook/model');
const { renderHome } = require('./scrapbook/render-home');

hexo.extend.generator.register('scrapbook-home', function scrapbookHome(locals) {
  const model = buildHomeModel(locals, this.config);
  return { path: 'index.html', data: renderHome(model, this.config), layout: false };
});
```

- [ ] **Step 5: 运行单测和 Hexo 构建**

Run: `npm test && npm run clean && npm run build`

Expected: 全部 PASS，且 `public/index.html` 包含 `class="scrapbook-home"`，`public/blog/index.html` 仍包含 Stellar 的文章列表。

- [ ] **Step 6: 提交首页结构**

```bash
git add scripts/scrapbook.js scripts/scrapbook/render-home.js test/scrapbook-render.test.js
git commit -m "feat: generate scrapbook homepage"
```

---

### Task 3: 紫粉星梦令牌与首页手账布局

**Files:**
- Create: `source/css/scrapbook-tokens.css`
- Create: `source/css/scrapbook-home.css`
- Modify: `test/scrapbook-render.test.js`

**Interfaces:**
- Consumes: Task 2 输出的 `.scrapbook-home`、`.scrapbook-grid`、`.profile-polaroid`、`.category-ticket`、`.post-note`、`.project-photo`、`.space-dock`。
- Produces: 响应式首页视觉；共享 CSS custom properties。

- [ ] **Step 1: 扩展渲染测试验证样式入口**

在 `test/scrapbook-render.test.js` 增加断言：

```js
assert.match(html, /href="\/css\/scrapbook-tokens\.css"/);
assert.match(html, /href="\/css\/scrapbook-home\.css"/);
assert.match(html, /class="[^"]*profile-polaroid/);
assert.match(html, /class="[^"]*category-ticket/);
assert.match(html, /class="[^"]*space-dock/);
```

- [ ] **Step 2: 运行测试确认结构缺口**

Run: `npm test -- --test-name-pattern="renders semantic scrapbook"`

Expected: 如果 Task 2 尚未输出这些稳定类名则 FAIL；补齐类名后 PASS。

- [ ] **Step 3: 创建共享令牌**

`source/css/scrapbook-tokens.css` 必须声明：

```css
:root {
  --sb-nav: #8f6f91;
  --sb-ink: #42374b;
  --sb-paper: #f3ecf2;
  --sb-lavender: #d7c7e7;
  --sb-pink: #f4cada;
  --sb-blue: #c8dbea;
  --sb-yellow: #fff7bd;
  --sb-white: #fffdf8;
  --sb-focus: #684468;
  --sb-shadow: 4px 5px 0 rgb(99 74 103 / 13%);
}
:root[data-theme="dark"] {
  --sb-nav: #6f5874;
  --sb-ink: #f5edf6;
  --sb-paper: #2e2734;
  --sb-white: #3b3341;
  --sb-focus: #f4cada;
}
```

同时定义 `.skip-link`、`:focus-visible`、`[hidden]` 与 `prefers-reduced-motion` 的全站规则。

- [ ] **Step 4: 实现桌面三栏手账首页**

在 `source/css/scrapbook-home.css`：

- `.scrapbook-grid` 使用 `190px minmax(0, 1fr) 180px` 三栏。
- `.profile-polaroid`、`.post-note`、`.project-photo` 使用不同纸张表面和不超过 `1.5deg` 的静态倾斜。
- `.category-ticket` 使用虚线裁切感，但保持整块点击区域不小于 40px 高。
- `.post-note` 依次使用黄、粉、蓝三种纸张，文字始终使用 `--sb-ink`。
- `.space-dock` 位于页面底部中央，展开面板时不遮挡正文。
- 背景点阵与胶带均使用 CSS 绘制，不依赖远程图片。

- [ ] **Step 5: 添加响应式与减少动态效果**

在 `1024px` 以下变两栏，在 `640px` 以下变单栏；手机阅读顺序必须由 DOM 顺序保证。为首次入场设置一次性 `transform` 动画，并在以下媒体查询中完全禁用：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: 构建并提交首页样式**

Run: `npm run verify`

Expected: PASS，`public/css/scrapbook-home.css` 和 `public/css/scrapbook-tokens.css` 存在。

```bash
git add source/css/scrapbook-tokens.css source/css/scrapbook-home.css test/scrapbook-render.test.js
git commit -m "style: build purple scrapbook homepage"
```

---

### Task 4: 空间工具盒与手动音乐状态

**Files:**
- Create: `source/js/scrapbook-space.js`
- Create: `test/scrapbook-space.test.js`
- Modify: `scripts/scrapbook/render-home.js`

**Interfaces:**
- Consumes: `[data-space-dock]`、`[data-space-panel]`、`[data-audio]`、`[data-theme-toggle]`、Task 1 的 `space` 状态。
- Produces: `createInitialState(config)`、`reduceSpaceState(state, event)`、`mountSpaceTools(document, storage)`。

- [ ] **Step 1: 写工具盒状态失败测试**

创建 `test/scrapbook-space.test.js`：

```js
test('never starts music without an explicit play event', () => {
  const initial = createInitialState({ tracks: [{ src: '/music/a.mp3', title: 'A' }] });
  assert.equal(initial.playing, false);
  assert.equal(reduceSpaceState(initial, { type: 'OPEN_PANEL' }).playing, false);
  assert.equal(reduceSpaceState(initial, { type: 'PLAY' }).playing, true);
});

test('disables unavailable services honestly', () => {
  const initial = createInitialState({ tracks: [], visitorStatus: 'disabled', commentsStatus: 'disabled' });
  assert.equal(initial.musicStatus, 'missing');
  assert.equal(initial.visitorStatus, 'disabled');
  assert.equal(initial.commentsStatus, 'disabled');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="music|services honestly"`

Expected: FAIL，错误包含 `createInitialState is not a function`。

- [ ] **Step 3: 实现纯状态层**

`source/js/scrapbook-space.js` 使用 UMD 形式，使 Node 测试可 `require()`，浏览器可挂载：

```js
function createInitialState(config = {}) {
  return {
    open: false,
    playing: false,
    trackIndex: 0,
    volume: Number.isFinite(config.volume) ? config.volume : 0.7,
    musicStatus: config.tracks?.length ? 'ready' : 'missing',
    visitorStatus: config.visitorStatus || 'disabled',
    commentsStatus: config.commentsStatus || 'disabled'
  };
}

function reduceSpaceState(state, event) {
  if (event.type === 'OPEN_PANEL') return { ...state, open: true };
  if (event.type === 'CLOSE_PANEL') return { ...state, open: false };
  if (event.type === 'PLAY' && state.musicStatus === 'ready') return { ...state, playing: true };
  if (event.type === 'PAUSE') return { ...state, playing: false };
  if (event.type === 'SET_VOLUME') return { ...state, volume: Math.max(0, Math.min(1, event.value)) };
  return state;
}
```

- [ ] **Step 4: 实现 DOM 绑定与持久化**

实现 `mountSpaceTools(document, storage)`：读取 `scrapbook-theme` 和 `scrapbook-volume`；绑定展开、关闭、播放、暂停、音量、主题和返回顶部；按 Escape 关闭面板；更新 `aria-expanded`、`aria-pressed` 与 `[aria-live="polite"]`。只有处理用户 `PLAY` 点击时才调用 `audio.play()`。

- [ ] **Step 5: 完成首页工具盒 markup 与缺失状态**

在 `renderSpaceDock` 输出播放器、访问、留言和返回顶部按钮。曲目为空时：播放器按钮 `disabled`，可见文本为“音乐暂未放入”；访问未启用显示“访问统计未启用”；留言未启用显示“留言板暂未启用”。

- [ ] **Step 6: 运行测试、构建并提交**

Run: `npm run verify`

Expected: PASS；构建后的首页包含 `scrapbook-space.js`，并且 HTML 中不存在 `autoplay`。

```bash
git add source/js/scrapbook-space.js test/scrapbook-space.test.js scripts/scrapbook/render-home.js
git commit -m "feat: add accessible space toolbox"
```

---

### Task 5: Stellar 文章页的手账阅读皮肤

**Files:**
- Create: `source/css/scrapbook-article.css`
- Modify: `_config.stellar.yml`
- Modify: `source/js/scrapbook-space.js`
- Modify: `test/scrapbook-space.test.js`

**Interfaces:**
- Consumes: Stellar 的 `.l_body[layout="post"]`、`.l_main`、`article.md-text`、`.widgets`、`pre` 与目录结构。
- Produces: `shouldMountArticleTools(layout, mounted): boolean`、`mountArticleTools(document)`；文章页工具盒挂载点与阅读皮肤。

- [ ] **Step 1: 写文章增强失败测试**

给 `test/scrapbook-space.test.js` 增加纯判断测试，锁定只有未挂载的文章布局才允许插入工具盒：

```js
test('mounts article tools only once on post layouts', () => {
  assert.equal(shouldMountArticleTools('post', false), true);
  assert.equal(shouldMountArticleTools('post', true), false);
  assert.equal(shouldMountArticleTools('page', false), false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="article tools once"`

Expected: FAIL，错误包含 `mountArticleTools is not a function`。

- [ ] **Step 3: 注入站点级文章资源**

将 `_config.stellar.yml` 的 `inject` 更新为：

```yaml
inject:
  head:
    - '<link rel="stylesheet" href="/css/scrapbook-tokens.css">'
    - '<link rel="stylesheet" href="/css/scrapbook-article.css">'
  script:
    - '<script src="/js/scrapbook-space.js" defer></script>'
```

移除旧的 `/css/custom.css` 注入，但暂不删除文件，便于对比和回退。

- [ ] **Step 4: 实现文章页皮肤**

`source/css/scrapbook-article.css` 仅在 `.l_body[layout="post"]` 和内容页面范围内覆盖：背景使用点阵手账纸；`article.md-text` 使用 `--sb-white`、稳定最大宽度与水平排版；目录保持 sticky；代码块使用深紫高对比；胶带只通过文章容器伪元素绘制；移动端取消目录 sticky 并保证单栏。

- [ ] **Step 5: 实现文章工具盒挂载**

实现 `shouldMountArticleTools(layout, mounted) { return layout === 'post' && mounted === false; }`。在 `mountArticleTools(document)` 中读取 `.l_body` 的 `layout` 和 `data-scrapbook-mounted`，仅在判断结果为真时创建与首页相同 `data-space-dock` 协议的音乐、目录、返回顶部按钮，并设置 `data-scrapbook-mounted="true"` 防止 PJAX 或重复初始化造成重复节点。

- [ ] **Step 6: 测试、构建并提交**

Run: `npm run verify`

Expected: PASS；`public/2026/07/24/ue-submit-render-farm/index.html` 包含文章样式与工具盒脚本引用。

```bash
git add _config.stellar.yml source/css/scrapbook-article.css source/js/scrapbook-space.js test/scrapbook-space.test.js
git commit -m "style: add scrapbook article reading mode"
```

---

### Task 6: 搜索、分类、项目与内容降级

**Files:**
- Modify: `scripts/scrapbook/render-home.js`
- Modify: `scripts/scrapbook/model.js`
- Modify: `source/js/scrapbook-space.js`
- Modify: `test/scrapbook-model.test.js`
- Modify: `test/scrapbook-render.test.js`
- Modify: `source/projects/index.md`

**Interfaces:**
- Consumes: Stellar 本地搜索页 `/search.json`、Hexo 分类 URL、精选文章 slug。
- Produces: `[data-search-panel]` 本地搜索界面、有效分类/项目入口和明确空状态。

- [ ] **Step 1: 写链接与降级失败测试**

增加测试，验证分类票根指向 `/categories/<encoded-name>/`；学习中分类带 `aria-disabled="true"` 且不是空链接；项目缺失时显示“项目整理中”；搜索按钮提供 `aria-controls="search-panel"`，空查询不触发跳转。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="category|project|search"`

Expected: 至少一项 FAIL，指出缺失的 URL、状态或搜索控件。

- [ ] **Step 3: 实现搜索面板和分类导航**

首页搜索面板包含 `<input type="search">`、结果容器和关闭按钮。脚本加载 `/search.json` 后在本地按标题与正文匹配，最多显示 8 条；网络或解析失败时显示“搜索索引暂不可用，请浏览技术分类”。Escape 关闭并把焦点还给搜索按钮。

- [ ] **Step 4: 更新项目页内容边界**

将 `source/projects/index.md` 的首页重复介绍收敛为两个真实项目入口：UE Movie Render Pipeline 提交面板、Maya 资产批量提交工具。保留现有工作项目与技能栈，但不声称不存在的代码仓库或演示链接。

- [ ] **Step 5: 验证并提交内容集成**

Run: `npm run verify`

Expected: PASS；`public/search.json` 存在；首页五个分类都有可解释状态；项目入口均能在构建产物中找到目标页面。

```bash
git add scripts/scrapbook/render-home.js scripts/scrapbook/model.js source/js/scrapbook-space.js test/scrapbook-model.test.js test/scrapbook-render.test.js source/projects/index.md
git commit -m "feat: connect scrapbook navigation and search"
```

---

### Task 7: 构建产物、响应式与无障碍验收

**Files:**
- Modify: `source/css/scrapbook-home.css`
- Modify: `source/css/scrapbook-article.css`
- Modify: `source/js/scrapbook-space.js`
- Create: `docs/qa/scrapbook-blog-checklist.md`

**Interfaces:**
- Consumes: Tasks 1–6 的完整站点。
- Produces: 可发布构建、桌面与移动端截图、已记录的验收结果。

- [ ] **Step 1: 执行自动验证**

Run: `npm run verify`

Expected: 所有 Node 测试 PASS，Hexo generate 无 ERROR，`public/index.html`、`public/blog/index.html`、两篇 Pipeline 文章和 CSS/JS 静态资源均存在。

- [ ] **Step 2: 启动本地站点并检查关键路径**

Run: `npm run server`

依次打开 `/`、`/blog/`、`/projects/`、`/2026/07/24/ue-submit-render-farm/`、`/2026/07/23/maya-asset-batch-submit/`。确认首页不是 Stellar 默认列表，文章仍由 Stellar 渲染。

- [ ] **Step 3: 检查五个视口**

在 1440×900、1024×768、768×1024、390×844、320×568 截图。检查：无横向滚动；胶带不遮字；票根可点；工具盒不遮正文；手机 DOM 顺序为定位、文章、分类、项目、个人、访客、留言。

- [ ] **Step 4: 完成键盘与状态验收**

只用键盘完成：跳过导航、打开/关闭搜索、选择分类、展开工具盒、尝试缺失音乐、切换主题和返回顶部。验证焦点可见、Escape 归还焦点、无音乐时不能触发播放、页面没有 `autoplay`。

- [ ] **Step 5: 检查视觉与降级状态**

分别启用浅色、夜间手账、`prefers-reduced-motion: reduce`；临时将搜索索引 URL 改为不存在路径验证错误便签；确认访问与留言均显示未启用，而不是假数字或空面板。完成后恢复正确搜索 URL。

- [ ] **Step 6: 记录验收结果并修正问题**

创建 `docs/qa/scrapbook-blog-checklist.md`，逐项记录上述视口、键盘、主题、减少动态效果、搜索失败、音乐缺失、访问禁用和留言禁用的 PASS/FAIL。任何 FAIL 必须先在对应 CSS/JS 中修复，再重新运行 `npm run verify` 并复测该项。

- [ ] **Step 7: 最终提交**

Run: `git diff --check && git status --short`

Expected: 无空白错误；只包含本改版相关文件，用户已有 `.workbuddy/memory/2026-07-24.md` 改动保持未暂存。

```bash
git add source/css/scrapbook-home.css source/css/scrapbook-article.css source/js/scrapbook-space.js docs/qa/scrapbook-blog-checklist.md
git commit -m "test: verify scrapbook blog experience"
```
