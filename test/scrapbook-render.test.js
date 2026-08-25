const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { renderHome } = require('../scripts/scrapbook/render-home');

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
    featuredProjects: [],
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
  assert.match(html, /class="[^"]*space-dock/);
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
  assert.match(homeCss, /\.space-dock button\s*\{[^}]*color:\s*var\(--sb-paper-ink\);/s);

  for (const paper of ['#fff7bd', '#f4cada', '#c8dbea']) {
    assert.ok(contrastRatio('#42374b', paper) >= 4.5, `paper ink must pass WCAG AA on ${paper}`);
  }
  assert.ok(contrastRatio('#f5edf6', '#3b3341') >= 4.5, 'dark card labels must pass WCAG AA');
});
