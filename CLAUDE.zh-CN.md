# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个浏览器扩展，为 ChatGPT 对话页面添加交互式时间轴导航条。时间轴为每条用户消息显示标记，允许快速浏览长对话。

## 代码库结构

- `extension/` - Chrome/Edge 版本（Manifest V3）
- `extension_Firefox/` - Firefox 版本（Manifest V2）
- `chatgpt-timeline.xpi` - 预构建的 Firefox 安装包
- `public/` - 预览图片和资源文件

## 浏览器支持

### Chrome/Edge（Manifest V3）
- 位置：`extension/` 文件夹
- manifest.json 使用 manifest_version 3
- content_scripts 注入到 `https://chatgpt.com/*` 和 `https://chat.openai.com/*`

### Firefox（Manifest V2）
- 位置：`extension_Firefox/` 文件夹
- manifest.json 使用 manifest_version 2
- 包含带扩展 ID 的 `applications.gecko` 部分
- 预打包为 `chatgpt-timeline.xpi` 用于分发

**重要提示**：两个版本共享相同的核心逻辑，但使用不同的 manifest 格式。进行功能更改时，需要同时更新两个文件夹。

## 核心架构

### 主入口点（content.js）
扩展是一个在 ChatGPT 对话页面上运行的内容脚本。主要组件：

1. **TimelineManager 类**（第 1-1211 行）
   - 管理整个时间轴生命周期
   - 处理 DOM 观察、事件监听器和 UI 更新
   - 使用虚拟化技术优化长对话的性能

2. **路由检测**（第 1223-1231 行）
   - `isConversationRoute()` 检查当前 URL 是否为对话页面
   - 支持 `/c/<id>` 和嵌套路由如 `/g/.../c/<id>`
   - 仅在有效对话页面上初始化时间轴

3. **SPA 导航处理**（第 1214-1309 行）
   - 使用 MutationObserver、popstate、hashchange 和轮询来检测路由变化
   - 导航离开时清理之前的时间轴实例
   - 延迟初始化（300ms）以等待 DOM 稳定

### 关键技术模式

**长画布虚拟化**（第 737-879 行）
- 时间轴使用可滚动的"长画布"方法，内容高度随对话长度缩放
- 仅渲染可见标记（视口 + 缓冲区内）以优化性能
- `updateVirtualRangeAndRender()` 根据滚动位置高效地添加/移除 DOM 节点

**活动标记追踪**（第 1065-1105 行）
- 基于滚动位置计算活动标记（视口高度 45% 的参考点）
- 在快速滚动期间合并快速变化（最小间隔 120ms）
- 同时使用基于滚动的计算和 IntersectionObserver

**碰撞避免**（第 566-649 行）
- `applyMinGap()` 强制标记之间的最小像素间距
- 前向/后向传递保持单调递增顺序
- `scheduleMinGapCorrection()` 在调整大小/缩放后重新应用间距

**多站点模式支持**（第 205 行）
- 查询 `data-turn="user"` 和 `data-message-author-role="user"` 两种属性
- 处理不同的 ChatGPT 页面结构

### CSS 架构（styles.css）

**主题支持**
- 使用 CSS 自定义属性方便主题切换
- `<html>` 上的 `.dark` 类自动切换到深色调色板
- 适配 ChatGPT 的原生浅色/深色模式

**定位系统**（第 84-87 行）
- 使用 CSS 变量 `--n`（归一化 0-1 值）定位圆点
- 如果 CSS 变量定位失败，回退到基于像素的 `top`
- 使用 `calc()` 配合轨道内边距将归一化位置映射到像素

**性能优化**
- `contain: layout paint` 隔离时间轴重排（第 62 行）
- 轨道上的隐藏滚动条（第 218-220 行）
- 工具提示动画的 will-change 提示（第 163 行）

## 开发工作流

### 进行更改

1. **功能更改**：同时编辑 `extension/content.js` 和 `extension_Firefox/content.js`
2. **样式更改**：同时编辑 `extension/styles.css` 和 `extension_Firefox/styles.css`
3. **manifest 更改**：更新两个 manifest.json 文件，注意适当的版本差异

### 本地测试

**Chrome/Edge：**
1. 访问 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/` 文件夹

**Firefox：**
1. 访问 `about:debugging`
2. 点击"此 Firefox"
3. 点击"临时加载附加组件..."
4. 从 `extension_Firefox/` 选择 `manifest.json`（或 .xpi 文件）

### 打包 Firefox 版本

重新构建 .xpi：
```bash
cd extension_Firefox
zip -r ../chatgpt-timeline.xpi *
```

## 关键实现注意事项

**DOM 容器重新绑定**（第 305-358 行）
- ChatGPT 可能在分支切换或导航期间替换对话容器
- `ensureContainersUpToDate()` 检测 DOM 替换并重新绑定观察器/监听器
- 始终使用 `this.conversationContainer` 和 `this.scrollContainer` 引用（不要缓存查询）

**滚动容器检测**（第 101-114、325-337 行）
- 向上遍历 DOM 树以找到具有 `overflow-y: auto|scroll` 的元素
- 如果未找到溢出容器，回退到 `document.scrollingElement`
- 对话容器更改后必须重新检测

**性能监控**
- 设置 `localStorage.chatgptTimelineDebugPerf = '1'` 以启用性能日志
- 使用 Performance API 标记/测量来跟踪关键操作

**销毁时清理**（第 1124-1210 行）
- 必须移除所有事件监听器、观察器、计时器和 DOM 节点
- 包括外部滑块元素清理（第 1164-1175 行）
- 防止 SPA 导航期间的内存泄漏

## 常见任务

### 添加新的时间轴功能
1. 在 `TimelineManager` 构造函数中添加状态
2. 在适当的生命周期方法（`init`、`recalculateAndRenderMarkers` 等）中实现逻辑
3. 在 `destroy()` 方法中清理
4. 测试对话/非对话页面之间的导航

### 更改标记间距
- 调整 `--timeline-min-gap` CSS 变量（第 26 行）
- 间距强制发生在 `applyMinGap()` 和 `updateTimelineGeometry()` 中

### 调整活动检测
- 修改 45% 视口参考点（第 805、1069 行）
- 更改 `minActiveChangeInterval`（第 24 行）以调整节流

### 支持其他 ChatGPT 模式
- 向查询添加新选择器，如第 205、365 行
- 使用不同的对话页面变体进行测试

## 浏览器差异

| 特性 | Chrome/Edge | Firefox |
|------|-------------|---------|
| Manifest 版本 | V3 | V2 |
| 扩展 ID | 自动生成 | 在 manifest 中指定（`chatgpt-timeline@example.com`）|
| 图标 | 非必需 | 必需（`icon.svg`）|
| 权限 | 隐式 | 显式（`activeTab`）|
| run_at | 默认（document_idle）| 显式（document_end）|
