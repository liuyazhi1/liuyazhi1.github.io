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

function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, entity => {
    const key = entity.slice(1, -1).toLowerCase();
    if (key === 'amp') return '&';
    if (key === 'lt') return '<';
    if (key === 'gt') return '>';
    if (key === 'quot') return '"';
    if (key === 'apos') return "'";
    const codePoint = key.startsWith('#x')
      ? Number.parseInt(key.slice(2), 16)
      : Number.parseInt(key.slice(1), 10);
    const isUnicodeScalar = Number.isInteger(codePoint)
      && codePoint >= 0
      && codePoint <= 0x10ffff
      && !(codePoint >= 0xd800 && codePoint <= 0xdfff);
    return isUnicodeScalar ? String.fromCodePoint(codePoint) : entity;
  });
}

function toPlainText(value, limit = 120) {
  const text = decodeEntities(String(value ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function itemName(item) {
  if (typeof item === 'string') return item;
  return item?.name || item?.title || '';
}

function normalizePost(post) {
  const categories = toArray(post?.categories).map(itemName).filter(Boolean);
  const tags = toArray(post?.tags).map(itemName).filter(Boolean).slice(0, 3);
  return {
    slug: post?.slug,
    title: post?.title,
    path: post?.path,
    date: post?.date,
    excerpt: toPlainText(post?.excerpt || post?.description || post?.content),
    category: categories[0] || '',
    tags
  };
}

function buildHomeModel(locals, config) {
  const settings = config.scrapbook || {};
  const posts = toArray(locals.posts)
    .filter(post => post.indexing !== false)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const normalizedPosts = posts.map(normalizePost);
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
  const featuredProjects = (settings.featured_projects || []).map(entry => ({
    slug: typeof entry === 'string' ? entry : entry?.slug,
    techStack: toArray(typeof entry === 'string' ? [] : entry?.tech_stack).map(itemName).filter(Boolean)
  })).map(project => {
    const post = normalizedPosts.find(item => item.slug === project.slug && item.path);
    if (!post) return null;
    return {
      slug: post.slug,
      title: post.title,
      path: post.path,
      ...(project.techStack.length ? { techStack: project.techStack } : {})
    };
  }).filter(Boolean);

  return {
    brand: settings.brand || config.title || '',
    tagline: settings.tagline || '',
    profile: settings.profile || {},
    status: settings.status || {},
    categories,
    latestPosts: normalizedPosts.slice(0, settings.latest_limit || 3),
    featuredProjects,
    space: {
      music: settings.music || { tracks: [] },
      visitor: {
        status: settings.visitor?.enabled ? 'enabled' : 'disabled',
        ...(settings.visitor?.href ? { href: settings.visitor.href } : {})
      },
      comments: {
        status: settings.comments?.enabled ? 'enabled' : 'disabled',
        ...(settings.comments?.href ? { href: settings.comments.href } : {})
      }
    }
  };
}

module.exports = { buildHomeModel, decodeEntities, toPlainText, normalizePost, toArray };
