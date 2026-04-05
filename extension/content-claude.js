const CLAUDE_USER_TURN_SELECTORS = [
    '[data-message-author-role="user"]',
    '[data-testid*="conversation-turn-user"]',
    '[data-testid*="user-turn"]',
    '[data-testid*="user-message"]',
    '[data-testid*="human-message"]',
    '[data-is-user="true"]',
    'article[data-role="user"]',
    '[data-turn="user"]'
];

const CLAUDE_MEDIA_SELECTORS = 'img, picture, video, canvas, figure, [role="img"], [data-testid*="attachment"], [data-testid*="image"], [data-testid*="upload"], [data-testid*="file"], a[href*="/files/"]';
const CLAUDE_USER_ANCHOR_SELECTORS = '[aria-label*="You" i], [alt*="You" i], [aria-label*="你"], [alt*="你"], [aria-label*="您"], [alt*="您"], [data-testid*="user" i], [data-testid*="human" i]';
const CLAUDE_MESSAGE_LIKE_SELECTOR = 'article, section, li, [data-testid*="turn" i], [data-testid*="message" i], [data-testid*="conversation" i], [data-message-author-role], [data-role], [data-turn]';

function hasUserSignal(el) {
    if (!el) return false;
    try {
        const attrs = [
            String(el.getAttribute('data-message-author-role') || ''),
            String(el.getAttribute('data-role') || ''),
            String(el.getAttribute('data-turn') || ''),
            String(el.getAttribute('data-is-user') || ''),
            String(el.getAttribute('data-author') || ''),
            String(el.getAttribute('data-testid') || ''),
            String(el.getAttribute('aria-label') || ''),
            String(el.id || ''),
            String(el.className || '')
        ].join(' ').toLowerCase();
        if (/\b(user|human|you)\b/.test(attrs) || attrs.includes('conversation-turn-user')) return true;

        const text = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (/^(you\s*said\s*[:：]?)/.test(text) || /^((你说|您说)\s*[:：]?)/.test(text)) return true;

        if (el.querySelector(CLAUDE_USER_ANCHOR_SELECTORS)) return true;
    } catch {}
    return false;
}

function hasAssistantSignal(el) {
    if (!el) return false;
    try {
        const attrs = [
            String(el.getAttribute('data-message-author-role') || ''),
            String(el.getAttribute('data-role') || ''),
            String(el.getAttribute('data-turn') || ''),
            String(el.getAttribute('data-author') || ''),
            String(el.getAttribute('data-testid') || ''),
            String(el.getAttribute('aria-label') || ''),
            String(el.id || ''),
            String(el.className || '')
        ].join(' ').toLowerCase();
        if (/\b(assistant|claude|ai)\b/.test(attrs)) return true;

        const text = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (/^(claude\s*said\s*[:：]?)/.test(text)) return true;
    } catch {}
    return false;
}

function hasLikelyUserLayoutSignal(el) {
    if (!el) return false;
    try {
        const attrs = [
            String(el.getAttribute('class') || ''),
            String(el.getAttribute('id') || ''),
            String(el.getAttribute('data-testid') || ''),
            String(el.getAttribute('aria-label') || '')
        ].join(' ').toLowerCase();
        if (/(\buser\b|\bhuman\b|\boutgoing\b|\bme\b|\bright\b|justify-end|items-end|self-end|ml-auto)/.test(attrs)) return true;

        const style = window.getComputedStyle(el);
        if (style) {
            if (style.alignSelf === 'flex-end') return true;
            if (style.justifyContent === 'flex-end') return true;
            if (style.textAlign === 'right') return true;
            if (style.marginLeft === 'auto') return true;
        }
    } catch {}
    return false;
}

function hasLikelyUserLayoutAround(el, stopRoot) {
    try {
        let node = el;
        for (let i = 0; i < 8 && node && node !== stopRoot && node !== document.body; i++) {
            if (hasLikelyUserLayoutSignal(node)) return true;
            node = node.parentElement;
        }
    } catch {}
    return false;
}

function hasAssistantAncestor(el, stopRoot) {
    try {
        let node = el?.parentElement || null;
        while (node && node !== stopRoot && node !== document.body) {
            if (hasAssistantSignal(node)) return true;
            node = node.parentElement;
        }
    } catch {}
    return false;
}

function elementHasClaudeMedia(el) {
    try {
        return !!(el?.matches?.(CLAUDE_MEDIA_SELECTORS) || el?.querySelector?.(CLAUDE_MEDIA_SELECTORS));
    } catch {}
    return false;
}

function findTightMediaOnlyUserTurnTarget(media, root) {
    try {
        if (!media || hasAssistantAncestor(media, root)) return null;
        if (!hasLikelyUserLayoutAround(media, root)) return null;

        let node = media;
        let fallback = media;
        const mediaRect = media.getBoundingClientRect();

        for (let step = 0; step < 6 && node && node !== root && node !== document.body; step++) {
            if (!elementHasClaudeMedia(node)) break;

            const rect = node.getBoundingClientRect();
            const txt = String(node.textContent || '').replace(/\s+/g, ' ').trim();
            if (rect.width > 0 && rect.height > 0 && txt.length <= 80) {
                fallback = node;
            }

            const parent = node.parentElement;
            if (!parent) break;
            if (hasAssistantSignal(parent)) break;
            if (parent.matches?.(CLAUDE_MESSAGE_LIKE_SELECTOR)) break;

            const parentRect = parent.getBoundingClientRect();
            const parentText = String(parent.textContent || '').replace(/\s+/g, ' ').trim();
            const tooTall = parentRect.height > Math.max(rect.height + 180, mediaRect.height * 3 + 120);
            if (parentText.length > 80 || tooTall) break;

            node = parent;
        }

        return fallback;
    } catch {}
    return null;
}

function findCommonAncestorWithinRoot(a, b, root) {
    try {
        if (!a || !b || a === b) return a || b || null;
        let node = a;
        while (node && node !== root && node !== document.body) {
            if (node.contains?.(b)) return node;
            node = node.parentElement;
        }
        if (root?.contains?.(a) && root?.contains?.(b)) return root;
    } catch {}
    return null;
}

function mergeSiblingUserTurnPair(a, b, root) {
    try {
        if (!a || !b || a === b) return null;
        if (a.contains?.(b)) return a;
        if (b.contains?.(a)) return b;

        const lca = findCommonAncestorWithinRoot(a, b, root);
        if (!lca || lca === root || lca === document.body) return null;
        if (hasAssistantSignal(lca) || hasAssistantAncestor(a, lca) || hasAssistantAncestor(b, lca)) return null;

        const hasUserHints =
            hasUserSignal(lca) ||
            hasLikelyUserLayoutSignal(lca) ||
            hasLikelyUserLayoutAround(a, lca) ||
            hasLikelyUserLayoutAround(b, lca);
        if (!hasUserHints) return null;

        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const rl = lca.getBoundingClientRect();
        if (ra.width <= 0 || rb.width <= 0 || rl.width <= 0 || rl.height <= 0) return null;

        const mergedTop = Math.min(ra.top, rb.top);
        const mergedBottom = Math.max(ra.bottom, rb.bottom);
        const mergedHeight = Math.max(1, mergedBottom - mergedTop);
        const verticalGap = Math.max(0, Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom));
        const isTightWrapper = rl.height <= mergedHeight + 120;
        const isClosePair = verticalGap <= 120;

        if (!isTightWrapper || !isClosePair) return null;
        if (!elementHasClaudeMedia(lca) && !elementHasClaudeMedia(a) && !elementHasClaudeMedia(b)) return null;

        return lca;
    } catch {}
    return null;
}

function collectGenericMediaTurnFallback(root, pushUnique) {
    try {
        const candidates = root.querySelectorAll(CLAUDE_MESSAGE_LIKE_SELECTOR);
        for (const el of candidates) {
            if (!el) continue;
            if (!el.querySelector?.(CLAUDE_MEDIA_SELECTORS)) continue;
            if (hasAssistantSignal(el)) continue;

            if (hasUserSignal(el) || hasLikelyUserLayoutSignal(el)) {
                pushUnique(el);
                continue;
            }

            const hasUploadLike = !!el.querySelector('[data-testid*="upload" i], [data-testid*="file" i], a[href*="/files/"]');
            const txt = String(el.textContent || '').replace(/\s+/g, ' ').trim();
            if (hasUploadLike && txt.length <= 80) {
                pushUnique(el);
            }
        }
    } catch {}
}

function collectMediaOnlyUserTurnFallback(root, pushUnique) {
    try {
        const medias = root.querySelectorAll(CLAUDE_MEDIA_SELECTORS);
        for (const media of medias) {
            let node = media;
            let best = null;
            for (let step = 0; step < 16 && node && node !== root && node !== document.body; step++) {
                const parent = node.parentElement;
                if (!parent) break;
                node = parent;

                const maybeMessageLike = !!node.matches?.(CLAUDE_MESSAGE_LIKE_SELECTOR);
                if (!maybeMessageLike) continue;

                if (hasAssistantSignal(node)) continue;
                if (hasUserSignal(node)) {
                    best = node;
                    break;
                }
            }

            if (!best) {
                let scan = media;
                for (let step = 0; step < 16 && scan && scan !== root && scan !== document.body; step++) {
                    const parent = scan.parentElement;
                    if (!parent) break;
                    scan = parent;

                    if (hasAssistantSignal(scan)) break;
                    if (!scan.matches?.(CLAUDE_MESSAGE_LIKE_SELECTOR)) continue;

                    const hasMediaInside = !!scan.querySelector(CLAUDE_MEDIA_SELECTORS);
                    const hasUserAnchor = !!scan.querySelector(CLAUDE_USER_ANCHOR_SELECTORS);
                    if (hasMediaInside && hasUserAnchor) {
                        best = scan;
                        break;
                    }
                }
            }

            if (!best) {
                let scan = media;
                for (let step = 0; step < 20 && scan && scan !== root && scan !== document.body; step++) {
                    const parent = scan.parentElement;
                    if (!parent) break;
                    scan = parent;

                    if (!scan.matches?.(CLAUDE_MESSAGE_LIKE_SELECTOR)) continue;
                    if (hasAssistantSignal(scan)) continue;

                    const hasMediaInside = !!scan.querySelector(CLAUDE_MEDIA_SELECTORS);
                    if (!hasMediaInside) continue;

                    const txt = String(scan.textContent || '').replace(/\s+/g, ' ').trim();
                    if (txt.length > 80 && !hasUserSignal(scan)) continue;

                    best = scan;
                    break;
                }
            }

            if (!best) {
                best = findTightMediaOnlyUserTurnTarget(media, root);
            }

            if (best) pushUnique(best);
        }
    } catch {}
}




function collectUserAnchorOnlyFallback(root, pushUnique) {
    try {
        const anchors = root.querySelectorAll(CLAUDE_USER_ANCHOR_SELECTORS);
        for (const anchor of anchors) {
            let node = anchor;
            let best = null;
            for (let step = 0; step < 14 && node && node !== root && node !== document.body; step++) {
                const parent = node.parentElement;
                if (!parent) break;
                node = parent;

                if (!node.matches?.(CLAUDE_MESSAGE_LIKE_SELECTOR)) continue;
                if (hasAssistantSignal(node)) continue;

                const hasMediaInside = !!node.querySelector(CLAUDE_MEDIA_SELECTORS);
                if (!hasMediaInside) continue;

                best = node;
                break;
            }
            if (best) pushUnique(best);
        }
    } catch {}
}


function queryClaudeUserTurnElements(root = document) {
    try {
        const merged = [];
        const seen = new Set();
        const pushUnique = (el) => {
            if (!el || seen.has(el)) return;
            seen.add(el);
            merged.push(el);
        };

        for (const sel of CLAUDE_USER_TURN_SELECTORS) {
            const list = root.querySelectorAll(sel);
            if (!list || list.length === 0) continue;
            for (const el of list) pushUnique(el);
        }

        // Fallback: handle media-only user messages that main selectors miss.
        collectMediaOnlyUserTurnFallback(root, pushUnique);
        // Scan upward from user labels/avatars to locate media containers.
        collectUserAnchorOnlyFallback(root, pushUnique);
        // Generic media fallback based on user-side layout signals.
        collectGenericMediaTurnFallback(root, pushUnique);

        if (merged.length <= 1) return merged;

        merged.sort((a, b) => {
            if (a === b) return 0;
            const pos = a.compareDocumentPosition(b);
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
        });

        // Drop nested duplicates so one user message only gets one dot.
        const deduped = [];
        for (const el of merged) {
            const last = deduped[deduped.length - 1];
            if (!last) {
                deduped.push(el);
                continue;
            }
            if (last.contains(el)) {
                // Existing outer node already covers this inner node.
                continue;
            }
            if (el.contains(last)) {
                // Current node is the outer node; replace the inner node.
                deduped[deduped.length - 1] = el;
                continue;
            }
            const mergedSiblingTurn = mergeSiblingUserTurnPair(last, el, root);
            if (mergedSiblingTurn) {
                deduped[deduped.length - 1] = mergedSiblingTurn;
                continue;
            }
            deduped.push(el);
        }

        return deduped;
    } catch {}
    return [];
}


function queryFirstClaudeUserTurn(root = document) {
    try {
        const list = queryClaudeUserTurnElements(root);
        return list.length > 0 ? list[0] : null;
    } catch {
        return null;
    }
}

class TimelineManager {
    constructor() {
        this.scrollContainer = null;
        this.conversationContainer = null;
        this.markers = [];
        this.activeTurnId = null;
        this.ui = { timelineBar: null, tooltip: null };
        this.isScrolling = false;

        this.mutationObserver = null;
        this.resizeObserver = null;
        this.intersectionObserver = null;
        this.themeObserver = null; // observe theme class changes to refresh geometry
        this.visibleUserTurns = new Set();
        this.onTimelineBarClick = null;
        this.onScroll = null;
        this.onTimelineBarOver = null;
        this.onTimelineBarOut = null;
        this.onTimelineBarFocusIn = null;
        this.onTimelineBarFocusOut = null;
        this.onWindowResize = null;
        this.onTimelineWheel = null;
        this.scrollRafId = null;
        this.lastActiveChangeTime = 0;
        this.minActiveChangeInterval = 120; // ms
        this.pendingActiveId = null;
        this.activeChangeTimer = null;
        this.jumpFreezeUntil = 0;
        this.tooltipHideDelay = 100;
        this.tooltipHideTimer = null;
        this.measureEl = null; // legacy DOM measurer (kept as fallback)
        this.truncateCache = new Map();
        this.measureCanvas = null;
        this.measureCtx = null;
        this.showRafId = null;
        // Long-canvas scrollable track (Linked mode)
        this.ui.track = null;
        this.ui.trackContent = null;
        this.scale = 1;
        this.contentHeight = 0;
        this.yPositions = [];
        this.visibleRange = { start: 0, end: -1 };
        this.firstUserTurnOffset = 0;
        this.contentSpanPx = 1;
        this.usePixelTop = false; // fallback when CSS var positioning is unreliable
        this._cssVarTopSupported = null;
        // Left-side slider (only controls timeline scroll)
        this.ui.slider = null;
        this.ui.sliderHandle = null;
        this.sliderDragging = false;
        this.sliderFadeTimer = null;
        this.sliderFadeDelay = 1000;
        this.sliderAlwaysVisible = false; // show slider persistently when scrollable
        this.onSliderDown = null;
        this.onSliderMove = null;
        this.onSliderUp = null;
        this.markersVersion = 0;
        // Debug perf
        this.debugPerf = false;
        try { this.debugPerf = (localStorage.getItem('claudeTimelineDebugPerf') === '1'); } catch {}
        this.onVisualViewportResize = null;
        
        this.debouncedRecalculateAndRender = this.debounce(this.recalculateAndRenderMarkers, 350);

        // Star/Highlight feature state
        this.starred = new Set();
        this.markerMap = new Map();
        this.conversationId = this.extractConversationIdFromPath(location.pathname);
        // Long-press gesture state
        this.longPressDuration = 550; // ms
        this.longPressMoveTolerance = 6; // px
        this.longPressTimer = null;
        this.longPressTriggered = false;
        this.pressStartPos = null;
        this.pressTargetDot = null;
        this.suppressClickUntil = 0;
        // Cross-tab sync
        this.onStorage = null;
    }

    perfStart(name) {
        if (!this.debugPerf) return;
        try { performance.mark(`tg-${name}-start`); } catch {}
    }

    perfEnd(name) {
        if (!this.debugPerf) return;
        try {
            performance.mark(`tg-${name}-end`);
            performance.measure(`tg-${name}`, `tg-${name}-start`, `tg-${name}-end`);
            const entries = performance.getEntriesByName(`tg-${name}`).slice(-1)[0];
            if (entries) console.debug(`[TimelinePerf] ${name}: ${Math.round(entries.duration)}ms`);
        } catch {}
    }

    async init() {
        const elementsFound = await this.findCriticalElements();
        if (!elementsFound) return;
        
        this.injectTimelineUI();
        this.setupEventListeners();
        this.setupObservers();
        // Force an immediate first build so dots appear without waiting for mutations
        try { this.recalculateAndRenderMarkers(); } catch {}
        // Load persisted star markers for current conversation
        this.conversationId = this.extractConversationIdFromPath(location.pathname);
        this.loadStars();
        // After loading stars, sync current markers/dots to reflect star state immediately
        try {
            for (let i = 0; i < this.markers.length; i++) {
                const m = this.markers[i];
                const want = this.starred.has(m.id);
                if (m.starred !== want) {
                    m.starred = want;
                    if (m.dotElement) {
                        try {
                            m.dotElement.classList.toggle('starred', m.starred);
                            m.dotElement.setAttribute('aria-pressed', m.starred ? 'true' : 'false');
                        } catch {}
                    }
                }
            }
        } catch {}
        // Initial rendering will be triggered by observers; avoid duplicate delayed re-render
    }
    
    resolveConversationContainer(firstTurn) {
        if (!firstTurn) return null;
        try {
            let bestNode = firstTurn.parentElement;
            let bestCount = bestNode ? queryClaudeUserTurnElements(bestNode).length : 0;

            let node = firstTurn.parentElement;
            while (node && node !== document.body) {
                const count = queryClaudeUserTurnElements(node).length;
                if (count >= bestCount) {
                    bestNode = node;
                    bestCount = count;
                }
                node = node.parentElement;
            }

            if (bestCount <= 1) {
                const all = queryClaudeUserTurnElements(document);
                if (all.length > 1) {
                    const first = all[0];
                    const last = all[all.length - 1];
                    let lca = first.parentElement;
                    while (lca && !lca.contains(last)) lca = lca.parentElement;
                    if (lca) bestNode = lca;
                }
            }

            return bestNode || firstTurn.parentElement || null;
        } catch {
            return firstTurn.parentElement || null;
        }
    }

    async findCriticalElements() {
        const firstTurn = await this.waitForElementClaudeUser();
        if (!firstTurn) return false;

        this.conversationContainer = this.resolveConversationContainer(firstTurn);
        if (!this.conversationContainer) return false;

        let parent = this.conversationContainer;
        while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                this.scrollContainer = parent;
                break;
            }
            parent = parent.parentElement;
        }
        if (!this.scrollContainer) {
            this.scrollContainer = document.scrollingElement || document.documentElement || document.body;
        }
        return this.scrollContainer !== null;
    }
    
    injectTimelineUI() {
        // Idempotent: ensure bar exists, then ensure track + content exist
        let timelineBar = document.querySelector('.chatgpt-timeline-bar');
        if (!timelineBar) {
            timelineBar = document.createElement('div');
            timelineBar.className = 'chatgpt-timeline-bar';
            document.body.appendChild(timelineBar);
        }
        this.ui.timelineBar = timelineBar;
        // Track + content
        let track = this.ui.timelineBar.querySelector('.timeline-track');
        if (!track) {
            track = document.createElement('div');
            track.className = 'timeline-track';
            this.ui.timelineBar.appendChild(track);
        }
        let trackContent = track.querySelector('.timeline-track-content');
        if (!trackContent) {
            trackContent = document.createElement('div');
            trackContent.className = 'timeline-track-content';
            track.appendChild(trackContent);
        }
        this.ui.track = track;
        this.ui.trackContent = trackContent;
        // Ensure external left-side slider exists (outside the bar)
        let slider = document.querySelector('.timeline-left-slider');
        if (!slider) {
            slider = document.createElement('div');
            slider.className = 'timeline-left-slider';
            const handle = document.createElement('div');
            handle.className = 'timeline-left-handle';
            slider.appendChild(handle);
            document.body.appendChild(slider);
        }
        this.ui.slider = slider;
        this.ui.sliderHandle = slider.querySelector('.timeline-left-handle');
        // Visibility will be controlled by updateSlider() based on scrollable state
        if (!this.ui.tooltip) {
            const tip = document.createElement('div');
            tip.className = 'timeline-tooltip';
            tip.setAttribute('role', 'tooltip');
            tip.id = 'claude-timeline-tooltip';
            document.body.appendChild(tip);
            this.ui.tooltip = tip;
            // Hidden measurement node for legacy DOM truncation (fallback)
            if (!this.measureEl) {
                const m = document.createElement('div');
                m.setAttribute('aria-hidden', 'true');
                m.style.position = 'fixed';
                m.style.left = '-9999px';
                m.style.top = '0px';
                m.style.visibility = 'hidden';
                m.style.pointerEvents = 'none';
                const cs = getComputedStyle(tip);
                Object.assign(m.style, {
                    backgroundColor: cs.backgroundColor,
                    color: cs.color,
                    fontFamily: cs.fontFamily,
                    fontSize: cs.fontSize,
                    lineHeight: cs.lineHeight,
                    padding: cs.padding,
                    border: cs.border,
                    borderRadius: cs.borderRadius,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    maxWidth: 'none',
                    display: 'block',
                    transform: 'none',
                    transition: 'none'
                });
                // Ensure no clamping interferes with measurement
                try { m.style.webkitLineClamp = 'unset'; } catch {}
                document.body.appendChild(m);
                this.measureEl = m;
            }
            // Create canvas for text layout based truncation (primary)
            if (!this.measureCanvas) {
                this.measureCanvas = document.createElement('canvas');
                this.measureCtx = this.measureCanvas.getContext('2d');
            }
        }
    }

    ensureMarkerId(el, index = 0) {
        if (!el) return '';
        try {
            const fromTurnId = String(el.dataset?.turnId || '').trim();
            if (fromTurnId) {
                try { el.setAttribute('data-claude-timeline-id', fromTurnId); } catch {}
                return fromTurnId;
            }

            const existing = String(el.getAttribute('data-claude-timeline-id') || '').trim();
            if (existing) return existing;

            const fromDomId = String(el.id || '').trim();
            if (fromDomId) {
                const markerId = `dom-${fromDomId}`;
                try { el.setAttribute('data-claude-timeline-id', markerId); } catch {}
                return markerId;
            }

            const top = Number.isFinite(el.offsetTop) ? Math.round(el.offsetTop) : 0;
            const markerId = `turn-${index}-${top}`;
            try { el.setAttribute('data-claude-timeline-id', markerId); } catch {}
            return markerId;
        } catch {
            return '';
        }
    }

    getElementTopInScrollSpace(el) {
        if (!el) return 0;
        try {
            const sc = this.scrollContainer || document.scrollingElement || document.documentElement || document.body;
            const containerRect = sc.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            const scrollTop = Number.isFinite(sc.scrollTop) ? sc.scrollTop : 0;
            return rect.top - containerRect.top + scrollTop;
        } catch {
            return Number.isFinite(el.offsetTop) ? el.offsetTop : 0;
        }
    }

    recalculateAndRenderMarkers() {
        this.perfStart('recalc');
        if (!this.conversationContainer || !this.ui.timelineBar || !this.scrollContainer) return;

        const userTurnElements = queryClaudeUserTurnElements(this.conversationContainer);
        // Reset visible window to avoid cleaning with stale indices after rebuild
        this.visibleRange = { start: 0, end: -1 };
        // If the conversation is transiently empty (branch switching), don't wipe UI immediately
        if (userTurnElements.length === 0) {
            if (!this.zeroTurnsTimer) {
                this.zeroTurnsTimer = setTimeout(() => {
                    this.zeroTurnsTimer = null;
                    this.recalculateAndRenderMarkers();
                }, 350);
            }
            return;
        }
        if (this.zeroTurnsTimer) { try { clearTimeout(this.zeroTurnsTimer); } catch {} this.zeroTurnsTimer = null; }
        // Clear old dots from track/content (now that we know content exists)
        (this.ui.trackContent || this.ui.timelineBar).querySelectorAll('.timeline-dot').forEach(n => n.remove());

        let contentSpan;
        const firstTurnScrollTop = this.getElementTopInScrollSpace(userTurnElements[0]);
        if (userTurnElements.length < 2) {
            contentSpan = 1;
        } else {
            const lastTurnScrollTop = this.getElementTopInScrollSpace(userTurnElements[userTurnElements.length - 1]);
            contentSpan = lastTurnScrollTop - firstTurnScrollTop;
        }
        if (contentSpan <= 0) contentSpan = 1;

        // Cache for scroll mapping
        this.firstUserTurnOffset = firstTurnScrollTop;
        this.contentSpanPx = contentSpan;

        // Build markers with normalized position along conversation
        this.markerMap.clear();
        this.markers = Array.from(userTurnElements).map((el, index) => {
            const offsetFromStart = this.getElementTopInScrollSpace(el) - firstTurnScrollTop;
            let n = offsetFromStart / contentSpan;
            n = Math.max(0, Math.min(1, n));
            let markerId = this.ensureMarkerId(el, index);
            if (!markerId) markerId = `turn-${index}`;
            if (this.markerMap.has(markerId)) {
                markerId = `${markerId}-${index}`;
                try { el.setAttribute('data-claude-timeline-id', markerId); } catch {}
            }
            const summaryText = this.normalizeText(el.textContent || '');
            const hasMedia = elementHasClaudeMedia(el);
            const m = {
                id: markerId,
                element: el,
                summary: summaryText || (hasMedia ? '图片消息' : '用户消息'),
                n,
                baseN: n,
                dotElement: null,
                starred: false,
            };
            try { m.starred = this.starred.has(m.id); } catch {}
            this.markerMap.set(m.id, m);
            return m;
        });
        // Bump version after markers are rebuilt to invalidate concurrent passes
        this.markersVersion++;

        // Compute geometry and virtualize render
        this.updateTimelineGeometry();
        if (!this.activeTurnId && this.markers.length > 0) {
            this.activeTurnId = this.markers[this.markers.length - 1].id;
        }
        this.syncTimelineTrackToMain();
        this.updateVirtualRangeAndRender();
        // Ensure active class is applied after dots are created
        this.updateActiveDotUI();
        this.scheduleScrollSync();
        this.perfEnd('recalc');
    }
    
    setupObservers() {
        this.mutationObserver = new MutationObserver(() => {
            try { this.ensureContainersUpToDate(); } catch {}
            this.debouncedRecalculateAndRender();
            this.updateIntersectionObserverTargets();
        });
        this.mutationObserver.observe(this.conversationContainer, { childList: true, subtree: true });
        // Resize: update long-canvas geometry and virtualization
        this.resizeObserver = new ResizeObserver(() => {
            this.updateTimelineGeometry();
            this.syncTimelineTrackToMain();
            this.updateVirtualRangeAndRender();
        });
        if (this.ui.timelineBar) {
            this.resizeObserver.observe(this.ui.timelineBar);
        }

        this.intersectionObserver = new IntersectionObserver(entries => {
            // Maintain which user turns are currently visible
            entries.forEach(entry => {
                const target = entry.target;
                if (entry.isIntersecting) {
                    this.visibleUserTurns.add(target);
                } else {
                    this.visibleUserTurns.delete(target);
                }
            });

            // Defer active state decision to scroll-based computation
            this.scheduleScrollSync();
        }, { 
            root: this.scrollContainer,
            threshold: 0.1,
            rootMargin: "-40% 0px -59% 0px"
        });

        this.updateIntersectionObserverTargets();

        // Observe theme toggles (e.g., html.dark) to refresh geometry immediately
        try {
            if (!this.themeObserver) {
                this.themeObserver = new MutationObserver(() => {
                    this.updateTimelineGeometry();
                    this.syncTimelineTrackToMain();
                    this.updateVirtualRangeAndRender();
                });
            }
            this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        } catch {}
    }

    // Ensure our conversation/scroll containers are still current after DOM replacements
    ensureContainersUpToDate() {
        const first = queryFirstClaudeUserTurn(document);
        if (!first) return;
        const newConv = this.resolveConversationContainer(first);
        if (newConv && newConv !== this.conversationContainer) {
            // Rebind observers and listeners to the new conversation root
            this.rebindConversationContainer(newConv);
        }
    }

    rebindConversationContainer(newConv) {
        // Detach old listeners
        if (this.scrollContainer && this.onScroll) {
            try { this.scrollContainer.removeEventListener('scroll', this.onScroll); } catch {}
        }
        try { this.mutationObserver?.disconnect(); } catch {}
        try { this.intersectionObserver?.disconnect(); } catch {}
        try { this.themeObserver?.disconnect(); } catch {}

        this.conversationContainer = newConv;

        // Find (or re-find) scroll container
        let parent = newConv;
        let newScroll = null;
        while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                newScroll = parent; break;
            }
            parent = parent.parentElement;
        }
        if (!newScroll) newScroll = document.scrollingElement || document.documentElement || document.body;
        this.scrollContainer = newScroll;
        // Reattach scroll listener
        this.onScroll = () => this.scheduleScrollSync();
        this.scrollContainer.addEventListener('scroll', this.onScroll, { passive: true });

        // Recreate IntersectionObserver with new root
        this.intersectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const target = entry.target;
                if (entry.isIntersecting) { this.visibleUserTurns.add(target); }
                else { this.visibleUserTurns.delete(target); }
            });
            this.scheduleScrollSync();
        }, { root: this.scrollContainer, threshold: 0.1, rootMargin: "-40% 0px -59% 0px" });
        this.updateIntersectionObserverTargets();

        // Re-observe mutations on the new conversation container
        this.mutationObserver.observe(this.conversationContainer, { childList: true, subtree: true });

        // Force a recalc right away to rebuild markers
        this.recalculateAndRenderMarkers();
    }

    updateIntersectionObserverTargets() {
        if (!this.intersectionObserver || !this.conversationContainer) return;
        this.intersectionObserver.disconnect();
        this.visibleUserTurns.clear();
        const userTurns = queryClaudeUserTurnElements(this.conversationContainer);
        userTurns.forEach((el, index) => {
            const markerId = this.ensureMarkerId(el, index);
            if (markerId) this.intersectionObserver.observe(el);
        });
    }

    setupEventListeners() {
        this.onTimelineBarClick = (e) => {
            const dot = e.target.closest('.timeline-dot');
            if (dot) {
                const now = Date.now();
                if (now < (this.suppressClickUntil || 0)) {
                    try { e.preventDefault(); e.stopPropagation(); } catch {}
                    return;
                }
                const targetId = dot.dataset.targetTurnId;
                let targetElement = null;
                const marker = targetId ? this.markerMap.get(targetId) : null;
                if (marker?.element) targetElement = marker.element;
                if (!targetElement && targetId) {
                    const safeId = (window.CSS && typeof window.CSS.escape === 'function')
                        ? window.CSS.escape(targetId)
                        : String(targetId).replace(/"/g, '\\"');
                    targetElement = this.conversationContainer.querySelector(`[data-claude-timeline-id="${safeId}"]`);
                }
                if (targetElement) {
                    // Jump should immediately reflect target highlight, then let scroll sync continue
                    if (targetId) {
                        this.activeTurnId = targetId;
                        this.pendingActiveId = null;
                        if (this.activeChangeTimer) {
                            try { clearTimeout(this.activeChangeTimer); } catch {}
                            this.activeChangeTimer = null;
                        }
                        this.lastActiveChangeTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                        this.jumpFreezeUntil = Date.now() + 900;
                        this.updateActiveDotUI();
                    }
                    this.smoothScrollTo(targetElement);
                }
            }
        };
        this.ui.timelineBar.addEventListener('click', this.onTimelineBarClick);
        // Long-press gesture on dots (delegated on bar)
        this.onPointerDown = (ev) => {
            const dot = ev.target.closest?.('.timeline-dot');
            if (!dot) return;
            if (typeof ev.button === 'number' && ev.button !== 0) return; // left button only
            this.cancelLongPress();
            this.pressTargetDot = dot;
            this.pressStartPos = { x: ev.clientX, y: ev.clientY };
            try { dot.classList.add('holding'); } catch {}
            this.longPressTriggered = false;
            this.longPressTimer = setTimeout(() => {
                this.longPressTimer = null;
                if (!this.pressTargetDot) return;
                const id = this.pressTargetDot.dataset.targetTurnId;
                this.toggleStar(id);
                this.longPressTriggered = true;
                this.suppressClickUntil = Date.now() + 350;
                // If tooltip is visible for this dot, refresh immediately to reflect 鈽?prefix change
                try { this.refreshTooltipForDot(this.pressTargetDot); } catch {}
                try { this.pressTargetDot.classList.remove('holding'); } catch {}
            }, this.longPressDuration);
        };
        this.onPointerMove = (ev) => {
            if (!this.pressTargetDot || !this.pressStartPos) return;
            const dx = ev.clientX - this.pressStartPos.x;
            const dy = ev.clientY - this.pressStartPos.y;
            if ((dx * dx + dy * dy) > (this.longPressMoveTolerance * this.longPressMoveTolerance)) {
                this.cancelLongPress();
            }
        };
        this.onPointerUp = () => { this.cancelLongPress(); };
        this.onPointerCancel = () => { this.cancelLongPress(); };
        this.onPointerLeave = (ev) => {
            const dot = ev.target.closest?.('.timeline-dot');
            if (dot && dot === this.pressTargetDot) this.cancelLongPress();
        };
        try {
            this.ui.timelineBar.addEventListener('pointerdown', this.onPointerDown);
            window.addEventListener('pointermove', this.onPointerMove, { passive: true });
            window.addEventListener('pointerup', this.onPointerUp, { passive: true });
            window.addEventListener('pointercancel', this.onPointerCancel, { passive: true });
            this.ui.timelineBar.addEventListener('pointerleave', this.onPointerLeave);
        } catch {}
        // Listen to container scroll to keep marker active state in sync
        this.onScroll = () => this.scheduleScrollSync();
        this.scrollContainer.addEventListener('scroll', this.onScroll, { passive: true });

        // Tooltip interactions (delegated)
        this.onTimelineBarOver = (e) => {
            const dot = e.target.closest('.timeline-dot');
            if (dot) this.showTooltipForDot(dot);
        };
        this.onTimelineBarOut = (e) => {
            const fromDot = e.target.closest('.timeline-dot');
            const toDot = e.relatedTarget?.closest?.('.timeline-dot');
            if (fromDot && !toDot) this.hideTooltip();
        };
        this.onTimelineBarFocusIn = (e) => {
            const dot = e.target.closest('.timeline-dot');
            if (dot) this.showTooltipForDot(dot);
        };
        this.onTimelineBarFocusOut = (e) => {
            const dot = e.target.closest('.timeline-dot');
            if (dot) this.hideTooltip();
        };
        this.ui.timelineBar.addEventListener('mouseover', this.onTimelineBarOver);
        this.ui.timelineBar.addEventListener('mouseout', this.onTimelineBarOut);
        this.ui.timelineBar.addEventListener('focusin', this.onTimelineBarFocusIn);
        this.ui.timelineBar.addEventListener('focusout', this.onTimelineBarFocusOut);

        // Slider visibility on hover (time axis or slider itself) with stable refs
        // Define and persist handlers so we can remove them in destroy()
        this.onBarEnter = () => this.showSlider();
        this.onBarLeave = () => this.hideSliderDeferred();
        this.onSliderEnter = () => this.showSlider();
        this.onSliderLeave = () => this.hideSliderDeferred();
        try {
            this.ui.timelineBar.addEventListener('pointerenter', this.onBarEnter);
            this.ui.timelineBar.addEventListener('pointerleave', this.onBarLeave);
            if (this.ui.slider) {
                this.ui.slider.addEventListener('pointerenter', this.onSliderEnter);
                this.ui.slider.addEventListener('pointerleave', this.onSliderLeave);
            }
        } catch {}

        // Reposition tooltip on resize
        this.onWindowResize = () => {
            if (this.ui.tooltip?.classList.contains('visible')) {
                const activeDot = this.ui.timelineBar.querySelector('.timeline-dot:hover, .timeline-dot:focus');
                if (activeDot) {
                    // Re-run T0->T1 to avoid layout during animation
                    const tip = this.ui.tooltip;
                    tip.classList.remove('visible');
                    let fullText = (activeDot.getAttribute('aria-label') || '').trim();
                    try {
                        const id = activeDot.dataset.targetTurnId;
                if (id && this.starred.has(id)) fullText = `★ ${fullText}`;
                    } catch {}
                    const p = this.computePlacementInfo(activeDot);
                    const layout = this.truncateToThreeLines(fullText, p.width, true);
                    tip.textContent = layout.text;
                    this.placeTooltipAt(activeDot, p.placement, p.width, layout.height);
                    if (this.showRafId !== null) {
                        try { cancelAnimationFrame(this.showRafId); } catch {}
                        this.showRafId = null;
                    }
                    this.showRafId = requestAnimationFrame(() => {
                        this.showRafId = null;
                        tip.classList.add('visible');
                    });
                }
            }
            // Update long-canvas geometry and virtualization
            this.updateTimelineGeometry();
            this.syncTimelineTrackToMain();
            this.updateVirtualRangeAndRender();
        };
        window.addEventListener('resize', this.onWindowResize);
        // VisualViewport resize can fire on zoom on some platforms; schedule correction
        if (window.visualViewport) {
            this.onVisualViewportResize = () => {
                this.updateTimelineGeometry();
                this.syncTimelineTrackToMain();
                this.updateVirtualRangeAndRender();
            };
            try { window.visualViewport.addEventListener('resize', this.onVisualViewportResize); } catch {}
        }

        // Scroll wheel on the timeline controls the main scroll container (Linked mode)
        this.onTimelineWheel = (e) => {
            // Prevent page from attempting to scroll anything else
            try { e.preventDefault(); } catch {}
            const delta = e.deltaY || 0;
            this.scrollContainer.scrollTop += delta;
            // Keep markers in sync on next frame
            this.scheduleScrollSync();
            this.showSlider();
        };
        this.ui.timelineBar.addEventListener('wheel', this.onTimelineWheel, { passive: false });

        // Slider drag handlers
        this.onSliderDown = (ev) => {
            if (!this.ui.sliderHandle) return;
            try { this.ui.sliderHandle.setPointerCapture(ev.pointerId); } catch {}
            this.sliderDragging = true;
            this.showSlider();
            this.sliderStartClientY = ev.clientY;
            const rect = this.ui.sliderHandle.getBoundingClientRect();
            this.sliderStartTop = rect.top;
            this.onSliderMove = (e) => this.handleSliderDrag(e);
            this.onSliderUp = (e) => this.endSliderDrag(e);
            window.addEventListener('pointermove', this.onSliderMove);
            window.addEventListener('pointerup', this.onSliderUp, { once: true });
        };
        try { this.ui.sliderHandle?.addEventListener('pointerdown', this.onSliderDown); } catch {}

        // Cross-tab star sync via localStorage 'storage' event
        this.onStorage = (e) => {
            try {
                if (!e || e.storageArea !== localStorage) return;
                const cid = this.conversationId;
                if (!cid) return;
                const expectedKey = `claudeTimelineStars:${cid}`;
                if (e.key !== expectedKey) return;

                // Parse new star set
                let nextArr = [];
                try { nextArr = JSON.parse(e.newValue || '[]') || []; } catch { nextArr = []; }
                const nextSet = new Set(nextArr.map(x => String(x)));

                // Fast no-op check: if sizes match and all entries exist, skip
                if (nextSet.size === this.starred.size) {
                    let same = true;
                    for (const id of this.starred) { if (!nextSet.has(id)) { same = false; break; } }
                    if (same) return;
                }

                // Apply to in-memory set
                this.starred = nextSet;

                // Update markers and any visible dots
                for (let i = 0; i < this.markers.length; i++) {
                    const m = this.markers[i];
                    const want = this.starred.has(m.id);
                    if (m.starred !== want) {
                        m.starred = want;
                        if (m.dotElement) {
                            try {
                                m.dotElement.classList.toggle('starred', m.starred);
                                m.dotElement.setAttribute('aria-pressed', m.starred ? 'true' : 'false');
                            } catch {}
                        }
                    }
                }

                // If a tooltip is currently visible over any dot, refresh it to reflect 鈽?
                try {
                    if (this.ui.tooltip?.classList.contains('visible')) {
                        const currentDot = this.ui.timelineBar.querySelector('.timeline-dot:hover, .timeline-dot:focus');
                        if (currentDot) this.refreshTooltipForDot(currentDot);
                    }
                } catch {}
            } catch {}
        };
        try { window.addEventListener('storage', this.onStorage); } catch {}
    }
    
    smoothScrollTo(targetElement, duration = 600) {
        if (!targetElement) return;
        const root = document.scrollingElement || document.documentElement || document.body;
        const isRootScroll = !this.scrollContainer
            || this.scrollContainer === root
            || this.scrollContainer === document.documentElement
            || this.scrollContainer === document.body;

        if (isRootScroll) {
            try {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                return;
            } catch {}
        }

        if (!this.scrollContainer || typeof this.scrollContainer.scrollTop !== 'number') {
            try {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            } catch {}
            return;
        }

        const containerRect = this.scrollContainer.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const targetPosition = targetRect.top - containerRect.top + this.scrollContainer.scrollTop;
        const startPosition = this.scrollContainer.scrollTop;
        const distance = targetPosition - startPosition;
        let startTime = null;

        const animation = (currentTime) => {
            this.isScrolling = true;
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = this.easeInOutQuad(timeElapsed, startPosition, distance, duration);
            this.scrollContainer.scrollTop = run;
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            } else {
                this.scrollContainer.scrollTop = targetPosition;
                this.isScrolling = false;
            }
        };
        requestAnimationFrame(animation);
    }
    
    easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    updateActiveDotUI() {
        this.markers.forEach(marker => {
            marker.dotElement?.classList.toggle('active', marker.id === this.activeTurnId);
        });
    }

    debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Read numeric CSS var from the timeline bar element
    getCSSVarNumber(el, name, fallback) {
        const v = getComputedStyle(el).getPropertyValue(name).trim();
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    }

    // Normalize whitespace and trim; remove leading SR-only prefixes like "You said:" / "你说:"; no manual ellipsis.
    normalizeText(text) {
        try {
            let s = String(text || '').replace(/\s+/g, ' ').trim();
            // Strip only if it appears at the very start
            s = s.replace(/^\s*(you\s*said\s*[:：]?\s*)/i, '');
            s = s.replace(/^\s*((你说|您说)\s*[:：]?\s*)/, '');
            return s;
        } catch {
            return '';
        }
    }

    getTrackPadding() {
        if (!this.ui.timelineBar) return 12;
        return this.getCSSVarNumber(this.ui.timelineBar, '--timeline-track-padding', 12);
    }

    getMinGap() {
        if (!this.ui.timelineBar) return 12;
        return this.getCSSVarNumber(this.ui.timelineBar, '--timeline-min-gap', 12);
    }

    // Enforce a minimum pixel gap between positions while staying within bounds
    applyMinGap(positions, minTop, maxTop, gap) {
        const n = positions.length;
        if (n === 0) return positions;
        const out = positions.slice();
        // Clamp first and forward pass (monotonic increasing)
        out[0] = Math.max(minTop, Math.min(positions[0], maxTop));
        for (let i = 1; i < n; i++) {
            const minAllowed = out[i - 1] + gap;
            out[i] = Math.max(positions[i], minAllowed);
        }
        // If last exceeds max, backward pass
        if (out[n - 1] > maxTop) {
            out[n - 1] = maxTop;
            for (let i = n - 2; i >= 0; i--) {
                const maxAllowed = out[i + 1] - gap;
                out[i] = Math.min(out[i], maxAllowed);
            }
            // Ensure first still within min
            if (out[0] < minTop) {
                out[0] = minTop;
                for (let i = 1; i < n; i++) {
                    const minAllowed = out[i - 1] + gap;
                    out[i] = Math.max(out[i], minAllowed);
                }
            }
        }
        // Final clamp
        for (let i = 0; i < n; i++) {
            if (out[i] < minTop) out[i] = minTop;
            if (out[i] > maxTop) out[i] = maxTop;
        }
        return out;
    }

    // (Removed) Idle min-gap reapply; ChatGPT keeps min-gap solely in updateTimelineGeometry

    showTooltipForDot(dot) {
        if (!this.ui.tooltip) return;
        try { if (this.tooltipHideTimer) { clearTimeout(this.tooltipHideTimer); this.tooltipHideTimer = null; } } catch {}
        // T0: compute + write geometry while hidden
        const tip = this.ui.tooltip;
        tip.classList.remove('visible');
        let fullText = (dot.getAttribute('aria-label') || '').trim();
        try {
            const id = dot.dataset.targetTurnId;
            if (id && this.starred.has(id)) {
                fullText = `★ ${fullText}`;
            }
        } catch {}
        const p = this.computePlacementInfo(dot);
        const layout = this.truncateToThreeLines(fullText, p.width, true);
        tip.textContent = layout.text;
        this.placeTooltipAt(dot, p.placement, p.width, layout.height);
        tip.setAttribute('aria-hidden', 'false');
        // T1: next frame add visible for non-geometric animation only
        if (this.showRafId !== null) {
            try { cancelAnimationFrame(this.showRafId); } catch {}
            this.showRafId = null;
        }
        this.showRafId = requestAnimationFrame(() => {
            this.showRafId = null;
            tip.classList.add('visible');
        });
    }

    hideTooltip(immediate = false) {
        if (!this.ui.tooltip) return;
        const doHide = () => {
            this.ui.tooltip.classList.remove('visible');
            this.ui.tooltip.setAttribute('aria-hidden', 'true');
            this.tooltipHideTimer = null;
        };
        if (immediate) return doHide();
        try { if (this.tooltipHideTimer) { clearTimeout(this.tooltipHideTimer); } } catch {}
        this.tooltipHideTimer = setTimeout(doHide, this.tooltipHideDelay);
    }

    placeTooltipAt(dot, placement, width, height) {
        if (!this.ui.tooltip) return;
        const tip = this.ui.tooltip;
        const dotRect = dot.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const arrowOut = this.getCSSVarNumber(tip, '--timeline-tooltip-arrow-outside', 6);
        const baseGap = this.getCSSVarNumber(tip, '--timeline-tooltip-gap-visual', 12);
        const boxGap = this.getCSSVarNumber(tip, '--timeline-tooltip-gap-box', 8);
        const gap = baseGap + Math.max(0, arrowOut) + Math.max(0, boxGap);
        const viewportPad = 8;

        let left;
        if (placement === 'left') {
            left = Math.round(dotRect.left - gap - width);
            if (left < viewportPad) {
                // Clamp within viewport: switch to right if impossible
                const altLeft = Math.round(dotRect.right + gap);
                if (altLeft + width <= vw - viewportPad) {
                    placement = 'right';
                    left = altLeft;
                } else {
                    // shrink width to fit
                    const fitWidth = Math.max(120, vw - viewportPad - altLeft);
                    left = altLeft;
                    width = fitWidth;
                }
            }
        } else {
            left = Math.round(dotRect.right + gap);
            if (left + width > vw - viewportPad) {
                const altLeft = Math.round(dotRect.left - gap - width);
                if (altLeft >= viewportPad) {
                    placement = 'left';
                    left = altLeft;
                } else {
                    const fitWidth = Math.max(120, vw - viewportPad - left);
                    width = fitWidth;
                }
            }
        }

        let top = Math.round(dotRect.top + dotRect.height / 2 - height / 2);
        top = Math.max(viewportPad, Math.min(vh - height - viewportPad, top));
        tip.style.width = `${Math.floor(width)}px`;
        tip.style.height = `${Math.floor(height)}px`;
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
        tip.setAttribute('data-placement', placement);
    }

    // Refresh the currently visible tooltip for a given dot in place (no hide/show flicker)
    refreshTooltipForDot(dot) {
        if (!this.ui?.tooltip || !dot) return;
        const tip = this.ui.tooltip;
        // Only update when tooltip is currently visible
        const isVisible = tip.classList.contains('visible');
        if (!isVisible) return;

        let fullText = (dot.getAttribute('aria-label') || '').trim();
        try {
            const id = dot.dataset.targetTurnId;
            if (id && this.starred.has(id)) fullText = `★ ${fullText}`;
        } catch {}
        const p = this.computePlacementInfo(dot);
        const layout = this.truncateToThreeLines(fullText, p.width, true);
        tip.textContent = layout.text;
        this.placeTooltipAt(dot, p.placement, p.width, layout.height);
    }

    // --- Long-canvas geometry and virtualization (Linked mode) ---
    updateTimelineGeometry() {
        if (!this.ui.timelineBar || !this.ui.trackContent) return;
        const H = this.ui.timelineBar.clientHeight || 0;
        const pad = this.getTrackPadding();
        const minGap = this.getMinGap();
        const N = this.markers.length;
        // Content height ensures minGap between consecutive dots
        const desired = Math.max(H, (N > 0 ? (2 * pad + Math.max(0, N - 1) * minGap) : H));
        this.contentHeight = Math.ceil(desired);
        this.scale = (H > 0) ? (this.contentHeight / H) : 1;
        try { this.ui.trackContent.style.height = `${this.contentHeight}px`; } catch {}

        // Precompute desired Y from normalized baseN and enforce min-gap
        const usableC = Math.max(1, this.contentHeight - 2 * pad);
        const desiredY = this.markers.map(m => pad + Math.max(0, Math.min(1, (m.baseN ?? m.n ?? 0))) * usableC);
        const adjusted = this.applyMinGap(desiredY, pad, pad + usableC, minGap);
        this.yPositions = adjusted;
        // Update normalized n for CSS positioning
        for (let i = 0; i < N; i++) {
            const top = adjusted[i];
            const n = (top - pad) / usableC;
            this.markers[i].n = Math.max(0, Math.min(1, n));
            if (this.markers[i].dotElement && !this.usePixelTop) {
                try { this.markers[i].dotElement.style.setProperty('--n', String(this.markers[i].n)); } catch {}
            }
        }
        if (this._cssVarTopSupported === null) {
            this._cssVarTopSupported = this.detectCssVarTopSupport(pad, usableC);
            this.usePixelTop = !this._cssVarTopSupported;
        }
        this.updateSlider();
        // First-time nudge: if content is scrollable, briefly reveal slider
        const barH = this.ui.timelineBar?.clientHeight || 0;
        if (this.contentHeight > barH + 1) {
            this.sliderAlwaysVisible = true;
            this.showSlider();
        } else {
            this.sliderAlwaysVisible = false;
        }
    }

    detectCssVarTopSupport(pad, usableC) {
        try {
            if (!this.ui.trackContent) return false;
            const test = document.createElement('button');
            test.className = 'timeline-dot';
            test.style.visibility = 'hidden';
            test.style.pointerEvents = 'none';
            test.setAttribute('aria-hidden', 'true');
            const expected = pad + 0.5 * usableC;
            test.style.setProperty('--n', '0.5');
            this.ui.trackContent.appendChild(test);
            const cs = getComputedStyle(test);
            const topStr = cs.top || '';
            const px = parseFloat(topStr);
            test.remove();
            if (!Number.isFinite(px)) return false;
            return Math.abs(px - expected) <= 2;
        } catch {
            return false;
        }
    }

    syncTimelineTrackToMain() {
        if (this.sliderDragging) return; // do not override when user drags slider
        if (!this.ui.track || !this.scrollContainer || !this.contentHeight) return;
        const scrollTop = this.scrollContainer.scrollTop;
        const ref = scrollTop + this.scrollContainer.clientHeight * 0.45;
        const span = Math.max(1, this.contentSpanPx || 1);
        const r = Math.max(0, Math.min(1, (ref - (this.firstUserTurnOffset || 0)) / span));
        const maxScroll = Math.max(0, this.contentHeight - (this.ui.track.clientHeight || 0));
        const target = Math.round(r * maxScroll);
        if (Math.abs((this.ui.track.scrollTop || 0) - target) > 1) {
            this.ui.track.scrollTop = target;
        }
    }

    updateVirtualRangeAndRender() {
        const localVersion = this.markersVersion;
        if (!this.ui.track || !this.ui.trackContent || this.markers.length === 0) return;
        const st = this.ui.track.scrollTop || 0;
        const vh = this.ui.track.clientHeight || 0;
        const buffer = Math.max(100, vh);
        const minY = st - buffer;
        const maxY = st + vh + buffer;
        const start = this.lowerBound(this.yPositions, minY);
        const end = Math.max(start - 1, this.upperBound(this.yPositions, maxY));

        let prevStart = this.visibleRange.start;
        let prevEnd = this.visibleRange.end;
        const len = this.markers.length;
        // Clamp previous indices into current bounds to avoid undefined access
        if (len > 0) {
            prevStart = Math.max(0, Math.min(prevStart, len - 1));
            prevEnd = Math.max(-1, Math.min(prevEnd, len - 1));
        }
        if (prevEnd >= prevStart) {
            for (let i = prevStart; i < Math.min(start, prevEnd + 1); i++) {
                const m = this.markers[i];
                if (m && m.dotElement) { try { m.dotElement.remove(); } catch {} m.dotElement = null; }
            }
            for (let i = Math.max(end + 1, prevStart); i <= prevEnd; i++) {
                const m = this.markers[i];
                if (m && m.dotElement) { try { m.dotElement.remove(); } catch {} m.dotElement = null; }
            }
        } else {
            (this.ui.trackContent || this.ui.timelineBar).querySelectorAll('.timeline-dot').forEach(n => n.remove());
            this.markers.forEach(m => { m.dotElement = null; });
        }

        const frag = document.createDocumentFragment();
        for (let i = start; i <= end; i++) {
            const marker = this.markers[i];
            if (!marker) continue;
            if (!marker.dotElement) {
                const dot = document.createElement('button');
                dot.className = 'timeline-dot';
                dot.dataset.targetTurnId = marker.id;
                dot.setAttribute('aria-label', marker.summary);
                dot.setAttribute('tabindex', '0');
                try { dot.setAttribute('aria-describedby', 'claude-timeline-tooltip'); } catch {}
                try { dot.style.setProperty('--n', String(marker.n || 0)); } catch {}
                if (this.usePixelTop) {
                    dot.style.top = `${Math.round(this.yPositions[i])}px`;
                }
                // Apply active state immediately if this is the active marker
                try { dot.classList.toggle('active', marker.id === this.activeTurnId); } catch {}
                // Apply starred state and aria
                try {
                    dot.classList.toggle('starred', !!marker.starred);
                    dot.setAttribute('aria-pressed', marker.starred ? 'true' : 'false');
                } catch {}
                marker.dotElement = dot;
                frag.appendChild(dot);
            } else {
                try { marker.dotElement.style.setProperty('--n', String(marker.n || 0)); } catch {}
                if (this.usePixelTop) {
                    marker.dotElement.style.top = `${Math.round(this.yPositions[i])}px`;
                }
                try {
                    marker.dotElement.classList.toggle('starred', !!marker.starred);
                    marker.dotElement.setAttribute('aria-pressed', marker.starred ? 'true' : 'false');
                } catch {}
            }
        }
        if (localVersion !== this.markersVersion) return; // stale pass, abort
        if (frag.childNodes.length) this.ui.trackContent.appendChild(frag);
        this.visibleRange = { start, end };
        // keep slider in sync with timeline scroll
        this.updateSlider();
    }

    lowerBound(arr, x) {
        let lo = 0, hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid] < x) lo = mid + 1; else hi = mid;
        }
        return lo;
    }

    upperBound(arr, x) {
        let lo = 0, hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid] <= x) lo = mid + 1; else hi = mid;
        }
        return lo - 1;
    }

    // --- Left slider helpers ---
    updateSlider() {
        if (!this.ui.slider || !this.ui.sliderHandle) return;
        if (!this.contentHeight || !this.ui.timelineBar || !this.ui.track) return;
        const barRect = this.ui.timelineBar.getBoundingClientRect();
        const barH = barRect.height || 0;
        const pad = this.getTrackPadding();
        const innerH = Math.max(0, barH - 2 * pad);
        if (this.contentHeight <= barH + 1 || innerH <= 0) {
            this.sliderAlwaysVisible = false;
            try {
                this.ui.slider.classList.remove('visible');
                this.ui.slider.style.opacity = '';
            } catch {}
            return;
        }
        this.sliderAlwaysVisible = true;
        // External slider geometry (short rail centered on inner area)
        const railLen = Math.max(120, Math.min(240, Math.floor(barH * 0.45)));
        const railTop = Math.round(barRect.top + pad + (innerH - railLen) / 2);
        const railLeftGap = 8; // px gap from bar's left edge
        const sliderWidth = 12; // matches CSS
        const left = Math.round(barRect.left - railLeftGap - sliderWidth);
        this.ui.slider.style.left = `${left}px`;
        this.ui.slider.style.top = `${railTop}px`;
        this.ui.slider.style.height = `${railLen}px`;

        const handleH = 22; // fixed concise handle
        const maxTop = Math.max(0, railLen - handleH);
        const range = Math.max(1, this.contentHeight - barH);
        const st = this.ui.track.scrollTop || 0;
        const r = Math.max(0, Math.min(1, st / range));
        const top = Math.round(r * maxTop);
        this.ui.sliderHandle.style.height = `${handleH}px`;
        this.ui.sliderHandle.style.top = `${top}px`;
        try {
            this.ui.slider.classList.add('visible');
            this.ui.slider.style.opacity = '';
        } catch {}
    }

    showSlider() {
        if (!this.ui.slider) return;
        this.ui.slider.classList.add('visible');
        if (this.sliderFadeTimer) { try { clearTimeout(this.sliderFadeTimer); } catch {} this.sliderFadeTimer = null; }
        this.updateSlider();
    }

    hideSliderDeferred() {
        if (this.sliderDragging || this.sliderAlwaysVisible) return;
        if (this.sliderFadeTimer) { try { clearTimeout(this.sliderFadeTimer); } catch {} }
        this.sliderFadeTimer = setTimeout(() => {
            this.sliderFadeTimer = null;
            try { this.ui.slider?.classList.remove('visible'); } catch {}
        }, this.sliderFadeDelay);
    }

    handleSliderDrag(e) {
        if (!this.sliderDragging || !this.ui.timelineBar || !this.ui.track) return;
        const barRect = this.ui.timelineBar.getBoundingClientRect();
        const barH = barRect.height || 0;
        const railLen = parseFloat(this.ui.slider.style.height || '0') || Math.max(120, Math.min(240, Math.floor(barH * 0.45)));
        const handleH = this.ui.sliderHandle.getBoundingClientRect().height || 22;
        const maxTop = Math.max(0, railLen - handleH);
        const delta = e.clientY - this.sliderStartClientY;
        let top = Math.max(0, Math.min(maxTop, (this.sliderStartTop + delta) - (parseFloat(this.ui.slider.style.top) || 0)));
        const r = (maxTop > 0) ? (top / maxTop) : 0;
        const range = Math.max(1, this.contentHeight - barH);
        this.ui.track.scrollTop = Math.round(r * range);
        this.updateVirtualRangeAndRender();
        this.showSlider();
        this.updateSlider();
    }

    endSliderDrag(e) {
        this.sliderDragging = false;
        try { window.removeEventListener('pointermove', this.onSliderMove); } catch {}
        this.onSliderMove = null;
        this.onSliderUp = null;
        this.hideSliderDeferred();
    }

    computePlacementInfo(dot) {
        const tip = this.ui.tooltip || document.body;
        const dotRect = dot.getBoundingClientRect();
        const vw = window.innerWidth;
        const arrowOut = this.getCSSVarNumber(tip, '--timeline-tooltip-arrow-outside', 6);
        const baseGap = this.getCSSVarNumber(tip, '--timeline-tooltip-gap-visual', 12);
        const boxGap = this.getCSSVarNumber(tip, '--timeline-tooltip-gap-box', 8);
        const gap = baseGap + Math.max(0, arrowOut) + Math.max(0, boxGap);
        const viewportPad = 8;
        const maxW = this.getCSSVarNumber(tip, '--timeline-tooltip-max', 288);
        const minW = 160;
        const leftAvail = Math.max(0, dotRect.left - gap - viewportPad);
        const rightAvail = Math.max(0, vw - dotRect.right - gap - viewportPad);
        let placement = (rightAvail > leftAvail) ? 'right' : 'left';
        let avail = placement === 'right' ? rightAvail : leftAvail;
        // choose width tier for determinism
        const tiers = [280, 240, 200, 160];
        const hardMax = Math.max(minW, Math.min(maxW, Math.floor(avail)));
        let width = tiers.find(t => t <= hardMax) || Math.max(minW, Math.min(hardMax, 160));
        // if no tier fits (very tight), try switching side
        if (width < minW && placement === 'left' && rightAvail > leftAvail) {
            placement = 'right';
            avail = rightAvail;
            const hardMax2 = Math.max(minW, Math.min(maxW, Math.floor(avail)));
            width = tiers.find(t => t <= hardMax2) || Math.max(120, Math.min(hardMax2, minW));
        } else if (width < minW && placement === 'right' && leftAvail >= rightAvail) {
            placement = 'left';
            avail = leftAvail;
            const hardMax2 = Math.max(minW, Math.min(maxW, Math.floor(avail)));
            width = tiers.find(t => t <= hardMax2) || Math.max(120, Math.min(hardMax2, minW));
        }
        width = Math.max(120, Math.min(width, maxW));
        return { placement, width };
    }

    truncateToThreeLines(text, targetWidth, wantLayout = false) {
        try {
            if (!this.measureEl || !this.ui.tooltip) return wantLayout ? { text, height: 0 } : text;
            const tip = this.ui.tooltip;
            const lineH = this.getCSSVarNumber(tip, '--timeline-tooltip-lh', 18);
            const padY = this.getCSSVarNumber(tip, '--timeline-tooltip-pad-y', 10);
            const borderW = this.getCSSVarNumber(tip, '--timeline-tooltip-border-w', 1);
            const maxH = Math.round(3 * lineH + 2 * padY + 2 * borderW);
            const ell = '...';
            const el = this.measureEl;
            el.style.width = `${Math.max(0, Math.floor(targetWidth))}px`;

            // fast path: full text fits within 3 lines
            el.textContent = String(text || '').replace(/\s+/g, ' ').trim();
            let h = el.offsetHeight;
            if (h <= maxH) {
                return wantLayout ? { text: el.textContent, height: h } : el.textContent;
            }

            // binary search longest prefix that fits
            const raw = el.textContent;
            let lo = 0, hi = raw.length, ans = 0;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                el.textContent = raw.slice(0, mid).trimEnd() + ell;
                h = el.offsetHeight;
                if (h <= maxH) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
            }
            const out = (ans >= raw.length) ? raw : (raw.slice(0, ans).trimEnd() + ell);
            el.textContent = out;
            h = el.offsetHeight;
            return wantLayout ? { text: out, height: Math.min(h, maxH) } : out;
        } catch {
            return wantLayout ? { text, height: 0 } : text;
        }
    }

    scheduleScrollSync() {
        if (this.scrollRafId !== null) return;
        this.scrollRafId = requestAnimationFrame(() => {
            this.scrollRafId = null;
            // Sync long-canvas scroll and virtualized dots before computing active
            this.syncTimelineTrackToMain();
            this.updateVirtualRangeAndRender();
            this.computeActiveByScroll();
            this.updateSlider();
        });
    }

    computeActiveByScroll() {
        if (!this.scrollContainer || this.markers.length === 0) return;
        if ((Date.now() || 0) < (this.jumpFreezeUntil || 0)) return;
        const containerRect = this.scrollContainer.getBoundingClientRect();
        const scrollTop = this.scrollContainer.scrollTop;
        const ref = scrollTop + this.scrollContainer.clientHeight * 0.45;

        let activeId = this.markers[0].id;
        for (let i = 0; i < this.markers.length; i++) {
            const m = this.markers[i];
            const top = m.element.getBoundingClientRect().top - containerRect.top + scrollTop;
            if (top <= ref) {
                activeId = m.id;
            } else {
                break;
            }
        }
        if (this.activeTurnId !== activeId) {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const since = now - this.lastActiveChangeTime;
            if (since < this.minActiveChangeInterval) {
                // Coalesce rapid changes during fast scrolling/layout shifts
                this.pendingActiveId = activeId;
                if (!this.activeChangeTimer) {
                    const delay = Math.max(this.minActiveChangeInterval - since, 0);
                    this.activeChangeTimer = setTimeout(() => {
                        this.activeChangeTimer = null;
                        if (this.pendingActiveId && this.pendingActiveId !== this.activeTurnId) {
                            this.activeTurnId = this.pendingActiveId;
                            this.updateActiveDotUI();
                            this.lastActiveChangeTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                        }
                        this.pendingActiveId = null;
                    }, delay);
                }
            } else {
                this.activeTurnId = activeId;
                this.updateActiveDotUI();
                this.lastActiveChangeTime = now;
            }
        }
    }

    waitForElementClaudeUser(timeoutMs = 5000) {
        return new Promise((resolve) => {
            const current = queryFirstClaudeUserTurn(document);
            if (current) return resolve(current);
            const observer = new MutationObserver(() => {
                const found = queryFirstClaudeUserTurn(document);
                if (found) {
                    try { observer.disconnect(); } catch {}
                    resolve(found);
                }
            });
            try { observer.observe(document.body, { childList: true, subtree: true }); } catch {}
            setTimeout(() => { try { observer.disconnect(); } catch {} resolve(null); }, timeoutMs);
        });
    }

    destroy() {
        try { this.mutationObserver?.disconnect(); } catch {}
        try { this.resizeObserver?.disconnect(); } catch {}
        try { this.intersectionObserver?.disconnect(); } catch {}
        this.visibleUserTurns.clear();
        if (this.ui.timelineBar && this.onTimelineBarClick) {
            try { this.ui.timelineBar.removeEventListener('click', this.onTimelineBarClick); } catch {}
        }
        try { window.removeEventListener('storage', this.onStorage); } catch {}
        try { this.ui.timelineBar?.removeEventListener('pointerdown', this.onPointerDown); } catch {}
        try { window.removeEventListener('pointermove', this.onPointerMove); } catch {}
        try { window.removeEventListener('pointerup', this.onPointerUp); } catch {}
        try { window.removeEventListener('pointercancel', this.onPointerCancel); } catch {}
        try { this.ui.timelineBar?.removeEventListener('pointerleave', this.onPointerLeave); } catch {}
        if (this.scrollContainer && this.onScroll) {
            try { this.scrollContainer.removeEventListener('scroll', this.onScroll); } catch {}
        }
        if (this.ui.timelineBar) {
            try { this.ui.timelineBar.removeEventListener('mouseover', this.onTimelineBarOver); } catch {}
            try { this.ui.timelineBar.removeEventListener('mouseout', this.onTimelineBarOut); } catch {}
            try { this.ui.timelineBar.removeEventListener('focusin', this.onTimelineBarFocusIn); } catch {}
            try { this.ui.timelineBar.removeEventListener('focusout', this.onTimelineBarFocusOut); } catch {}
            try { this.ui.timelineBar.removeEventListener('wheel', this.onTimelineWheel); } catch {}
            // Remove hover handlers with stable refs
            try { this.ui.timelineBar?.removeEventListener('pointerenter', this.onBarEnter); } catch {}
            try { this.ui.timelineBar?.removeEventListener('pointerleave', this.onBarLeave); } catch {}
            try { this.ui.slider?.removeEventListener('pointerenter', this.onSliderEnter); } catch {}
            try { this.ui.slider?.removeEventListener('pointerleave', this.onSliderLeave); } catch {}
            this.onBarEnter = this.onBarLeave = this.onSliderEnter = this.onSliderLeave = null;
        }
        try { this.ui.sliderHandle?.removeEventListener('pointerdown', this.onSliderDown); } catch {}
        try { window.removeEventListener('pointermove', this.onSliderMove); } catch {}
        if (this.onWindowResize) {
            try { window.removeEventListener('resize', this.onWindowResize); } catch {}
        }
        if (this.onVisualViewportResize && window.visualViewport) {
            try { window.visualViewport.removeEventListener('resize', this.onVisualViewportResize); } catch {}
            this.onVisualViewportResize = null;
        }
        if (this.scrollRafId !== null) {
            try { cancelAnimationFrame(this.scrollRafId); } catch {}
            this.scrollRafId = null;
        }
        try { this.ui.timelineBar?.remove(); } catch {}
        try { this.ui.tooltip?.remove(); } catch {}
        try { this.measureEl?.remove(); } catch {}
        // Ensure external left slider is fully removed and not intercepting pointer events
        try {
            if (this.ui.slider) {
                try { this.ui.slider.style.pointerEvents = 'none'; } catch {}
                try { this.ui.slider.remove(); } catch {}
            }
            const straySlider = document.querySelector('.timeline-left-slider');
            if (straySlider) {
                try { straySlider.style.pointerEvents = 'none'; } catch {}
                try { straySlider.remove(); } catch {}
            }
        } catch {}
        this.ui.slider = null;
        this.ui.sliderHandle = null;
        this.ui = { timelineBar: null, tooltip: null };
        this.markers = [];
        this.activeTurnId = null;
        this.scrollContainer = null;
        this.conversationContainer = null;
        this.onTimelineBarClick = null;
        this.onTimelineBarOver = null;
        this.onTimelineBarOut = null;
        this.onTimelineBarFocusIn = null;
        this.onTimelineBarFocusOut = null;
        this.onScroll = null;
        this.onWindowResize = null;
        if (this.activeChangeTimer) {
            try { clearTimeout(this.activeChangeTimer); } catch {}
            this.activeChangeTimer = null;
        }
        if (this.tooltipHideTimer) {
            try { clearTimeout(this.tooltipHideTimer); } catch {}
            this.tooltipHideTimer = null;
        }
        
        if (this.sliderFadeTimer) { try { clearTimeout(this.sliderFadeTimer); } catch {} this.sliderFadeTimer = null; }
        this.pendingActiveId = null;
    }

    // --- Star/Highlight helpers ---
    extractConversationIdFromPath(pathname = location.pathname) {
        try {
            const segs = String(pathname || '').split('/').filter(Boolean);
            // Claude route: /chat/<conversationId>
            const i = segs.indexOf('chat');
            if (i === -1) return null;
            const slug = segs[i + 1];
            if (!slug || slug === 'new') return null;
            if (/^[A-Za-z0-9._-]+$/.test(slug)) return slug;
            return null;
        } catch { return null; }
    }

    loadStars() {
        this.starred.clear();
        const cid = this.conversationId;
        if (!cid) return;
        try {
            const raw = localStorage.getItem(`claudeTimelineStars:${cid}`);
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) arr.forEach(id => this.starred.add(String(id)));
        } catch {}
    }

    saveStars() {
        const cid = this.conversationId;
        if (!cid) return;
        try { localStorage.setItem(`claudeTimelineStars:${cid}`, JSON.stringify(Array.from(this.starred))); } catch {}
    }

    toggleStar(turnId) {
        const id = String(turnId || '');
        if (!id) return;
        if (this.starred.has(id)) this.starred.delete(id); else this.starred.add(id);
        this.saveStars();
        const m = this.markerMap.get(id);
        if (m) {
            m.starred = this.starred.has(id);
            if (m.dotElement) {
                try {
                    m.dotElement.classList.toggle('starred', m.starred);
                    m.dotElement.setAttribute('aria-pressed', m.starred ? 'true' : 'false');
                } catch {}
                // If tooltip is visible and anchored to this dot, update immediately
                try { this.refreshTooltipForDot(m.dotElement); } catch {}
            }
        }
    }

    cancelLongPress() {
        if (this.longPressTimer) { try { clearTimeout(this.longPressTimer); } catch {} this.longPressTimer = null; }
        if (this.pressTargetDot) { try { this.pressTargetDot.classList.remove('holding'); } catch {} }
        this.pressTargetDot = null;
        this.pressStartPos = null;
        this.longPressTriggered = false;
    }
}


// --- Entry Point and SPA Navigation Handler ---
let timelineManagerInstance = null;
let currentUrl = location.href;
let initTimerId = null;            // cancellable delayed init
let pageObserver = null;           // page-level MutationObserver (managed)
let routeCheckIntervalId = null;   // lightweight href polling fallback
let routeListenersAttached = false;
let timelineActive = true;         // global on/off
let providerEnabled = true;        // per-provider on/off (claude)

// Accept Claude conversation route: /chat/<id>
function isConversationRoute(pathname = location.pathname) {
  const segs = String(pathname || '').split('/').filter(Boolean);
  const i = segs.indexOf('chat');
  if (i === -1) return false;
  const slug = segs[i + 1];
  if (!slug || slug === 'new') return false;
  return /^[A-Za-z0-9._-]+$/.test(slug);
}

function attachRouteListenersOnce() {
    if (routeListenersAttached) return;
    routeListenersAttached = true;
    try { window.addEventListener('popstate', handleUrlChange); } catch {}
    try { window.addEventListener('hashchange', handleUrlChange); } catch {}
    // Lightweight polling fallback for pushState-driven SPA changes
    try {
        routeCheckIntervalId = setInterval(() => {
            if (location.href !== currentUrl) handleUrlChange();
        }, 800);
    } catch {}
}

function detachRouteListeners() {
    if (!routeListenersAttached) return;
    routeListenersAttached = false;
    try { window.removeEventListener('popstate', handleUrlChange); } catch {}
    try { window.removeEventListener('hashchange', handleUrlChange); } catch {}
    try { if (routeCheckIntervalId) { clearInterval(routeCheckIntervalId); routeCheckIntervalId = null; } } catch {}
}

function cleanupGlobalObservers() {
    try { pageObserver?.disconnect(); } catch {}
    pageObserver = null;
}

function initializeTimeline() {
    if (timelineManagerInstance) {
        try { timelineManagerInstance.destroy(); } catch {}
        timelineManagerInstance = null;
    }
    // Remove any leftover UI before creating a new instance
    try { document.querySelector('.chatgpt-timeline-bar')?.remove(); } catch {}
    try { document.querySelector('.timeline-left-slider')?.remove(); } catch {}
    try { document.getElementById('claude-timeline-tooltip')?.remove(); } catch {}
    timelineManagerInstance = new TimelineManager();
    timelineManagerInstance.init().catch(err => console.error("Timeline initialization failed:", err));
 }

function handleUrlChange() {
    if (location.href === currentUrl) return;
    currentUrl = location.href;

    // Cancel any pending init from previous route
    try { if (initTimerId) { clearTimeout(initTimerId); initTimerId = null; } } catch {}

    if (isConversationRoute() && (timelineActive && providerEnabled)) {
        // Delay slightly to allow DOM to settle; re-check path before init
        initTimerId = setTimeout(() => {
            initTimerId = null;
            if (isConversationRoute() && (timelineActive && providerEnabled)) initializeTimeline();
        }, 300);
    } else {
        if (timelineManagerInstance) {
            try { timelineManagerInstance.destroy(); } catch {}
            timelineManagerInstance = null;
        }
        try { document.querySelector('.chatgpt-timeline-bar')?.remove(); } catch {}
        try { document.querySelector('.timeline-left-slider')?.remove(); } catch {}
        try { document.getElementById('claude-timeline-tooltip')?.remove(); } catch {}
        cleanupGlobalObservers();
    }
}

const initialObserver = new MutationObserver(() => {
    if (queryFirstClaudeUserTurn(document)) {
        if (isConversationRoute() && (timelineActive && providerEnabled)) { initializeTimeline(); }
        try { initialObserver.disconnect(); } catch {}
        // Create a single managed pageObserver
        pageObserver = new MutationObserver(handleUrlChange);
        try { pageObserver.observe(document.body, { childList: true, subtree: true }); } catch {}
        attachRouteListenersOnce();
    }
});
try { initialObserver.observe(document.body, { childList: true, subtree: true }); } catch {}

// Read initial toggles (new keys only) and react to changes
try {
  if (chrome?.storage?.local) {
    chrome.storage.local.get({ timelineActive: true, timelineProviders: {} }, (res) => {
      try { timelineActive = !!res.timelineActive; } catch { timelineActive = true; }
      try {
        const map = res.timelineProviders || {};
        providerEnabled = (typeof map.claude === 'boolean') ? map.claude : true;
      } catch { providerEnabled = true; }

      const enabled = timelineActive && providerEnabled;
      if (!enabled) {
        if (timelineManagerInstance) { try { timelineManagerInstance.destroy(); } catch {} timelineManagerInstance = null; }
        try { document.querySelector('.chatgpt-timeline-bar')?.remove(); } catch {}
        try { document.querySelector('.timeline-left-slider')?.remove(); } catch {}
        try { document.getElementById('claude-timeline-tooltip')?.remove(); } catch {}
      } else {
        if (isConversationRoute() && queryFirstClaudeUserTurn(document)) {
          initializeTimeline();
        }
      }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes) return;
      let changed = false;
      if ('timelineActive' in changes) {
        timelineActive = !!changes.timelineActive.newValue;
        changed = true;
      }
      if ('timelineProviders' in changes) {
        try {
          const map = changes.timelineProviders.newValue || {};
          providerEnabled = (typeof map.claude === 'boolean') ? map.claude : true;
          changed = true;
        } catch {}
      }
      if (!changed) return;
      const enabled = timelineActive && providerEnabled;
      if (!enabled) {
        if (timelineManagerInstance) { try { timelineManagerInstance.destroy(); } catch {} timelineManagerInstance = null; }
        try { document.querySelector('.chatgpt-timeline-bar')?.remove(); } catch {}
        try { document.querySelector('.timeline-left-slider')?.remove(); } catch {}
        try { document.getElementById('claude-timeline-tooltip')?.remove(); } catch {}
      } else {
        if (isConversationRoute() && queryFirstClaudeUserTurn(document)) {
          initializeTimeline();
        }
      }
    });
  }
} catch {}

