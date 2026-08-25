const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { renderHome } = require('../scripts/scrapbook/render-home');
const { buildHomeModel } = require('../scripts/scrapbook/model');
const { filterSearchEntries, mountSearch } = require('../source/js/scrapbook-space');

const relativeLuminance = hex => {
  const channels = hex.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
};

const contrastRatio = (foreground, background) => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

test('renders semantic scrapbook homepage and escapes content', () => {
  const html = renderHome({
    profile: { name: '钱钱', role: 'Pipeline TD' },
    status: { text: '学习中' },
    categories: [{ name: 'Maya', count: 1, status: 'ready' }],
    latestPosts: [{ title: '<script>alert(1)</script>', path: 'maya/', date: new Date('2026-07-23') }],
    featuredProjects: [{ title: 'Maya 资产工具', path: 'projects/maya-asset-tool/' }],
    space: { music: { tracks: [] }, visitor: { status: 'disabled' }, comments: { status: 'disabled' } }
  }, { title: '钱钱的博客', root: '/' });

  assert.match(html, /<main/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /aria-label="主导航"/);
  assert.match(html, /href="\/maya\/"/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /访问统计未启用/);
  assert.match(html, /href="\/css\/scrapbook-tokens\.css"/);
  assert.match(html, /href="\/css\/scrapbook-home\.css"/);
  assert.match(html, /class="[^"]*profile-polaroid/);
  assert.match(html, /class="[^"]*category-ticket/);
  assert.match(html, /<li class="project-photo">\s*<a href="\/projects\/maya-asset-tool\/">Maya 资产工具<\/a>/);
  assert.match(html, /class="[^"]*space-dock/);
  assert.ok(
    html.indexOf('scrapbook-post-notes') < html.indexOf('scrapbook-categories')
      && html.indexOf('scrapbook-categories') < html.indexOf('scrapbook-project-photos')
      && html.indexOf('scrapbook-project-photos') < html.indexOf('profile-polaroid'),
    'mobile DOM order keeps articles, categories, projects, then profile'
  );
});

test('renders the approved brand hero and complete responsive navigation', () => {
  const html = renderHome({
    brand: '钱钱的 Pipeline 手账',
    tagline: '今天也在把麻烦的制作流程，变成顺手的小工具。',
    profile: {
      role: 'Pipeline TD',
      direction: 'Maya、Unreal、Deadline、Omniverse 与数据库流程开发'
    },
    status: { text: '正在学习 Omniverse 与数据库' },
    space: {}
  }, { title: '钱钱的 Pipeline 手账' });

  assert.match(html, /<a[^>]*class="scrapbook-brand"[^>]*href="\/"[^>]*>钱钱的 Pipeline 手账<\/a>/);
  assert.match(html, /<h1[^>]*>钱钱的 Pipeline 手账<\/h1>/);
  assert.match(html, /今天也在把麻烦的制作流程，变成顺手的小工具。/);
  assert.match(html, /Pipeline TD/);
  assert.match(html, /Maya、Unreal、Deadline、Omniverse 与数据库流程开发/);
  assert.match(html, /正在学习 Omniverse 与数据库/);
  for (const label of ['主页', '技术日志', '项目相册', '关于我', '留言板', '搜索', '切换深色主题']) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /data-nav-toggle[^>]*aria-controls="primary-navigation"[^>]*aria-expanded="false"/);
  assert.match(html, /id="primary-navigation"[^>]*data-nav-menu/);
});

test('renders normalized post metadata, project stacks and explicit grid areas', () => {
  const model = buildHomeModel({
    posts: [{
      slug: 'ue-project',
      title: 'UE 提交面板',
      path: 'ue-project/',
      date: new Date('2026-08-25'),
      excerpt: '<p>把渲染提交变成稳定的工具流程。</p>',
      categories: [{ name: 'Unreal Engine' }],
      tags: [{ name: 'Pipeline' }, { name: 'Deadline' }, { name: 'Python' }, { name: '忽略' }]
    }],
    categories: []
  }, { scrapbook: {
    featured_projects: [{ slug: 'ue-project', tech_stack: ['Unreal Engine', 'Deadline', 'Python'] }],
    visitor: { enabled: false },
    comments: { enabled: false }
  }});
  const html = renderHome(model, { title: '测试站点' });

  assert.match(html, /class="post-note__category">Unreal Engine<\/span>/);
  assert.match(html, /class="post-note__excerpt">把渲染提交变成稳定的工具流程。<\/p>/);
  assert.equal((html.match(/class="post-note__tag"/g) || []).length, 3);
  assert.match(html, /class="project-photo__stack"[\s\S]*Unreal Engine · Deadline · Python/);
  const expectedOrder = ['positioning', 'posts', 'categories', 'projects', 'profile', 'visitor', 'message'];
  assert.deepEqual(
    [...html.matchAll(/data-grid-area="([^"]+)"/g)].map(match => match[1]),
    expectedOrder
  );
});

test('integrates enabled service and multi-track config through model and renderer', () => {
  const model = buildHomeModel({ posts: [], categories: [] }, { scrapbook: {
    music: { tracks: [
      { title: 'Track A', src: '/music/a.mp3' },
      { title: 'Track B', src: '/music/b.mp3' }
    ] },
    visitor: { enabled: true, href: '/visitors/' },
    comments: { enabled: true, href: '/comments/' }
  }});
  const html = renderHome(model, { title: '测试站点' });

  assert.match(html, /data-audio-previous/);
  assert.match(html, /data-audio-next/);
  assert.equal((html.match(/data-audio-track=/g) || []).length, 2);
  assert.match(html, /data-visitor-entry[^>]*href="\/visitors\/"/);
  assert.match(html, /data-comments-entry[^>]*href="\/comments\/"/);
  assert.match(html, /data-space-status[^>]*aria-live="polite"/);
  assert.match(html, /data-search-status[^>]*aria-live="polite"/);
});

test('keeps note and project fixtures attached to their visual CSS contracts', () => {
  const homeCss = readFileSync(join(__dirname, '../source/css/scrapbook-home.css'), 'utf8');
  const articleCss = readFileSync(join(__dirname, '../source/css/scrapbook-article.css'), 'utf8');

  assert.match(homeCss, /\.post-note\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
  assert.match(homeCss, /\.post-note__meta\s*\{[^}]*display:\s*flex;/s);
  assert.match(homeCss, /\.post-note:nth-child\(3n \+ 2\)\s*\{[^}]*background:\s*var\(--sb-pink\);/s);
  assert.match(homeCss, /\.project-photo\s*\{[^}]*min-height:\s*6\.5rem;[^}]*border:\s*0\.4rem solid var\(--sb-white\);/s);
  assert.match(homeCss, /\.project-photo a\s*\{[^}]*display:\s*grid;[^}]*min-height:\s*4\.8rem;/s);
  assert.match(homeCss, /\.scrapbook-project-photos ul\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
  assert.match(homeCss, /grid-template-areas:\s*"profile positioning projects"\s*"categories posts projects"\s*"visitor posts message";/s);
  assert.doesNotMatch(homeCss, /\.(?:profile-polaroid|scrapbook-categories|scrapbook-post-notes|scrapbook-project-photos)\s*\{[^}]*grid-(?:column|row):\s*[1-3]/s);
  assert.match(articleCss, /@media \(max-width:\s*1199\.98px\)\s*\{[\s\S]*?\.scrapbook-article-tools-toggle,[\s\S]*?\.scrapbook-article-tools\s*\{[^}]*position:\s*static;/s);
});

test('encodes unsafe paths before rendering href attributes', () => {
  const unsafePath = 'x" onclick="alert(1)';
  const html = renderHome({
    profile: {},
    status: {},
    categories: [{ name: unsafePath, count: 1, status: 'ready' }],
    latestPosts: [{ title: '文章', path: unsafePath, date: new Date('2026-07-23') }],
    featuredProjects: [{ title: '项目', path: unsafePath }],
    space: {}
  }, { title: '安全测试', root: '/' });

  assert.match(html, /href="\/x%22%20onclick%3D%22alert\(1\)"/);
  assert.match(html, /href="\/categories\/x%22%20onclick%3D%22alert\(1\)\//);
  assert.doesNotMatch(html, /href="[^\"]*"\s+onclick=/);
});

test('renders ready category links and non-interactive learning states', () => {
  const html = renderHome({
    categories: [
      { name: 'Unreal Engine', count: 1, status: 'ready', path: 'categories/Unreal-Engine/' },
      { name: '数据库', count: 0, status: 'learning' }
    ],
    featuredProjects: [],
    space: {}
  }, { title: '分类测试' });

  assert.match(html, /href="\/categories\/Unreal-Engine\/"[^>]*>Unreal Engine<\/a>/);
  assert.match(html, /<span[^>]*aria-disabled="true"[^>]*data-category-path="\/categories\/%E6%95%B0%E6%8D%AE%E5%BA%93\/"[^>]*>数据库<\/span>/);
  const learningTicket = html.match(/<li class="[^"]*--learning"[\s\S]*?<\/li>/)[0];
  assert.doesNotMatch(learningTicket, /<a\b|\bhref=/);
  assert.match(html, /项目整理中/);
});

test('renders an accessible local search panel', () => {
  const html = renderHome({ space: {} }, { title: '搜索测试' });

  assert.match(html, /<button[^>]*type="button"[^>]*data-search-open[^>]*aria-controls="search-panel"/);
  assert.match(html, /<section[^>]*id="search-panel"[^>]*data-search-panel[^>]*hidden/);
  assert.match(html, /<input[^>]*type="search"[^>]*data-search-input/);
  assert.match(html, /data-search-status[^>]*aria-live="polite"/);
  assert.match(html, /data-search-results/);
  assert.match(html, /<button[^>]*type="button"[^>]*data-search-close/);
});

test('styles search controls for theme, focus, constrained width and 320px layouts', () => {
  const homeCss = readFileSync(join(__dirname, '../source/css/scrapbook-home.css'), 'utf8');

  assert.match(homeCss, /\.scrapbook-header \[data-search-open\],[\s\S]*?\.scrapbook-nav-toggle\s*\{[^}]*background:\s*var\(--sb-pink\);/s);
  assert.match(homeCss, /\[data-search-panel\]\s*\{[^}]*width:\s*min\(36rem, calc\(100% - 2rem\)\);[^}]*background:[^;]*var\(--sb-white\)/s);
  assert.match(homeCss, /\.scrapbook-header \[data-search-open\]:focus-visible,\s*\[data-search-panel\] :focus-visible\s*\{[^}]*outline:\s*3px solid var\(--sb-focus\);/s);
  assert.match(homeCss, /@media \(max-width:\s*359\.98px\)\s*\{[\s\S]*?\[data-search-form\]\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
});

test('filters local search by title and body, caps results, and ignores an empty query', () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    title: index === 0 ? 'Maya 工具' : `文章 ${index}`,
    content: `Pipeline Maya 正文 ${index}`,
    path: `/post-${index}/`
  }));

  assert.deepEqual(filterSearchEntries(entries, '   '), []);
  assert.equal(filterSearchEntries(entries, 'maya').length, 8);
  assert.equal(filterSearchEntries(entries, '工具')[0].title, 'Maya 工具');
});

test('keeps empty search local and shows the explicit index failure note', async () => {
  const elements = new Map();
  const makeElement = properties => ({
    attributes: {},
    listeners: {},
    ...properties,
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; },
    focus() { this.focused = true; },
    dispatch(type, event = {}) {
      this.listeners[type]?.({ preventDefault() { event.prevented = true; }, target: this, ...event });
      return event;
    }
  });
  const open = makeElement({});
  const panel = makeElement({ hidden: true });
  const form = makeElement({});
  const input = makeElement({ value: '' });
  const results = makeElement({ textContent: '' });
  const status = makeElement({ textContent: '' });
  const close = makeElement({});
  elements.set('[data-search-open]', open);
  elements.set('[data-search-panel]', panel);
  elements.set('[data-search-form]', form);
  elements.set('[data-search-input]', input);
  elements.set('[data-search-results]', results);
  elements.set('[data-search-status]', status);
  elements.set('[data-search-close]', close);
  const document = {
    listeners: {},
    querySelector(selector) { return elements.get(selector) || null; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; }
  };
  const controller = mountSearch(document, async () => { throw new Error('offline'); });

  open.dispatch('click');
  const submitEvent = form.dispatch('submit');
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(submitEvent.prevented, true);
  assert.equal(panel.hidden, false);
  assert.equal(input.focused, true);
  assert.equal(results.textContent, '搜索索引暂不可用，请浏览技术分类');
  assert.equal(status.textContent, '搜索索引暂不可用，请浏览技术分类');
  document.listeners.keydown({ key: 'Escape' });
  assert.equal(panel.hidden, true);
  assert.equal(open.focused, true);
  controller.destroy();
});

test('mounts local search once and renders at most eight fetched matches', async () => {
  const makeElement = properties => ({
    attributes: {},
    listeners: {},
    children: [],
    textContent: '',
    ...properties,
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; },
    appendChild(child) { this.children.push(child); return child; },
    focus() {},
    dispatch(type, event = {}) {
      this.listeners[type]?.({ preventDefault() {}, target: this, ...event });
    }
  });
  const elements = {
    '[data-search-open]': makeElement({}),
    '[data-search-panel]': makeElement({ hidden: true }),
    '[data-search-form]': makeElement({}),
    '[data-search-input]': makeElement({ value: '' }),
    '[data-search-results]': makeElement({}),
    '[data-search-status]': makeElement({}),
    '[data-search-close]': makeElement({})
  };
  const document = {
    listeners: {},
    querySelector(selector) { return elements[selector] || null; },
    createElement(tagName) { return makeElement({ tagName }); },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; }
  };
  const entries = Array.from({ length: 10 }, (_, index) => ({
    title: `Maya ${index}`,
    content: 'Pipeline',
    path: `/maya-${index}/`
  }));
  const fetchIndex = async path => {
    assert.equal(path, '/search.json');
    return { ok: true, async json() { return entries; } };
  };

  const controller = mountSearch(document, fetchIndex);
  assert.equal(mountSearch(document, fetchIndex), controller);
  elements['[data-search-open]'].dispatch('click');
  await new Promise(resolve => setImmediate(resolve));
  elements['[data-search-input]'].value = 'maya';
  elements['[data-search-form]'].dispatch('submit');
  await new Promise(resolve => setImmediate(resolve));

  const list = elements['[data-search-results]'].children[0];
  assert.equal(list.children.length, 8);
  assert.equal(list.children[0].children[0].href, '/maya-0/');
  assert.equal(elements['[data-search-status]'].textContent, '找到 8 条结果');

  elements['[data-search-input]'].value = '不存在';
  elements['[data-search-form]'].dispatch('submit');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(
    elements['[data-search-status]'].textContent,
    '没有找到匹配笔记，请调整关键词或浏览技术分类'
  );
  controller.destroy();
});

test('keeps scrapbook surface text readable in the dark theme', () => {
  const tokensCss = readFileSync(join(__dirname, '../source/css/scrapbook-tokens.css'), 'utf8');
  const homeCss = readFileSync(join(__dirname, '../source/css/scrapbook-home.css'), 'utf8');

  assert.match(tokensCss, /:root\s*\{[^}]*--sb-nav:\s*#8f6f91;[^}]*--sb-ink:\s*#42374b;/s);
  assert.match(tokensCss, /--sb-paper-ink:\s*#42374b;/);
  assert.match(tokensCss, /:root\[data-theme="dark"\]\s*\{[^}]*--sb-nav:\s*#6f5874;[^}]*--sb-ink:\s*#f5edf6;/s);
  assert.match(tokensCss, /\.skip-link\s*\{[^}]*color:\s*var\(--sb-paper-ink\);/s);
  assert.match(homeCss, /\.profile-polaroid dt\s*\{[^}]*color:\s*var\(--sb-ink\);/s);
  assert.match(homeCss, /\.category-ticket small\s*\{[^}]*color:\s*var\(--sb-ink\);/s);
  assert.match(homeCss, /\.post-note,\s*\.post-note a,\s*\.post-note time\s*\{[^}]*color:\s*var\(--sb-paper-ink\);/s);
  assert.match(homeCss, /\.scrapbook-more-link\s*\{[^}]*color:\s*var\(--sb-ink\);/s);
  assert.match(homeCss, /\.scrapbook-project-photos\s*\{[^}]*color:\s*var\(--sb-paper-ink\);/s);
  assert.match(homeCss, /\.scrapbook-project-photos \.scrapbook-more-link\s*\{[^}]*color:\s*var\(--sb-paper-ink\);/s);
  assert.match(homeCss, /\.space-dock button,[\s\S]*?\.space-dock \[data-comments-entry\]\s*\{[^}]*color:\s*var\(--sb-paper-ink\);/s);

  for (const paper of ['#fff7bd', '#f4cada', '#c8dbea']) {
    assert.ok(contrastRatio('#42374b', paper) >= 4.5, `paper ink must pass WCAG AA on ${paper}`);
  }
  assert.ok(contrastRatio('#f5edf6', '#3b3341') >= 4.5, 'dark card labels must pass WCAG AA');
});

test('locks concrete AA contrast fixes for nav, learning labels and code language labels', () => {
  const tokensCss = readFileSync(join(__dirname, '../source/css/scrapbook-tokens.css'), 'utf8');
  const homeCss = readFileSync(join(__dirname, '../source/css/scrapbook-home.css'), 'utf8');
  const articleCss = readFileSync(join(__dirname, '../source/css/scrapbook-article.css'), 'utf8');

  assert.match(tokensCss, /--sb-nav-surface:\s*#79547c;/);
  assert.ok(contrastRatio('#fffdf8', '#79547c') >= 4.5);
  assert.match(homeCss, /\.category-ticket__label\s*\{[^}]*color:\s*#5c4964;[^}]*opacity:\s*1;/s);
  assert.ok(contrastRatio('#5c4964', '#fffdf8') >= 4.5);
  assert.match(articleCss, /\.highlight \.code::before\s*\{[^}]*color:\s*#fffafc;[^}]*opacity:\s*1;/s);
  assert.ok(contrastRatio('#fffafc', '#2b2034') >= 4.5);
});

test('points Stellar blog consumers at generated route roots', () => {
  const stellarConfig = readFileSync(join(__dirname, '../_config.stellar.yml'), 'utf8');

  assert.match(stellarConfig, /id:\s*post[\s\S]*?url:\s*\/blog\//);
  assert.match(stellarConfig, /\[近期发布\]\(\/blog\/\)/);
  assert.match(stellarConfig, /\[分类\]\(\/categories\/\)/);
  assert.match(stellarConfig, /\[标签\]\(\/tags\/\)/);
  assert.match(stellarConfig, /\[归档\]\(\/archives\/\)/);
  assert.doesNotMatch(stellarConfig, /\/blog\/(?:categories|tags|archives)\//);
});
