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

function renderNavigation(model = {}, site = {}) {
  const brand = model.brand || site.title || '钱钱的小小世界';
  return `<header class="scrapbook-header">
    <div class="scrapbook-header__inner">
      <a class="scrapbook-brand" href="${hrefFor('')}">${escapeHtml(brand)}</a>
      <button class="scrapbook-nav-toggle" type="button" data-nav-toggle aria-controls="primary-navigation" aria-expanded="false">菜单</button>
    <nav id="primary-navigation" data-nav-menu data-mobile-collapsed="true" aria-label="主导航">
      <a href="${hrefFor('')}">主页</a>
      <a href="${hrefFor('blog/')}">技术日志</a>
      <a href="${hrefFor('projects/')}">项目相册</a>
      <a href="${hrefFor('about/')}">关于我</a>
      <a href="#space-message">留言板</a>
      <button type="button" data-search-open aria-controls="search-panel" aria-expanded="false">搜索</button>
      <button type="button" data-theme-toggle data-nav-theme aria-pressed="false">切换深色主题</button>
    </nav>
    </div>
  </header>`;
}

function renderSearchPanel() {
  return `<section id="search-panel" data-search-panel role="dialog" aria-labelledby="search-title" hidden>
    <h2 id="search-title">搜索笔记</h2>
    <form data-search-form role="search">
      <label for="scrapbook-search-input">关键词</label>
      <input id="scrapbook-search-input" type="search" data-search-input autocomplete="off">
      <button type="submit">查找</button>
    </form>
    <p data-search-status aria-live="polite">输入关键词，按标题与正文查找笔记</p>
    <div data-search-results></div>
    <button type="button" data-search-close>关闭搜索</button>
  </section>`;
}

function renderHero(model) {
  const profile = model.profile || {};
  const status = model.status || {};
  const brand = model.brand || '钱钱的小小世界';

  return `<section class="scrapbook-hero" aria-labelledby="hero-title">
    <span class="scrapbook-hero__mark" aria-hidden="true">✦</span>
    <p class="scrapbook-hero__eyebrow">QIANQIAN'S LITTLE WORLD</p>
    <h1 id="hero-title">${escapeHtml(brand)}</h1>
    <p class="scrapbook-hero__tagline">${escapeHtml(model.tagline)}</p>
    <p class="scrapbook-hero__role">${escapeHtml(profile.role)}</p>
    <p class="scrapbook-hero__direction">${escapeHtml(profile.direction)}</p>
    <p class="scrapbook-hero__status">${escapeHtml(status.text)}</p>
    <div class="pixel-game" data-pixel-game>
      <div class="pixel-controls" aria-label="像素跳跃游戏控制">
        <button type="button" data-game-start>开始游戏</button>
        <button type="button" data-game-jump hidden>跳跃 ↑</button>
        <button type="button" data-game-exit hidden>退出</button>
        <span class="pixel-score" data-game-score>SCORE 00</span>
      </div>
      <p class="pixel-hint" data-game-hint role="status">小蘑菇跳一跳 · 越过砖块得分 · 无音效</p>
      <div class="pixel-scene" data-runner="idle" aria-label="蘑菇像素世界">
        <span class="pixel-sprite pixel-mushroom" data-pixel-art="mushroom" aria-hidden="true"></span>
        <span class="pixel-sprite pixel-coin" data-pixel-art="coin" aria-hidden="true"></span>
        <button class="pixel-block" type="button" aria-label="敲一下问号砖块">?</button>
        <span class="pixel-sprite pixel-star" data-pixel-art="star" aria-hidden="true"></span>
        <span class="pixel-sprite pixel-cloud" data-pixel-art="cloud" aria-hidden="true"></span>
        <div class="pixel-obstacle" aria-hidden="true"></div><div class="pixel-ground" aria-hidden="true"></div>
      </div>
    </div>
  </section>`;
}

function renderPositioning(model) {
  const profile = model.profile || {};
  return `<section class="scrapbook-card scrapbook-positioning" data-grid-area="positioning" aria-labelledby="positioning-title">
    <h2 id="positioning-title">把流程经验变成可复用工具</h2>
    <p>${escapeHtml(model.tagline || '记录流程开发、工具实践与学习进度。')}</p>
    <p>${escapeHtml(profile.direction || profile.role || 'Pipeline TD')}</p>
    <div class="scrapbook-positioning__actions">
      <a href="${hrefFor('blog/')}">浏览技术日志</a>
      <a href="${hrefFor('projects/')}">查看项目相册</a>
    </div>
  </section>`;
}

function renderProfile(model) {
  const profile = model.profile || {};

  return `<section class="scrapbook-card scrapbook-profile profile-polaroid" data-grid-area="profile" aria-labelledby="profile-title">
    <span class="pixel-sprite" data-pixel-art="mushroom" aria-hidden="true"></span>
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

  return `<section class="scrapbook-card scrapbook-categories" data-grid-area="categories" aria-labelledby="categories-title">
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
    ? posts.map(post => {
      const tags = (post.tags || []).slice(0, 3);
      return `<li class="post-note">
        <div class="post-note__meta">
          <span class="post-note__category">${escapeHtml(post.category || '未分类')}</span>
        <time datetime="${escapeHtml(formatDate(post.date))}">${escapeHtml(formatDate(post.date))}</time>
        </div>
        <a class="post-note__title" href="${hrefFor(post.path)}">${escapeHtml(post.title || '未命名文章')}</a>
        <p class="post-note__excerpt">${escapeHtml(post.excerpt || '这篇笔记暂未提供摘要。')}</p>
        ${tags.length ? `<ul class="post-note__tags" aria-label="文章标签">${tags.map(tag => `<li class="post-note__tag">${escapeHtml(tag)}</li>`).join('')}</ul>` : ''}
      </li>`;
    }).join('')
    : '<li class="scrapbook-empty">还没有公开文章</li>';

  return `<section class="scrapbook-card scrapbook-post-notes" data-grid-area="posts" aria-labelledby="posts-title">
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
        ${project.techStack?.length ? `<p class="project-photo__stack">${escapeHtml(project.techStack.join(' · '))}</p>` : ''}
      </li>`).join('')
    : '<li class="scrapbook-empty">项目整理中</li>';

  return `<section class="scrapbook-card scrapbook-project-photos" data-grid-area="projects" aria-labelledby="projects-title">
    <h2 id="projects-title">精选项目</h2>
    <ul>${photos}</ul>
    <a class="scrapbook-more-link" href="${hrefFor('projects/')}">查看项目页</a>
  </section>`;
}

function renderVisitorCard(model) {
  const visitor = model.space?.visitor || {};
  const enabled = visitor.status === 'enabled' && Boolean(visitor.href);
  return `<section class="scrapbook-card scrapbook-visitor" data-grid-area="visitor" aria-labelledby="home-visitor-title">
    <h2 id="home-visitor-title">最近访客</h2>
    <p>${enabled ? '访问服务已启用，可查看真实记录。' : '访问统计未启用'}</p>
    ${enabled ? `<a href="${hrefFor(visitor.href)}">查看访问统计</a>` : ''}
  </section>`;
}

function renderMessageStatus(model) {
  const comments = model.space?.comments || {};
  const enabled = comments.status === 'enabled' && Boolean(comments.href);
  return `<section id="space-message" class="scrapbook-card scrapbook-message" data-grid-area="message" aria-labelledby="home-message-title">
    <h2 id="home-message-title">留言与今日状态</h2>
    <p>${escapeHtml(model.status?.text || '持续整理 Pipeline 笔记')}</p>
    ${enabled
    ? `<a href="${hrefFor(comments.href)}">打开留言板</a>`
    : `<p>留言服务暂未配置，可先从<a href="${hrefFor('about/')}">关于我</a>了解联系信息。</p>`}
  </section>`;
}

function renderScrapbookGrid(model) {
  return `<div class="scrapbook-grid">
    ${renderPositioning(model)}
    ${renderPostNotes(model)}
    ${renderCategoryTickets(model)}
    ${renderProjectPhotos(model)}
    ${renderProfile(model)}
    ${renderVisitorCard(model)}
    ${renderMessageStatus(model)}
  </div>`;
}

function renderSpaceDock(space = {}) {
  const music = space.music || {};
  const tracks = music.tracks || [];
  const visitor = space.visitor || {};
  const visitorEnabled = visitor.status === 'enabled' && Boolean(visitor.href);
  const comments = space.comments || {};
  const commentsEnabled = comments.status === 'enabled' && Boolean(comments.href);
  const firstTrack = tracks[0];
  const firstTrackSource = typeof firstTrack === 'string' ? firstTrack : firstTrack?.src;
  const trackList = tracks.length
    ? `<ul data-audio-playlist>${tracks.map(track => {
      const title = typeof track === 'string' ? track : track.title || track.name || track.src;
      const source = typeof track === 'string' ? track : track.src;
      return `<li data-audio-track="" data-track-title="${escapeHtml(title)}" data-track-src="${hrefFor(source)}">${escapeHtml(title)}</li>`;
    }).join('')}</ul>`
    : '<p>音乐暂未放入</p>';
  const audio = firstTrackSource
    ? `<audio data-audio preload="none" src="${hrefFor(firstTrackSource)}"></audio>`
    : '';
  const visitorEntry = visitorEnabled
    ? `<a data-visitor-entry href="${hrefFor(visitor.href)}">查看访问统计</a>`
    : '<button type="button" data-visitor-entry disabled>查看访问统计</button>';
  const commentsEntry = commentsEnabled
    ? `<a data-comments-entry href="${hrefFor(comments.href)}">打开留言</a>`
    : '<button type="button" data-comments-entry disabled>打开留言</button>';

  return `<button class="scrapbook-space-toggle" type="button" data-space-dock aria-controls="space-tools-panel" aria-expanded="false" aria-label="打开空间工具盒"><span class="pocket-label" aria-hidden="true">POCKET · 小小休息站</span><span class="pocket-screen">打开空间工具盒</span><span class="pocket-keys" aria-hidden="true"><span>✚</span><span>● B　● A</span></span></button>
  <aside id="space-tools-panel" class="scrapbook-space-dock space-dock" data-space-panel data-visitor-status="${visitorEnabled ? 'enabled' : 'disabled'}" data-comments-status="${commentsEnabled ? 'enabled' : 'disabled'}" aria-label="个人空间工具盒" hidden>
    <section aria-labelledby="music-title">
      <h2 id="music-title">音乐角</h2>
      ${trackList}
      ${audio}
      <p data-audio-title>${tracks.length ? escapeHtml(typeof firstTrack === 'string' ? firstTrack : firstTrack.title || firstTrack.name || firstTrack.src) : '暂无曲目'}</p>
      <button type="button" data-audio-previous ${tracks.length > 1 ? '' : 'disabled'}>上一首</button>
      <button type="button" data-audio-toggle aria-pressed="false" ${tracks.length ? '' : 'disabled'}>${tracks.length ? '播放' : '音乐暂未放入'}</button>
      <button type="button" data-audio-next ${tracks.length > 1 ? '' : 'disabled'}>下一首</button>
      <label>音量 <input type="range" data-audio-volume min="0" max="1" step="0.05" value="0.7" ${tracks.length ? '' : 'disabled'}></label>
      <p data-space-status aria-live="polite">${tracks.length ? '音乐已就绪' : '音乐暂未放入'}</p>
    </section>
    <section aria-labelledby="visitor-title">
      <h2 id="visitor-title">访问统计</h2>
      <p>${visitorEnabled ? '访问统计已启用' : '访问统计未启用'}</p>
      ${visitorEntry}
    </section>
    <section aria-labelledby="comments-title">
      <h2 id="comments-title">留言</h2>
      <p>${commentsEnabled ? '留言板已启用' : '留言板暂未启用'}</p>
      ${commentsEntry}
      <button type="button" data-theme-toggle aria-pressed="false">切换深色主题</button>
      <button type="button" data-scroll-top hidden>返回顶部</button>
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
  <link rel="stylesheet" href="/css/scrapbook-home.css">
  <link rel="stylesheet" href="/css/pixel-world.css"></head>
  <body class="scrapbook-home"><a class="skip-link" href="#main">跳到主要内容</a>
  ${renderNavigation(safeModel, safeSite)}${renderSearchPanel()}<main id="main">${renderHero(safeModel)}${renderScrapbookGrid(safeModel)}</main>
  ${renderSpaceDock(safeModel.space)}<script src="/js/pixel-world.js" defer></script><script src="/js/scrapbook-space.js" defer></script></body></html>`;
}

module.exports = {
  renderNavigation,
  renderSearchPanel,
  renderSpaceDock,
  renderHome
};
