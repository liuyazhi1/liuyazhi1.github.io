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
