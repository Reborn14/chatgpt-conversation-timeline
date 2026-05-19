const assert = require('node:assert/strict');

const {
  evaluateInitialJumpReadiness,
  evaluateScrollCorrection,
  calculateTimelineContentHeight,
  mapLiveReferenceToVisualRatio,
  normalizeMarkerRatios,
  pickBestScrollableCandidate,
  resolveActiveReferenceY,
  resolveScrollAnchoring,
  resolveScrollFocusOffset,
  resolveScrollTarget,
  shouldRunTimelineJump,
  selectActiveIndex,
  normalizeChatGPTTurnText
} = require('../extension/chatgpt-initial-jump-utils.js');

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

run('evaluateInitialJumpReadiness keeps initial jumps blocked while layout metrics move', () => {
  assert.deepEqual(evaluateInitialJumpReadiness({
    stableFrames: 2,
    previousScrollTop: 120,
    currentScrollTop: 124,
    previousScrollHeight: 5000,
    currentScrollHeight: 5080,
    previousAnchorTop: 800,
    currentAnchorTop: 812
  }), {
    frameStable: false,
    stableFrames: 0,
    ready: false
  });
});

run('evaluateInitialJumpReadiness allows initial jumps after enough stable frames', () => {
  assert.deepEqual(evaluateInitialJumpReadiness({
    stableFrames: 3,
    previousScrollTop: 120,
    currentScrollTop: 121,
    previousScrollHeight: 5000,
    currentScrollHeight: 5001,
    previousAnchorTop: 800,
    currentAnchorTop: 801,
    requiredStableFrames: 4
  }), {
    frameStable: true,
    stableFrames: 4,
    ready: true
  });
});

run('evaluateInitialJumpReadiness waits for the minimum initial settle window', () => {
  assert.deepEqual(evaluateInitialJumpReadiness({
    stableFrames: 3,
    previousScrollTop: 120,
    currentScrollTop: 121,
    previousScrollHeight: 5000,
    currentScrollHeight: 5001,
    previousAnchorTop: 800,
    currentAnchorTop: 801,
    requiredStableFrames: 4,
    elapsedMs: 100,
    minReadyMs: 250
  }), {
    frameStable: true,
    stableFrames: 4,
    ready: false
  });
});

run('resolveScrollAnchoring disables and restores host scroll anchoring around controlled jumps', () => {
  assert.equal(resolveScrollAnchoring({ active: true, fallback: 'auto' }), 'none');
  assert.equal(resolveScrollAnchoring({ active: false, fallback: 'auto' }), 'auto');
  assert.equal(resolveScrollAnchoring({ active: false, fallback: '' }), '');
});

run('resolveScrollFocusOffset prefers container scroll padding and keeps a small gap', () => {
  assert.equal(resolveScrollFocusOffset({
    containerScrollPaddingTop: 64,
    fallbackOffset: 2,
    gapOffset: 12
  }), 76);
});

run('resolveScrollTarget subtracts the shared focus offset from raw target top', () => {
  assert.equal(resolveScrollTarget({
    rawTop: 1000,
    focusOffset: 76
  }), 924);
});

run('resolveScrollTarget clamps unreachable bottom targets to the maximum scroll top', () => {
  assert.equal(resolveScrollTarget({
    rawTop: 21800,
    focusOffset: 76,
    maxScrollTop: 21214
  }), 21214);
});

run('resolveActiveReferenceY uses the same focus line as controlled jumps', () => {
  assert.equal(resolveActiveReferenceY({
    scrollTop: 924,
    focusOffset: 76,
    epsilon: 2
  }), 1002);
});

run('shouldRunTimelineJump ignores first-load clicks on the already active marker', () => {
  assert.equal(shouldRunTimelineJump({
    targetId: 'turn-4',
    activeTurnId: 'turn-4',
    initialJumpReady: false
  }), false);
});

run('shouldRunTimelineJump still allows first-load clicks on a different marker', () => {
  assert.equal(shouldRunTimelineJump({
    targetId: 'turn-2',
    activeTurnId: 'turn-4',
    initialJumpReady: false
  }), true);
});

run('shouldRunTimelineJump ignores clicks on the already active marker after readiness', () => {
  assert.equal(shouldRunTimelineJump({
    targetId: 'turn-4',
    activeTurnId: 'turn-4',
    initialJumpReady: true
  }), false);
});

run('normalizeChatGPTTurnText removes trailing ChatGPT collapse control labels', () => {
  assert.equal(
    normalizeChatGPTTurnText('你现在可以 grill me 或者向我泼冷水/质疑这个方案 Show more Show less'),
    '你现在可以 grill me 或者向我泼冷水/质疑这个方案'
  );
  assert.equal(
    normalizeChatGPTTurnText('You said: keep the real message Show moreShow less'),
    'keep the real message'
  );
});

run('selectActiveIndex uses measured live positions instead of stale visible hints', () => {
  assert.equal(selectActiveIndex({
    positions: [100, 300, 900],
    visibleIndices: [0],
    referenceY: 920
  }), 2);
});

run('selectActiveIndex chooses the last marker at the scroll bottom', () => {
  assert.equal(selectActiveIndex({
    positions: [100, 300, 900],
    referenceY: 650,
    scrollTop: 1200,
    clientHeight: 600,
    scrollHeight: 1800
  }), 2);
});

run('evaluateScrollCorrection keeps correcting until the target is stable', () => {
  assert.deepEqual(evaluateScrollCorrection({
    delta: 8,
    stableFrames: 0,
    now: 100,
    deadline: 500
  }), {
    needsWrite: true,
    shouldContinue: true
  });
  assert.deepEqual(evaluateScrollCorrection({
    delta: 1,
    stableFrames: 6,
    now: 200,
    deadline: 500
  }), {
    needsWrite: false,
    shouldContinue: false
  });
});

run('normalizeMarkerRatios preserves live anchor interval proportions', () => {
  const ratios = normalizeMarkerRatios({
    positions: [120, 420, 1620, 2220]
  });
  assert.deepEqual(ratios, [0, 1 / 7, 5 / 7, 1]);
});

run('normalizeMarkerRatios keeps previous stable ratios when live anchors are incomplete', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [120, NaN, 2220],
    previous: [0, 0.4, 1]
  }), [0, 0.4, 1]);
});

run('normalizeMarkerRatios keeps previous stable ratios when live anchors are not monotonic', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [120, 620, 590, 2220],
    previous: [0, 0.24, 0.48, 1]
  }), [0, 0.24, 0.48, 1]);
});

run('normalizeMarkerRatios falls back to readable spacing when bad anchors have no stable previous ratios', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [120, 620, 590, 2220],
    previous: [undefined, undefined, undefined, undefined]
  }), [0, 1 / 3, 2 / 3, 1]);
});

run('normalizeMarkerRatios does not preserve a collapsed previous shape', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [120, 620, 590],
    previous: [0, 0, 0]
  }), [0, 0.5, 1]);
});

run('normalizeMarkerRatios keeps previous stable ratios when a delayed rebuild is severely skewed', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [100, 200, 300, 1300],
    previous: [0, 1 / 3, 2 / 3, 1],
    preservePreviousOnSkew: true
  }), [0, 1 / 3, 2 / 3, 1]);
});

run('normalizeMarkerRatios falls back to readable spacing for sparse skewed virtual samples', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [100, 200, 300, 1300],
    preservePreviousOnSkew: true
  }), [0, 1 / 3, 2 / 3, 1]);
});

run('normalizeMarkerRatios falls back for first sparse skewed virtual sample without previous state', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [-12, 707, 7288, 18591]
  }), [0, 1 / 3, 2 / 3, 1]);
});

run('normalizeMarkerRatios does not preserve a sparse skewed previous virtual shape', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [110, 210, 310, 1310],
    previous: [0, 1 / 12, 1 / 6, 1],
    preservePreviousOnSkew: true
  }), [0, 1 / 3, 2 / 3, 1]);
});

run('normalizeMarkerRatios accepts skewed ratios once the sample is dense enough', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [100, 200, 300, 1300, 1600],
    preservePreviousOnSkew: true
  }), [0, 1 / 15, 2 / 15, 12 / 15, 1]);
});

run('normalizeMarkerRatios keeps a single marker renderable without a previous ratio', () => {
  assert.deepEqual(normalizeMarkerRatios({
    positions: [120],
    previous: [undefined]
  }), [0]);
});

run('mapLiveReferenceToVisualRatio maps live scroll references onto stable visual spacing', () => {
  const ratio = mapLiveReferenceToVisualRatio({
    livePositions: [100, 300, 900],
    visualRatios: [0, 0.2, 1],
    referenceY: 600
  });
  assert.ok(Math.abs(ratio - 0.6) < 0.0001);
});

run('mapLiveReferenceToVisualRatio clamps outside the measured live range', () => {
  assert.equal(mapLiveReferenceToVisualRatio({
    livePositions: [100, 300, 900],
    visualRatios: [0, 0.2, 1],
    referenceY: 50
  }), 0);
  assert.equal(mapLiveReferenceToVisualRatio({
    livePositions: [100, 300, 900],
    visualRatios: [0, 0.2, 1],
    referenceY: 1200
  }), 1);
});

run('calculateTimelineContentHeight expands dense proportional spacing before min-gap adjustment', () => {
  assert.equal(calculateTimelineContentHeight({
    viewportHeight: 651,
    padding: 16,
    minGap: 24,
    markerRatios: [0, 0.032, 0.21, 0.3, 1]
  }), 782);
});

run('calculateTimelineContentHeight keeps the viewport height when proportional spacing already fits', () => {
  assert.equal(calculateTimelineContentHeight({
    viewportHeight: 651,
    padding: 16,
    minGap: 24,
    markerRatios: [0, 0.25, 0.5, 0.75, 1]
  }), 651);
});

run('calculateTimelineContentHeight avoids huge expansion for sparse virtualized marker samples', () => {
  assert.equal(calculateTimelineContentHeight({
    viewportHeight: 651,
    padding: 16,
    minGap: 24,
    markerRatios: [0, 0.003, 0.21, 1]
  }), 651);
});

run('calculateTimelineContentHeight avoids slight overflow for sparse virtual samples', () => {
  assert.equal(calculateTimelineContentHeight({
    viewportHeight: 619,
    padding: 16,
    minGap: 24,
    markerRatios: [0, 0.038664564953497634, 0.3923946554639225, 1]
  }), 619);
});

run('pickBestScrollableCandidate prefers the nearest real non-document scroll root', () => {
  assert.equal(pickBestScrollableCandidate([
    { key: 'inner', overflow: 500, isDocument: false, depth: 1 },
    { key: 'outer', overflow: 5000, isDocument: false, depth: 3 },
    { key: 'document', overflow: 10000, isDocument: true, depth: 99 }
  ]).key, 'inner');
});
