const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHomeModel } = require('../scripts/scrapbook/model');

test('builds honest homepage data and keeps configured ordering', () => {
  const locals = {
    posts: [{ slug: 'maya', title: 'Maya 工具', date: new Date('2026-07-23'), path: 'maya/', content: '不应进入首页模型' }],
    categories: [{ name: 'Maya', length: 1, path: 'categories/Maya/' }]
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
  assert.equal(model.categories[1].status, 'learning');
  assert.equal(model.categories[0].path, 'categories/Maya/');
  assert.equal(model.categories[3].path, 'categories/数据库/');
  assert.deepEqual(model.featuredProjects[0], { slug: 'maya', title: 'Maya 工具', path: 'maya/' });
  assert.equal(model.space.visitor.status, 'disabled');
});

test('keeps learning categories honest and omits missing featured projects', () => {
  const model = buildHomeModel({
    posts: [{ slug: 'real-project', title: '真实项目', indexing: true }],
    categories: [{ name: 'Maya', length: 0 }]
  }, { scrapbook: {
    categories: ['Maya', '数据库'],
    featured_projects: ['missing-project']
  }});

  assert.deepEqual(model.categories, [
    { name: 'Maya', count: 0, status: 'ready', path: 'categories/Maya/' },
    { name: '数据库', count: 0, status: 'learning', path: 'categories/数据库/' }
  ]);
  assert.deepEqual(model.featuredProjects, []);
});

test('sorts public posts by date and applies the latest-post limit', () => {
  const locals = {
    posts: {
      toArray: () => [
        { slug: 'old', date: new Date('2026-07-20') },
        { slug: 'new', date: new Date('2026-07-23') },
        { slug: 'hidden', date: new Date('2026-07-24'), indexing: false },
        { slug: 'middle', date: new Date('2026-07-22') },
        { slug: 'older', date: new Date('2026-07-21') }
      ]
    },
    categories: null
  };

  const model = buildHomeModel(locals, { scrapbook: { latest_limit: 3 } });

  assert.deepEqual(model.latestPosts.map(post => post.slug), ['new', 'middle', 'older']);
});

test('normalizes safe post metadata and verified project tech stacks', () => {
  const post = {
    slug: 'maya-tool',
    title: 'Maya 工具',
    path: 'maya-tool/',
    date: new Date('2026-07-23'),
    excerpt: '<p>批量处理 <strong>资产</strong> &amp; 材质。</p><script>alert(1)</script>',
    categories: { toArray: () => [{ name: 'Maya' }, { name: 'Pipeline' }] },
    tags: { toArray: () => ['Python', { name: 'Deadline' }, { name: 'Alembic' }, { name: 'JSON' }] }
  };
  const model = buildHomeModel({ posts: [post], categories: [] }, { scrapbook: {
    featured_projects: [{ slug: 'maya-tool', tech_stack: ['Python', 'Maya API', 'Deadline'] }]
  }});

  assert.deepEqual(model.latestPosts[0], {
    slug: 'maya-tool',
    title: 'Maya 工具',
    path: 'maya-tool/',
    date: post.date,
    excerpt: '批量处理 资产 & 材质。',
    category: 'Maya',
    tags: ['Python', 'Deadline', 'Alembic']
  });
  assert.deepEqual(model.featuredProjects[0], {
    slug: 'maya-tool',
    title: 'Maya 工具',
    path: 'maya-tool/',
    techStack: ['Python', 'Maya API', 'Deadline']
  });
});

test('keeps malformed numeric entities inert instead of aborting generation', () => {
  const model = buildHomeModel({
    posts: [{
      slug: 'entity-boundary',
      title: '实体边界',
      excerpt: '保留 &#999999999; 并继续生成'
    }],
    categories: []
  }, { scrapbook: {} });

  assert.equal(model.latestPosts[0].excerpt, '保留 &#999999999; 并继续生成');
});

test('preserves configured brand and enabled service destinations', () => {
  const model = buildHomeModel({ posts: [], categories: [] }, { scrapbook: {
    brand: '钱钱的 Pipeline 手账',
    tagline: '今天也在把麻烦的制作流程，变成顺手的小工具。',
    profile: { direction: 'Maya、Unreal、Deadline、Omniverse 与数据库流程开发' },
    visitor: { enabled: true, href: '/visitors/' },
    comments: { enabled: true, href: '/comments/' }
  }});

  assert.equal(model.brand, '钱钱的 Pipeline 手账');
  assert.match(model.tagline, /顺手的小工具/);
  assert.match(model.profile.direction, /Omniverse/);
  assert.deepEqual(model.space.visitor, { status: 'enabled', href: '/visitors/' });
  assert.deepEqual(model.space.comments, { status: 'enabled', href: '/comments/' });
});
