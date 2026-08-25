const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[char]));

const urlFor = path => '/' + String(path ?? '')
  .replace(/^\/+/, '')
  .split('/')
  .map(segment => encodeURIComponent(segment))
  .join('/');

const hrefFor = path => escapeHtml(urlFor(path));

function renderNavigation() {
  return `<header class="scrapbook-header">
    <nav aria-label="主导航">
      <a href="${hrefFor('')}">首页</a>
      <a href="${hrefFor('blog/')}">博客</a>
      <a href="${hrefFor('projects/')}">项目</a>
      <a href="${hrefFor('about/')}">关于</a>
      <button type="button" data-search-open aria-controls="search-panel" aria-expanded="false">搜索</button>
    </nav>
  </header>`;
}

function renderSearchPanel() {
  return `<section id="search-panel" data-search-panel role="dialog" aria-labelledby="search-title" hidden>
    <h2 id="search-title">搜索手账</h2>
    <form data-search-form role="search">
      <label for="scrapbook-search-input">关键词</label>
      <input id="scrapbook-search-input" type="search" data-search-input autocomplete="off">
      <button type="submit">查找</button>
    </form>
    <div data-search-results aria-live="polite">输入关键词，按标题与正文查找笔记</div>
    <button type="button" data-search-close>关闭搜索</button>
  </section>`;
}

function renderHero(model) {
  const profile = model.profile || {};
  const status = model.status || {};

  return `<section class="scrapbook-hero" aria-labelledby="hero-title">
    <span class="scrapbook-hero__mark" aria-hidden="true">✦</span>
    <p class="scrapbook-hero__eyebrow">Pipeline 手账</p>
    <h1 id="hero-title">${escapeHtml(profile.name || '我的 Pipeline 手账')}</h1>
    <p class="scrapbook-hero__role">${escapeHtml(profile.role)}</p>
    <p class="scrapbook-hero__status">${escapeHtml(status.text)}</p>
  </section>`;
}

function renderProfile(model) {
  const profile = model.profile || {};

  return `<section class="scrapbook-card scrapbook-profile profile-polaroid" aria-labelledby="profile-title">
    <h2 id="profile-title">个人档案</h2>
    <dl>
      <div><dt>身份</dt><dd>${escapeHtml(profile.role || '未填写')}</dd></div>
      <div><dt>经验</dt><dd>${escapeHtml(profile.experience || '持续积累中')}</dd></div>
    </dl>
  </section>`;
}

function renderCategoryTickets(model) {
  const categories = model.categories || [];
  const tickets = categories.length
    ? categories.map(category => {
      const categoryPath = hrefFor(category.path || `categories/${category.name}/`);
      const label = category.status === 'ready'
        ? `<a href="${categoryPath}">${escapeHtml(category.name)}</a>`
        : `<span class="category-ticket__label" aria-disabled="true" data-category-path="${categoryPath}">${escapeHtml(category.name)}</span>`;
      return `<li class="scrapbook-category-ticket category-ticket scrapbook-category-ticket--${escapeHtml(category.status || 'learning')}">
        ${label}
        <span class="category-ticket__count">${escapeHtml(category.count)} 篇</span>
        <small>${category.status === 'ready' ? '已有笔记' : '学习中'}</small>
      </li>`;
    }).join('')
    : '<li class="scrapbook-empty">暂无分类记录</li>';

  return `<section class="scrapbook-card scrapbook-categories" aria-labelledby="categories-title">
    <h2 id="categories-title">学习分类</h2>
    <ul>${tickets}</ul>
  </section>`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function renderPostNotes(model) {
  const posts = model.latestPosts || [];
  const notes = posts.length
    ? posts.map(post => `<li class="post-note">
        <a href="${hrefFor(post.path)}">${escapeHtml(post.title || '未命名文章')}</a>
        <time datetime="${escapeHtml(formatDate(post.date))}">${escapeHtml(formatDate(post.date))}</time>
      </li>`).join('')
    : '<li class="scrapbook-empty">还没有公开文章</li>';

  return `<section class="scrapbook-card scrapbook-post-notes" aria-labelledby="posts-title">
    <h2 id="posts-title">最新笔记</h2>
    <ol>${notes}</ol>
    <a class="scrapbook-more-link" href="${hrefFor('blog/')}">查看全部文章</a>
  </section>`;
}

function renderProjectPhotos(model) {
  const projects = model.featuredProjects || [];
  const photos = projects.length
    ? projects.map(project => `<li class="project-photo">
        <a href="${hrefFor(project.path)}">${escapeHtml(project.title || project.slug || '未命名项目')}</a>
      </li>`).join('')
    : '<li class="scrapbook-empty">项目整理中</li>';

  return `<section class="scrapbook-card scrapbook-project-photos" aria-labelledby="projects-title">
    <h2 id="projects-title">精选项目</h2>
    <ul>${photos}</ul>
    <a class="scrapbook-more-link" href="${hrefFor('projects/')}">查看项目页</a>
  </section>`;
}

function renderScrapbookGrid(model) {
  return `<div class="scrapbook-grid">
    ${renderProfile(model)}
    ${renderCategoryTickets(model)}
    ${renderPostNotes(model)}
    ${renderProjectPhotos(model)}
  </div>`;
}

function renderSpaceDock(space = {}) {
  const music = space.music || {};
  const tracks = music.tracks || [];
  const visitor = space.visitor || {};
  const visitorEnabled = visitor.status === 'enabled' && Boolean(visitor.href);
  const commentsEnabled = space.comments?.status === 'enabled';
  const firstTrack = tracks[0];
  const firstTrackSource = typeof firstTrack === 'string' ? firstTrack : firstTrack?.src;
  const trackList = tracks.length
    ? `<ul>${tracks.map(track => `<li>${escapeHtml(track.title || track.name || track.src || track)}</li>`).join('')}</ul>`
    : '<p>音乐暂未放入</p>';
  const audio = firstTrackSource
    ? `<audio data-audio preload="none" src="${escapeHtml(firstTrackSource)}"></audio>`
    : '';
  const visitorEntry = visitorEnabled
    ? `<a data-visitor-entry href="${hrefFor(visitor.href)}">查看访问统计</a>`
    : '<button type="button" data-visitor-entry disabled>查看访问统计</button>';

  return `<button class="scrapbook-space-toggle" type="button" data-space-dock aria-controls="space-tools-panel" aria-expanded="false">打开空间工具盒</button>
  <aside id="space-tools-panel" class="scrapbook-space-dock space-dock" data-space-panel data-visitor-status="${visitorEnabled ? 'enabled' : 'disabled'}" data-comments-status="${commentsEnabled ? 'enabled' : 'disabled'}" aria-label="个人空间工具盒" hidden>
    <section aria-labelledby="music-title">
      <h2 id="music-title">音乐角</h2>
      ${trackList}
      ${audio}
      <button type="button" data-audio-toggle aria-pressed="false" ${tracks.length ? '' : 'disabled'}>${tracks.length ? '播放' : '音乐暂未放入'}</button>
      <label>音量 <input type="range" data-audio-volume min="0" max="1" step="0.05" value="0.7" ${tracks.length ? '' : 'disabled'}></label>
      <p aria-live="polite">${tracks.length ? '音乐已就绪' : '音乐暂未放入'}</p>
    </section>
    <section aria-labelledby="visitor-title">
      <h2 id="visitor-title">访问统计</h2>
      <p>${visitorEnabled ? '访问统计已启用' : '访问统计未启用'}</p>
      ${visitorEntry}
    </section>
    <section aria-labelledby="comments-title">
      <h2 id="comments-title">留言</h2>
      <p>${commentsEnabled ? '留言板已启用' : '留言板暂未启用'}</p>
      <button type="button" ${commentsEnabled ? '' : 'disabled'}>打开留言</button>
      <button type="button" data-theme-toggle aria-pressed="false">切换深色主题</button>
      <button type="button" data-scroll-top>返回顶部</button>
      <button type="button" data-space-close>关闭工具盒</button>
    </section>
  </aside>`;
}

function renderHome(model, site) {
  const safeModel = model || {};
  const safeSite = site || {};

  return `<!doctype html><html lang="zh-CN" data-theme="light">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(safeSite.title)}</title>
  <link rel="stylesheet" href="/css/scrapbook-tokens.css">
  <link rel="stylesheet" href="/css/scrapbook-home.css"></head>
  <body class="scrapbook-home"><a class="skip-link" href="#main">跳到主要内容</a>
  ${renderNavigation(safeSite)}${renderSearchPanel()}<main id="main">${renderHero(safeModel)}${renderScrapbookGrid(safeModel)}</main>
  ${renderSpaceDock(safeModel.space)}<script src="/js/scrapbook-space.js" defer></script></body></html>`;
}

module.exports = {
  escapeHtml,
  urlFor,
  hrefFor,
  renderNavigation,
  renderSearchPanel,
  renderHero,
  renderScrapbookGrid,
  renderProfile,
  renderCategoryTickets,
  renderPostNotes,
  renderProjectPhotos,
  renderSpaceDock,
  renderHome
};
