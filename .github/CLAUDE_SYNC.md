# CLAUDE.md 同步指南 / Sync Guide

## 概述 / Overview

本仓库包含两个版本的 Claude Code 指导文档：
This repository contains two versions of Claude Code guidance documentation:

- `CLAUDE.md` - English version
- `CLAUDE.zh-CN.md` - Chinese version (中文版本)

## 自动化机制 / Automation

### 1. Git Pre-commit Hook (本地检查)

当你提交包含 `CLAUDE.md` 更改时，pre-commit hook 会自动检查是否同时更新了 `CLAUDE.zh-CN.md`。

When you commit changes to `CLAUDE.md`, the pre-commit hook automatically checks if `CLAUDE.zh-CN.md` was also updated.

如果没有更新中文版本，会提示你：
If the Chinese version wasn't updated, you'll be prompted:

```
⚠️  警告 / Warning ⚠️
你修改了 CLAUDE.md 但没有更新 CLAUDE.zh-CN.md
```

你可以选择：
You can choose to:
- 更新中文版本后再提交 / Update Chinese version then commit
- 使用 `git commit --no-verify` 跳过检查 / Skip check with `git commit --no-verify`

### 2. GitHub Actions (远程检查)

推送到远程仓库时，GitHub Actions 会自动检查：
When pushing to remote, GitHub Actions automatically checks:

- ✅ 如果 `CLAUDE.md` 和 `CLAUDE.zh-CN.md` 同时修改 → 通过
- ⚠️ 如果只修改了 `CLAUDE.md` → 警告（但不阻止合并）

配置文件：`.github/workflows/check-claude-docs.yml`

### 3. 手动同步脚本 / Manual Sync Script

使用脚本检查两个文件的同步状态：
Use the script to check sync status:

```bash
./sync-claude-docs.sh
```

输出示例 / Example output:
```
📝 CLAUDE.md 同步脚本 / Sync Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 文件状态 / File Status:
  • CLAUDE.md         最后修改: 2025-10-03 14:30:00
  • CLAUDE.zh-CN.md   最后修改: 2025-10-03 14:25:00

⚠️  CLAUDE.md 比 CLAUDE.zh-CN.md 更新
```

## 工作流程 / Workflow

### 修改 CLAUDE.md 时 / When modifying CLAUDE.md:

1. 编辑 `CLAUDE.md`
2. 运行同步检查：`./sync-claude-docs.sh`
3. 同步翻译到 `CLAUDE.zh-CN.md`（可使用 Claude Code）
4. 一起提交两个文件：
   ```bash
   git add CLAUDE.md CLAUDE.zh-CN.md
   git commit -m "docs: update CLAUDE documentation"
   ```

### 如何翻译 / How to translate:

**使用 Claude Code:**
```bash
# 在 Claude Code 中运行
claude code "请将 CLAUDE.md 的最新更改翻译到 CLAUDE.zh-CN.md"
```

**手动翻译 / Manual translation:**
1. 使用 `git diff` 查看更改
2. 在 `CLAUDE.zh-CN.md` 中应用相应的中文翻译
3. 保持格式和结构一致

## 禁用检查 / Disable Checks

如果需要临时禁用检查：
To temporarily disable checks:

**本地 hook:**
```bash
git commit --no-verify
```

**删除 hook:**
```bash
rm .git/hooks/pre-commit
```

**GitHub Actions:**
在 commit message 中添加 `[skip ci]` 或修改 `.github/workflows/check-claude-docs.yml`

## 故障排除 / Troubleshooting

**Hook 不工作？**
```bash
# 检查权限
ls -la .git/hooks/pre-commit

# 应该显示 -rwxr-xr-x (executable)
# 如果不是，运行：
chmod +x .git/hooks/pre-commit
```

**脚本不工作？**
```bash
# 确保脚本可执行
chmod +x sync-claude-docs.sh

# 运行
./sync-claude-docs.sh
```
