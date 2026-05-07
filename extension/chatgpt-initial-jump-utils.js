(function (root, factory) {
  const api = factory();
  root.ChatGPTInitialJumpUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function evaluateInitialJumpReadiness(input = {}) {
    const stableFrames = Math.max(0, Number(input.stableFrames) || 0);
    const previousScrollTop = Number(input.previousScrollTop);
    const currentScrollTop = Number(input.currentScrollTop);
    const previousScrollHeight = Number(input.previousScrollHeight);
    const currentScrollHeight = Number(input.currentScrollHeight);
    const previousAnchorTop = Number(input.previousAnchorTop);
    const currentAnchorTop = Number(input.currentAnchorTop);
    const positionEpsilon = Math.max(0, Number(input.positionEpsilon) || 2);
    const sizeEpsilon = Math.max(0, Number(input.sizeEpsilon) || 2);
    const requiredStableFrames = Math.max(1, Number(input.requiredStableFrames) || 4);
    const elapsedMs = Math.max(0, Number(input.elapsedMs) || 0);
    const minReadyMs = Math.max(0, Number(input.minReadyMs) || 0);

    if (
      !Number.isFinite(previousScrollTop) ||
      !Number.isFinite(currentScrollTop) ||
      !Number.isFinite(previousScrollHeight) ||
      !Number.isFinite(currentScrollHeight) ||
      !Number.isFinite(previousAnchorTop) ||
      !Number.isFinite(currentAnchorTop)
    ) {
      return {
        frameStable: false,
        stableFrames: 0,
        ready: false
      };
    }

    const maxPositionDelta = Math.max(
      Math.abs(currentScrollTop - previousScrollTop),
      Math.abs(currentAnchorTop - previousAnchorTop)
    );
    const sizeDelta = Math.abs(currentScrollHeight - previousScrollHeight);
    const frameStable = maxPositionDelta <= positionEpsilon && sizeDelta <= sizeEpsilon;
    const nextStableFrames = frameStable ? stableFrames + 1 : 0;

    return {
      frameStable,
      stableFrames: nextStableFrames,
      ready: nextStableFrames >= requiredStableFrames && elapsedMs >= minReadyMs
    };
  }

  function evaluateScrollCorrection(input = {}) {
    const delta = Math.abs(Number(input.delta) || 0);
    const stableFrames = Math.max(0, Number(input.stableFrames) || 0);
    const now = Number(input.now) || 0;
    const deadline = Number(input.deadline) || 0;
    const epsilon = Math.max(0, Number(input.epsilon) || 2);
    const requiredStableFrames = Math.max(1, Number(input.requiredStableFrames) || 6);
    return {
      needsWrite: delta > epsilon,
      shouldContinue: now < deadline && (delta > epsilon || stableFrames < requiredStableFrames)
    };
  }

  function pickBestScrollableCandidate(candidates = []) {
    let bestNonDocument = null;
    let bestDocument = null;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const overflow = Math.max(0, Number(candidate.overflow) || 0);
      if (overflow <= 0) continue;
      const depth = Math.max(0, Number(candidate.depth) || 0);
      const isDocument = !!candidate.isDocument;
      const normalized = { ...candidate, overflow, isDocument, depth };
      if (isDocument) {
        if (!bestDocument || overflow > bestDocument.overflow) bestDocument = normalized;
        continue;
      }
      if (!bestNonDocument || depth < bestNonDocument.depth || (depth === bestNonDocument.depth && overflow > bestNonDocument.overflow)) {
        bestNonDocument = normalized;
      }
    }
    return bestNonDocument || bestDocument;
  }

  function resolveScrollAnchoring(input = {}) {
    return input.active ? 'none' : String(input.fallback || '');
  }

  function resolveScrollFocusOffset(input = {}) {
    const containerScrollPaddingTop = Math.max(0, Number(input.containerScrollPaddingTop) || 0);
    const fallbackOffset = Math.max(0, Number(input.fallbackOffset) || 0);
    const gapOffset = Math.max(0, Number(input.gapOffset) || 0);
    return (containerScrollPaddingTop > 0 ? containerScrollPaddingTop : fallbackOffset) + gapOffset;
  }

  function resolveScrollTarget(input = {}) {
    const rawTop = Number(input.rawTop);
    const focusOffset = Math.max(0, Number(input.focusOffset) || 0);
    if (!Number.isFinite(rawTop)) return NaN;
    return rawTop - focusOffset;
  }

  function resolveActiveReferenceY(input = {}) {
    const scrollTop = Number(input.scrollTop) || 0;
    const focusOffset = Math.max(0, Number(input.focusOffset) || 0);
    const epsilon = Math.max(0, Number(input.epsilon) || 2);
    return scrollTop + focusOffset + epsilon;
  }

  function normalizeMarkerPositions(input = {}) {
    const positions = Array.isArray(input.positions) ? input.positions : [];
    const previous = Array.isArray(input.previous) ? input.previous : [];
    if (!positions.length) return [];
    if (positions.some(position => !Number.isFinite(Number(position)))) {
      return previous.length === positions.length ? previous.slice() : positions.map(() => 0);
    }
    const first = Number(positions[0]);
    const last = Number(positions[positions.length - 1]);
    const span = Math.max(1, last - first);
    return positions.map(position => {
      const normalized = (Number(position) - first) / span;
      return Math.max(0, Math.min(1, normalized));
    });
  }

  function selectActiveIndex(input = {}) {
    const positions = Array.isArray(input.positions) ? input.positions : [];
    const referenceY = Number(input.referenceY);
    if (!positions.length || !Number.isFinite(referenceY)) return 0;
    let active = 0;
    for (let i = 0; i < positions.length; i++) {
      const position = Number(positions[i]);
      if (!Number.isFinite(position)) continue;
      if (position <= referenceY) active = i;
      else break;
    }
    return Math.max(0, Math.min(positions.length - 1, active));
  }

  return {
    evaluateInitialJumpReadiness,
    evaluateScrollCorrection,
    normalizeMarkerPositions,
    pickBestScrollableCandidate,
    resolveActiveReferenceY,
    resolveScrollAnchoring,
    resolveScrollFocusOffset,
    resolveScrollTarget,
    selectActiveIndex
  };
});
