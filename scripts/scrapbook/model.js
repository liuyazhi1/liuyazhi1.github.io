function toArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.slice();
  }

  if (typeof value.toArray === 'function') {
    return value.toArray();
  }

  return Array.from(value);
}

function buildHomeModel(locals, config) {
  const settings = config.scrapbook || {};
  const posts = toArray(locals.posts)
    .filter(post => post.indexing !== false)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const categories = (settings.categories || []).map(name => {
    const found = toArray(locals.categories).find(item => item.name === name);
    const categoryDir = String(config.category_dir || 'categories').replace(/^\/+|\/+$/g, '');
    return {
      name,
      count: found ? found.length : 0,
      status: found ? 'ready' : 'learning',
      path: found?.path || `${categoryDir}/${name}/`
    };
  });
  const featuredProjects = (settings.featured_projects || [])
    .map(slug => posts.find(post => post.slug === slug && post.path))
    .filter(Boolean)
    .map(post => ({
      slug: post.slug,
      title: post.title,
      path: post.path
    }));

  return {
    profile: settings.profile || {},
    status: settings.status || {},
    categories,
    latestPosts: posts.slice(0, settings.latest_limit || 3),
    featuredProjects,
    space: {
      music: settings.music || { tracks: [] },
      visitor: { status: settings.visitor?.enabled ? 'enabled' : 'disabled' },
      comments: { status: settings.comments?.enabled ? 'enabled' : 'disabled' }
    }
  };
}

module.exports = { buildHomeModel, toArray };
