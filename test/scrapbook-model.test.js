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
  assert.equal(model.categories[1].status, 'learning');
  assert.equal(model.featuredProjects[0].slug, 'maya');
  assert.equal(model.space.visitor.status, 'disabled');
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
