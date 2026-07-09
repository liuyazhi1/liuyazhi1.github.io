# 钱钱的博客

> 记录学习，分享成长

基于 Hexo + Stellar 主题搭建的个人技术博客，专注于影视流程开发和人工智能方向的 Pipeline TD 技术分享。

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖

```bash
cd hexo-project
npm install
```

### 本地开发

```bash
# 启动开发服务器
npm run server

# 或
npx hexo server
```

访问 http://localhost:4000/ 查看博客效果。

### 构建部署

```bash
# 生成静态文件
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 📁 项目结构

```
hexo-project/
├── source/                    # 源文件目录
│   ├── _posts/               # 博客文章
│   ├── wiki/                 # 学习文档页面
│   ├── projects/             # 项目展示页面
│   ├── about/                # 关于我页面
│   └── _data/                # 数据配置文件
├── themes/
│   └── stellar/              # Stellar 主题
├── _config.yml               # Hexo 主配置
├── _config.stellar.yml       # Stellar 主题配置
└── package.json              # 项目依赖
```

## 🔧 功能分区

| 分区 | 路径 | 说明 |
|------|------|------|
| **博客** | `/` | 最新文章列表 |
| **学习文档** | `/wiki/` | 系统化技术笔记（DCC、AI、Pipeline） |
| **项目展示** | `/projects/` | 个人项目作品集 |
| **关于我** | `/about/` | 个人介绍和技能展示 |

## 📝 文章分类

- **学习文档**: DCC 软件学习笔记（Maya、Nuke、Houdini、Blender）
- **Debug记录**: 开发过程中的问题解决记录
- **日常随笔**: 生活感悟和技术思考

## 🌐 技术栈

- **框架**: Hexo 7.0.0
- **主题**: Hexo Theme Stellar 1.33.1
- **评论**: Giscus（基于 GitHub Discussions）
- **搜索**: Local Search

## 📚 参考资源

- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [Stellar 主题文档](https://xaoxuu.com/wiki/stellar/)
- [Giscus 配置](https://giscus.app/zh-CN)

## 📄 许可证

本博客所有文章采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议。

---

> 持续学习，不断进步 💪