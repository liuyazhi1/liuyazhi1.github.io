const test = require('node:test');
const assert = require('node:assert/strict');
const { renderHome } = require('../scripts/scrapbook/render-home');

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
