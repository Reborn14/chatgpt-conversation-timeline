#!/bin/bash
# Sync script to help translate CLAUDE.md to CLAUDE.zh-CN.md
# Usage: ./sync-claude-docs.sh

set -e

CLAUDE_EN="CLAUDE.md"
CLAUDE_ZH="CLAUDE.zh-CN.md"

echo "📝 CLAUDE.md 同步脚本 / Sync Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if CLAUDE.md exists
if [ ! -f "$CLAUDE_EN" ]; then
    echo "❌ 错误：找不到 $CLAUDE_EN"
    echo "❌ Error: $CLAUDE_EN not found"
    exit 1
fi

# Check if CLAUDE.zh-CN.md exists
if [ ! -f "$CLAUDE_ZH" ]; then
    echo "❌ 错误：找不到 $CLAUDE_ZH"
    echo "❌ Error: $CLAUDE_ZH not found"
    exit 1
fi

# Get modification times
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    EN_TIME=$(stat -f %m "$CLAUDE_EN")
    ZH_TIME=$(stat -f %m "$CLAUDE_ZH")
else
    # Linux
    EN_TIME=$(stat -c %Y "$CLAUDE_EN")
    ZH_TIME=$(stat -c %Y "$CLAUDE_ZH")
fi

echo "📄 文件状态 / File Status:"
echo "  • CLAUDE.md         最后修改 / Last modified: $(date -r $EN_TIME '+%Y-%m-%d %H:%M:%S')"
echo "  • CLAUDE.zh-CN.md   最后修改 / Last modified: $(date -r $ZH_TIME '+%Y-%m-%d %H:%M:%S')"
echo ""

if [ $EN_TIME -gt $ZH_TIME ]; then
    echo "⚠️  CLAUDE.md 比 CLAUDE.zh-CN.md 更新"
    echo "⚠️  CLAUDE.md is newer than CLAUDE.zh-CN.md"
    echo ""
    echo "建议操作 / Suggested actions:"
    echo "  1. 手动编辑 CLAUDE.zh-CN.md 以同步更改"
    echo "     Manually edit CLAUDE.zh-CN.md to sync changes"
    echo ""
    echo "  2. 使用 Claude Code 或其他 AI 工具翻译"
    echo "     Use Claude Code or other AI tools to translate"
    echo ""
    echo "  3. 使用 git diff 查看更改："
    echo "     Use git diff to view changes:"
    echo "     git log -p --follow CLAUDE.md"
    echo ""
elif [ $ZH_TIME -gt $EN_TIME ]; then
    echo "✅ CLAUDE.zh-CN.md 比 CLAUDE.md 更新（可能是单独修改）"
    echo "✅ CLAUDE.zh-CN.md is newer (possibly edited separately)"
else
    echo "✅ 两个文件同步"
    echo "✅ Files are in sync"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
