---
title: 项目展示
date: 2024-01-01
layout: page
menu_id: project
---

# 项目展示

这里收录可以在本站核对设计背景、流程边界与当前完成度的 Pipeline 实践。相关生产代码与演示目前不对外提供，因此仅保留文章入口与已记录的实现说明。

## 🚀 Pipeline 工具实践

### 1. UE Movie Render Pipeline 提交面板
- **技术栈**: Unreal Engine + Movie Render Pipeline + AWS Deadline
- **描述**: 在 UE 内提供独立提交面板，把 Movie Render Pipeline 渲染封装为 Deadline 命令行作业；文章同时标明尚待补充的参数与界面细节。
- **项目记录**: [查看实践文章](/2026/07/24/ue-submit-render-farm/)

### 2. Maya 资产批量提交工具
- **技术栈**: Python + Maya + AWS Deadline + Alembic + JSON
- **描述**: 记录资产预处理、模型与材质两阶段提交，以及通过 Alembic 和材质 JSON 还原关联的流程；文章明确列出仍待脚本核验的实现细节。
- **项目记录**: [查看实践文章](/2026/07/23/maya-asset-batch-submit/)

## 🏢 工作项目

### 1. 影视管线系统
- **技术栈**: Python + Maya API + ShotGrid
- **描述**: 影视动画制作管线系统，包含资产管理、任务分配、渲染管理等模块

### 2. AI 工具链集成
- **技术栈**: Python + PyTorch + ComfyUI
- **描述**: 将 AI 工具集成到生产流程中，实现自动化材质生成和渲染优化

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| DCC 软件 | Maya, Nuke, Houdini, Blender |
| 编程语言 | Python, C++, MEL |
| AI 框架 | TensorFlow, PyTorch |
| 资产管理 | ShotGrid, Ftrack, Perforce |
