const { buildHomeModel } = require('./scrapbook/model');
const { renderHome } = require('./scrapbook/render-home');

hexo.extend.generator.register('scrapbook-home', function scrapbookHome(locals) {
  const model = buildHomeModel(locals, this.config);
  return { path: 'index.html', data: renderHome(model, this.config), layout: false };
});
