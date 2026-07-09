---
title: Node.js 内存泄漏排查
date: 2024-01-02
categories:
  - Debug记录
tags:
  - Node.js
  - 性能优化
  - Debug
---

# Node.js 内存泄漏排查

## 问题描述

服务运行一段时间后，内存占用持续上升，最终导致进程崩溃。

## 排查步骤

### 1. 开启内存监控

```bash
node --inspect --max-old-space-size=2048 app.js
```

### 2. 使用 Chrome DevTools

1. 打开 Chrome，访问 `chrome://inspect`
2. 找到目标 Node.js 进程
3. 点击 **Inspect** 进入 DevTools

### 3. 录制堆快照

1. 在 **Memory** 面板中选择 **Heap snapshot**
2. 点击 **Take snapshot**
3. 等待快照生成

### 4. 分析快照

- **Comparison**: 对比两个快照，查看内存增长
- **Dominator tree**: 查看占用内存最多的对象
- **Retainers**: 查看对象的引用链

## 常见内存泄漏原因

### 1. 全局变量

```javascript
// 错误示例
let cache = {}

function processData(data) {
  cache[data.id] = data // 不断累积，永远不会释放
}
```

**解决方案**: 使用 `Map` 并设置合理的清理策略。

### 2. 事件监听器

```javascript
// 错误示例
const emitter = new EventEmitter()

function createObject() {
  const obj = {}
  emitter.on('event', () => {
    console.log(obj) // 闭包引用，导致 obj 无法释放
  })
}
```

**解决方案**: 在对象销毁时移除监听器。

### 3. 定时器

```javascript
// 错误示例
setInterval(() => {
  // 某些操作
}, 1000)
// 忘记清除
```

**解决方案**: 使用 `clearInterval()` 清除定时器。

## 代码优化

### 优化前

```javascript
let listeners = []

function addListener(callback) {
  listeners.push(callback)
}
```

### 优化后

```javascript
const listeners = new Set()

function addListener(callback) {
  listeners.add(callback)
}

function removeListener(callback) {
  listeners.delete(callback)
}
```

## 监控工具

| 工具 | 用途 |
|------|------|
| `heapdump` | 生成堆快照 |
| `clinic.js` | Node.js 性能诊所 |
| `node-memwatch` | 内存泄漏检测 |

---

> 排查内存泄漏需要耐心和细心，祝你好运！ 🐛