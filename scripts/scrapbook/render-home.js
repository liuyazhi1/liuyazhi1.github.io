const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[char]));

const urlFor = path => '/' + String(path || '').replace(/^\/+/, '');

function renderNavigation() {
  return `<header class="scrapbook-header">
    <nav aria-label="主导航">
      <a href="${urlFor('')}">首页</a>
      <a href="${urlFor('blog/')}">博客</a>
      <a href="${urlFor('projects/')}">项目</a>
      <a href="${urlFor('about/')}">关于</a>
    </nav>
  </header>`;
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

  return `<section class="scrapbook-card scrapbook-profile" aria-labelledby="profile-title">
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
    ? categories.map(category => `<li class="scrapbook-category-ticket scrapbook-category-ticket--${escapeHtml(category.status || 'learning')}">
        <a href="${urlFor(`categories/${category.name}/`)}">${escapeHtml(category.name)}</a>
        <span>${escapeHtml(category.count)} 篇</span>
        <small>${category.status === 'ready' ? '已有笔记' : '学习中'}</small>
      </li>`).join('')
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
    ? posts.map(post => `<li>
        <a href="${urlFor(post.path)}">${escapeHtml(post.title || '未命名文章')}</a>
        <time datetime="${escapeHtml(formatDate(post.date))}">${escapeHtml(formatDate(post.date))}</time>
      </li>`).join('')
    : '<li class="scrapbook-empty">还没有公开文章</li>';

  return `<section class="scrapbook-card scrapbook-post-notes" aria-labelledby="posts-title">
    <h2 id="posts-title">最新笔记</h2>
    <ol>${notes}</ol>
    <a class="scrapbook-more-link" href="${urlFor('blog/')}">查看全部文章</a>
  </section>`;
}

function renderProjectPhotos(model) {
  const projects = model.featuredProjects || [];
  const photos = projects.length
    ? projects.map(project => `<li>
        <a href="${urlFor(project.path)}">${escapeHtml(project.title || project.slug || '未命名项目')}</a>
      </li>`).join('')
    : '<li class="scrapbook-empty">精选项目正在整理</li>';

  return `<section class="scrapbook-card scrapbook-project-photos" aria-labelledby="projects-title">
    <h2 id="projects-title">精选项目</h2>
    <ul>${photos}</ul>
    <a class="scrapbook-more-link" href="${urlFor('projects/')}">查看项目页</a>
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
  const visitorEnabled = space.visitor?.status === 'enabled';
  const commentsEnabled = space.comments?.status === 'enabled';
  const trackList = tracks.length
    ? `<ul>${tracks.map(track => `<li>${escapeHtml(track.title || track.name || track)}</li>`).join('')}</ul>`
    : '<p>音乐播放列表暂未配置</p>';

  return `<aside class="scrapbook-space-dock" aria-label="个人空间">
    <section aria-labelledby="music-title">
      <h2 id="music-title">音乐角</h2>
      ${trackList}
      <button type="button" aria-label="播放或暂停音乐">播放</button>
    </section>
    <section aria-labelledby="visitor-title">
      <h2 id="visitor-title">访问统计</h2>
      <p>${visitorEnabled ? '访问统计已启用' : '访问统计未启用'}</p>
    </section>
    <section aria-labelledby="comments-title">
      <h2 id="comments-title">留言</h2>
      <p>${commentsEnabled ? '评论服务已启用' : '评论未启用'}</p>
      <button type="button" ${commentsEnabled ? '' : 'disabled'}>打开留言</button>
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
  ${renderNavigation(safeSite)}<main id="main">${renderHero(safeModel)}${renderScrapbookGrid(safeModel)}</main>
  ${renderSpaceDock(safeModel.space)}<script src="/js/scrapbook-space.js" defer></script></body></html>`;
}

module.exports = {
  escapeHtml,
  urlFor,
  renderNavigation,
  renderHero,
  renderScrapbookGrid,
  renderProfile,
  renderCategoryTickets,
  renderPostNotes,
  renderProjectPhotos,
  renderSpaceDock,
  renderHome
};
