// Runs in page's MAIN world (has access to React fiber internals).
// Content scripts cannot read expando properties like __reactFiber$xxx due to
// world isolation. This bridge listens for a custom DOM event from the content
// script, reads fiber data for virtualized user-turn elements, and passes the
// text back via CustomEvent.detail — zero DOM modifications, zero traces.
document.addEventListener('timeline-extract-fiber', () => {
  try {
    const result = {};
    const extractTextFromValue = (value, depth = 0, seen = new Set()) => {
      if (!value || depth > 8) return '';
      if (typeof value === 'string') return value;
      if (typeof value !== 'object') return '';
      if (seen.has(value)) return '';
      seen.add(value);

      try {
        const parts = value?.content?.parts || value?.message?.content?.parts;
        if (Array.isArray(parts)) {
          const text = parts.filter(p => typeof p === 'string').join(' ');
          if (text) return text;
        }
        const messages = value?.turn?.messages || value?.messages;
        if (Array.isArray(messages)) {
          for (const message of messages) {
            const text = extractTextFromValue(message, depth + 1, seen);
            if (text) return text;
          }
        }
        for (const key of ['memoizedProps', 'pendingProps', 'return', 'child', 'sibling']) {
          const text = extractTextFromValue(value[key], depth + 1, seen);
          if (text) return text;
        }
      } catch {}
      return '';
    };

    document.querySelectorAll('[data-turn="user"][data-turn-id]').forEach(el => {
      try {
        const domText = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (domText) return;
        const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        if (!fk) return;
        const txt = extractTextFromValue(el[fk]);
        if (txt) result[el.getAttribute('data-turn-id')] = txt;
      } catch {}
    });
    document.dispatchEvent(new CustomEvent('timeline-fiber-result', { detail: result }));
  } catch {}
});
