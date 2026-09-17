# 钱钱的小小世界

Hexo + Stellar 技术博客：真实文章、像素蘑菇小游戏、搜索、音乐工具盒与文章回顶。

## 开发

使用 Node.js 22 或更高版本。首次克隆需要初始化主题子模块：

```sh
git submodule update --init --recursive
npm ci
npm run server
```

本地地址：<http://localhost:4000/>。

## 编辑入口

| 路径 | 职责 |
| --- | --- |
| `source/_posts/` | 正式文章 |
| `source/about/`、`source/projects/`、`source/wiki/` | 独立页面 |
| `scripts/scrapbook/model.js` | 首页真实数据 |
| `scripts/scrapbook/render-home.js` | 首页 HTML |
| `source/css/scrapbook-*.css` | 配色、首页和文章布局 |
| `source/js/scrapbook-space.js` | 搜索、主题、音乐、阅读工具 |
| `source/js/pixel-world.js`、`source/css/pixel-world.css` | 共用像素图案、首页场景和游戏 |
| `_config.yml`、`_config.stellar.yml` | 内容配置、主题资源注入 |
| `tools/sync-static.cjs` | 安全同步静态发布文件，不删除目录 |
| `themes/stellar/` | 原主题子模块 |

`public/` 是可重建且不提交的构建结果。根目录 HTML、`css/`、`js/` 和文章日期目录是 Pages 当前使用的发布产物，**不要直接编辑**，请改源码后统一同步。

## 验证和发布

```sh
npm run verify
npm run sync:static
git diff --check
git status --short
```

先检查本地桌面/手机页面、小游戏、搜索、主题和文章目录/回顶，再按实际变更逐个选择文件暂存；不要将个人文件一起 `git add .`。

```sh
git commit -m "描述本次修改"
git push origin main
```

Pages 保持 `main / (root)`。`.nojekyll` 禁止 Jekyll 误解析 Hexo 配置，`.gitmodules` 记录主题来源，均须保留。同步命令仅复制白名单中的生成目录，未知输出会报错；新增栏目时先审查白名单。删除文章或资源后，要单独核对并删除对应旧发布文件，命令不会自动清空目录。

**不要运行旧 `npm run deploy` / `hexo deploy`**：其目标也为 main，可能用纯静态内容覆盖源码分支。旧命令仅保留兼容，本仓库使用上述显式提交流程。

推送后检查 GitHub Actions 对应提交是否部署成功，再访问 <https://liuyazhi1.github.io/>；不能把 push 成功等同于上线。

## 音乐和小游戏

音乐文件放入 `source/music/` 后，在 `_config.yml` 的 `scrapbook.music.tracks` 填写 `title` 和 `src: music/文件名.mp3`。使用有权公开播放的音源。无音源时按钮保持禁用，不自动播放。

游戏主动开始，空格/↑ 或触屏按钮跳跃；Esc、窗口失焦或切换标签页会暂停，退出停止游戏。无音效，减少动态效果设置会关闭装饰动画。

文章许可：CC BY-NC-SA 4.0。
