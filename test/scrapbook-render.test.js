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
});
