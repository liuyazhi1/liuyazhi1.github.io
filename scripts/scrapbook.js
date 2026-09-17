const { buildHomeModel } = require('./scrapbook/model');
const { renderHome, renderNavigation, renderSearchPanel, renderSpaceDock } = require('./scrapbook/render-home');

hexo.extend.generator.register('scrapbook-home', function scrapbookHome(locals) {
  const model = buildHomeModel(locals, this.config);
  return { path: 'index.html', data: renderHome(model, this.config), layout: false };
});

// Keep Stellar's filtering/pagination; share the homepage shell on blog indexes.
hexo.extend.filter.register('after_render:html', function (html, data) {
  if (!/^(blog|categories|tags|archives)\//.test(data.path || '') || !html.includes('class="l_body index"')) return html;
  const model = buildHomeModel(this.locals.toObject(), this.config);
  const navigation = renderNavigation(model, this.config).replace('href="#space-message"', 'href="/#space-message"');
  return html
    .replace('</head>', '<link rel="stylesheet" href="/css/scrapbook-home.css"><link rel="stylesheet" href="/css/pixel-world.css"><link rel="stylesheet" href="/css/scrapbook-list.css"></head>')
    .replace('<body>', `<body class="scrapbook-list"><a class="skip-link" href="#main">跳到主要内容</a>${navigation}${renderSearchPanel()}`)
    .replace('</body>', `${renderSpaceDock(model.space)}</body>`);
});
