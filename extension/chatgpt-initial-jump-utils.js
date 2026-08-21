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

  function shouldRunTimelineJump(input = {}) {
    const targetId = String(input.targetId || '').trim();
    const activeTurnId = String(input.activeTurnId || '').trim();
    if (!targetId) return false;
    if (activeTurnId && targetId === activeTurnId) return false;
    return true;
  }

  function normalizeMarkerRatios(input = {}) {
    const positions = Array.isArray(input.positions) ? input.positions : [];
    const previous = Array.isArray(input.previous) ? input.previous : [];
    if (!positions.length) return [];
    const numericPositions = positions.map(position => Number(position));
    const previousRatios = previous.map(ratio => Number(ratio));
    const hasPrevious = previousRatios.length === positions.length && previousRatios.every(ratio => Number.isFinite(ratio));
    const fallback = () => hasPrevious ? previous.slice() : positions.map(() => 0);
    if (numericPositions.some(position => !Number.isFinite(position))) {
      return fallback();
    }
    for (let i = 1; i < numericPositions.length; i++) {
      if (numericPositions[i] <= numericPositions[i - 1]) {
        return fallback();
      }
    }
    if (numericPositions.length > 1 && (numericPositions[numericPositions.length - 1] - numericPositions[0]) < 1) {
      return fallback();
    }
    if (numericPositions.length === 1) {
      return hasPrevious ? previousRatios.map(ratio => Math.max(0, Math.min(1, ratio))) : [0];
    }
    const first = numericPositions[0];
    const last = numericPositions[numericPositions.length - 1];
    const span = Math.max(1, last - first);
    const normalized = numericPositions.map(position => {
      const normalized = (position - first) / span;
      return Math.max(0, Math.min(1, normalized));
    });
    if (input.preservePreviousOnSkew && hasPrevious && normalized.length >= 4) {
      const gaps = ratios => {
        const out = [];
        for (let i = 1; i < ratios.length; i++) out.push(Math.max(0, Number(ratios[i]) - Number(ratios[i - 1])));
        return out;
      };
      const candidateGaps = gaps(normalized);
      const previousGaps = gaps(previousRatios);
      const candidateMax = Math.max(...candidateGaps);
      const candidateMin = Math.min(...candidateGaps.filter(gap => gap > 0));
      const previousMax = Math.max(...previousGaps);
      const previousMin = Math.min(...previousGaps.filter(gap => gap > 0));
      const candidateSpread = candidateMin > 0 ? candidateMax / candidateMin : Infinity;
      const previousSpread = previousMin > 0 ? previousMax / previousMin : Infinity;
      if (Number.isFinite(previousSpread) && candidateSpread > Math.max(6, previousSpread * 4)) {
        return previous.slice();
      }
    }
    return normalized;
  }

  function mapLiveReferenceToVisualRatio(input = {}) {
    const livePositions = Array.isArray(input.livePositions) ? input.livePositions : [];
    const visualRatios = Array.isArray(input.visualRatios) ? input.visualRatios : [];
    const referenceY = Number(input.referenceY);
    if (!livePositions.length || livePositions.length !== visualRatios.length || !Number.isFinite(referenceY)) return 0;
    const firstLive = Number(livePositions[0]);
    const firstRatio = Number(visualRatios[0]);
    if (!Number.isFinite(firstLive) || !Number.isFinite(firstRatio)) return 0;
    if (referenceY <= firstLive) return Math.max(0, Math.min(1, firstRatio));

    for (let i = 1; i < livePositions.length; i++) {
      const prevLive = Number(livePositions[i - 1]);
      const nextLive = Number(livePositions[i]);
      const prevRatio = Number(visualRatios[i - 1]);
      const nextRatio = Number(visualRatios[i]);
      if (
        !Number.isFinite(prevLive) ||
        !Number.isFinite(nextLive) ||
        !Number.isFinite(prevRatio) ||
        !Number.isFinite(nextRatio)
      ) {
        continue;
      }
      if (referenceY <= nextLive) {
        const span = Math.max(1, nextLive - prevLive);
        const progress = Math.max(0, Math.min(1, (referenceY - prevLive) / span));
        return Math.max(0, Math.min(1, prevRatio + (nextRatio - prevRatio) * progress));
      }
    }

    const lastRatio = Number(visualRatios[visualRatios.length - 1]);
    return Math.max(0, Math.min(1, Number.isFinite(lastRatio) ? lastRatio : 1));
  }

  function calculateTimelineContentHeight(input = {}) {
    const viewportHeight = Math.max(0, Number(input.viewportHeight) || 0);
    const padding = Math.max(0, Number(input.padding) || 0);
    const minGap = Math.max(0, Number(input.minGap) || 0);
    const markerRatios = Array.isArray(input.markerRatios) ? input.markerRatios : [];
    const markerCount = markerRatios.length;
    const countHeight = markerCount > 0 ? (2 * padding + Math.max(0, markerCount - 1) * minGap) : viewportHeight;
    let desired = Math.max(viewportHeight, countHeight);

    let minRatioGap = Infinity;
    let previous = null;
    for (const value of markerRatios) {
      const ratio = Number(value);
      if (!Number.isFinite(ratio)) continue;
      const clamped = Math.max(0, Math.min(1, ratio));
      if (previous !== null) {
        const gap = clamped - previous;
        if (gap > 0) minRatioGap = Math.min(minRatioGap, gap);
      }
      previous = clamped;
    }

    if (Number.isFinite(minRatioGap) && minRatioGap > 0 && minGap > 0) {
      desired = Math.max(desired, 2 * padding + minGap / minRatioGap);
    }

    return Math.ceil(desired);
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
    calculateTimelineContentHeight,
    mapLiveReferenceToVisualRatio,
    normalizeMarkerRatios,
    shouldRunTimelineJump,
    pickBestScrollableCandidate,
    resolveActiveReferenceY,
    resolveScrollAnchoring,
    resolveScrollFocusOffset,
    resolveScrollTarget,
    selectActiveIndex
  };
});
