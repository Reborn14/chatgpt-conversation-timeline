# 仓库指南

## 项目结构与模块组织
- `extension/`：Chromium MV3 构建（Chrome/Edge）。包含 `manifest.json`、`content.js`、`styles.css`。
- `extension_Firefox/`：Firefox（MV2）构建。包含 `manifest.json`、`content.js`、`styles.css`、`icon.svg`。
- `public/preview.png`：文档中使用的截图。
- `chatgpt-timeline.xpi`：预构建的 Firefox 安装包。
- `README.md`、`README.zh-CN.md`、`LICENSE`：文档与许可证。

## 构建、测试与开发命令
- Chrome/Edge（开发）：通过 `chrome://extensions` → 启用“开发者模式” → “加载已解压的扩展程序”，选择 `extension/`。
- Firefox（开发）：进入 `about:debugging` → “此 Firefox” → “临时加载附加组件…”，选择 `chatgpt-timeline.xpi`。
- 打包（Chromium）：`zip -r chatgpt-timeline.zip extension/*`（可上传至扩展商店或用于分享）。
- 打包（Firefox）：`zip -r chatgpt-timeline.xpi extension_Firefox/*` 或 `web-ext build -s extension_Firefox -o`。

## 编码风格与命名约定
- JavaScript：ES2020+，4 空格缩进；使用分号、单引号与 camelCase。优先使用早返回和参数校验；避免引入第三方依赖；尽量减少并批量化 DOM 操作。
- CSS：4 空格缩进；使用在 `:root` 与 `html.dark` 中定义的 CSS 变量。类名请加 `chatgpt-timeline`/`timeline` 前缀以避免冲突。
- JSON：2 空格缩进。保持两套构建的 manifest 同步（`name`、`version`、`matches`）。
- 文件：小写加连字符或简洁命名（如 `content.js`、`styles.css`）。

## 测试指南
- 在两个域名上手动验证：`https://chat.openai.com/*` 与 `https://chatgpt.com/*`。
- 验证项：时间轴圆点与每次用户发言一一对应；滚动平滑；工具提示有截断；明/暗主题适配；SPA 导航变化（URL 无刷新更新）。
- 性能：长对话滚动无卡顿；控制台无错误。需在 Chrome/Edge 与 Firefox 上测试。

## 提交与 PR 指南
- 提交信息：使用简短的祈使语主题。优先采用 Conventional Commits（如 `feat:`、`fix:`、`chore:`、`docs:`）。
- PR：包含描述、关联的 issue，以及对话页面的修改前/后截图或简短 GIF。
- 跨浏览器就绪：在 Chromium 与 Firefox 均通过验证，并注明测试版本。发布用户可见变更时需同步提升两份 manifest 的 `version`。

## 安全与配置建议
- 权限最小化（仅 `content_scripts`，Firefox 另加 `activeTab`）。不要添加远程代码或额外的域名权限。
- 收窄选择器作用域（如 `article[data-turn-id]`）。避免泄漏全局变量；在路由变化时清理监听器和 UI。
