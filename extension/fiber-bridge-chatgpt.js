// Runs in page's MAIN world (has access to React fiber internals).
// Content scripts cannot read expando properties like __reactFiber$xxx due to
// world isolation. This bridge listens for a custom DOM event from the content
// script, reads fiber data for virtualized user-turn elements, and passes the
// text back via CustomEvent.detail — zero DOM modifications, zero traces.
document.addEventListener('timeline-extract-fiber', () => {
  try {
    const result = {};
    document.querySelectorAll('[data-turn="user"][data-turn-id]').forEach(el => {
      if (el.childElementCount > 0) return; // has DOM content, skip
      try {
        const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        if (!fk) return;
        const turn = el[fk]?.return?.memoizedProps?.turn;
        if (!turn?.messages?.length) return;
        const parts = turn.messages[0]?.content?.parts;
        if (!Array.isArray(parts)) return;
        const txt = parts.filter(p => typeof p === 'string').join(' ');
        if (txt) result[el.getAttribute('data-turn-id')] = txt;
      } catch {}
    });
    document.dispatchEvent(new CustomEvent('timeline-fiber-result', { detail: result }));
  } catch {}
});
