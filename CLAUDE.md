# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension that adds an interactive timeline bar to ChatGPT conversation pages. The timeline displays markers for each user message, allowing quick navigation through long conversations.

## Repository Structure

- `extension/` - Chrome/Edge version (Manifest V3)
- `extension_Firefox/` - Firefox version (Manifest V2)
- `chatgpt-timeline.xpi` - Pre-built Firefox package
- `public/` - Preview images and assets

## Browser Support

### Chrome/Edge (Manifest V3)
- Location: `extension/` folder
- manifest.json uses manifest_version 3
- content_scripts inject on `https://chatgpt.com/*` and `https://chat.openai.com/*`

### Firefox (Manifest V2)
- Location: `extension_Firefox/` folder
- manifest.json uses manifest_version 2
- Includes `applications.gecko` section with extension ID
- Pre-packaged as `chatgpt-timeline.xpi` for distribution

**Important**: Both versions share the same core logic but use different manifest formats. When making functional changes, update BOTH folders.

## Core Architecture

### Main Entry Point (content.js)
The extension is a content script that runs on ChatGPT conversation pages. Key components:

1. **TimelineManager Class** (lines 1-1211)
   - Manages the entire timeline lifecycle
   - Handles DOM observation, event listeners, and UI updates
   - Uses virtualization for performance with long conversations

2. **Route Detection** (lines 1223-1231)
   - `isConversationRoute()` checks if current URL is a conversation page
   - Supports both `/c/<id>` and nested routes like `/g/.../c/<id>`
   - Only initializes timeline on valid conversation pages

3. **SPA Navigation Handling** (lines 1214-1309)
   - Uses MutationObserver, popstate, hashchange, and polling to detect route changes
   - Cleans up previous timeline instances when navigating away
   - Delays initialization (300ms) to allow DOM to settle

### Key Technical Patterns

**Long-Canvas Virtualization** (lines 737-879)
- Timeline uses a scrollable "long canvas" approach where content height scales with conversation length
- Only renders visible markers (within viewport + buffer) to optimize performance
- `updateVirtualRangeAndRender()` efficiently adds/removes DOM nodes based on scroll position

**Active Marker Tracking** (lines 1065-1105)
- Computes active marker based on scroll position (45% viewport height reference point)
- Coalesces rapid changes during fast scrolling (120ms min interval)
- Uses both scroll-based computation and IntersectionObserver

**Collision Avoidance** (lines 566-649)
- `applyMinGap()` enforces minimum pixel spacing between markers
- Forward/backward passes maintain monotonic ordering
- `scheduleMinGapCorrection()` re-applies spacing after resize/zoom

**Multi-Site Schema Support** (line 205)
- Queries both `data-turn="user"` and `data-message-author-role="user"` attributes
- Handles different ChatGPT page structures

### CSS Architecture (styles.css)

**Theme Support**
- Uses CSS custom properties for easy theme switching
- `.dark` class on `<html>` automatically switches to dark palette
- Adapts to ChatGPT's native light/dark mode

**Positioning System** (lines 84-87)
- Dots positioned using CSS var `--n` (normalized 0-1 value)
- Fallback to pixel-based `top` if CSS var positioning fails
- Uses `calc()` with track padding to map normalized position to pixels

**Performance Optimizations**
- `contain: layout paint` isolates timeline reflows (line 62)
- Hidden scrollbars on track (lines 218-220)
- Will-change hints for tooltip animations (line 163)

## Development Workflow

### Making Changes

1. **For feature changes**: Edit both `extension/content.js` and `extension_Firefox/content.js` simultaneously
2. **For styling**: Edit both `extension/styles.css` and `extension_Firefox/styles.css`
3. **For manifest changes**: Update both manifest.json files with appropriate version differences

### Testing Locally

**Chrome/Edge:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer Mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

**Firefox:**
1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on..."
4. Select `manifest.json` from `extension_Firefox/` (or the .xpi file)

### Packaging Firefox Version

To rebuild the .xpi:
```bash
cd extension_Firefox
zip -r ../chatgpt-timeline.xpi *
```

## Critical Implementation Notes

**DOM Container Rebinding** (lines 305-358)
- ChatGPT may replace the conversation container during branch switches or navigation
- `ensureContainersUpToDate()` detects DOM replacements and rebinds observers/listeners
- Always use `this.conversationContainer` and `this.scrollContainer` references (never cache queries)

**Scroll Container Detection** (lines 101-114, 325-337)
- Walks up DOM tree to find element with `overflow-y: auto|scroll`
- Falls back to `document.scrollingElement` if no overflow container found
- Must re-detect after conversation container changes

**Performance Monitoring**
- Set `localStorage.chatgptTimelineDebugPerf = '1'` to enable perf logging
- Uses Performance API marks/measures to track critical operations

**Cleanup on Destroy** (lines 1124-1210)
- Must remove all event listeners, observers, timers, and DOM nodes
- Includes external slider element cleanup (lines 1164-1175)
- Prevents memory leaks during SPA navigation

## Common Tasks

### Adding a New Timeline Feature
1. Add state to `TimelineManager` constructor
2. Implement logic in appropriate lifecycle method (`init`, `recalculateAndRenderMarkers`, etc.)
3. Clean up in `destroy()` method
4. Test navigation between conversation/non-conversation pages

### Changing Marker Spacing
- Adjust `--timeline-min-gap` CSS variable (line 26)
- Spacing enforcement happens in `applyMinGap()` and `updateTimelineGeometry()`

### Adjusting Active Detection
- Modify the 45% viewport reference (line 805, 1069)
- Change `minActiveChangeInterval` (line 24) to adjust throttling

### Supporting Additional ChatGPT Schemas
- Add new selectors to queries like line 205, 365
- Test with different conversation page variants
