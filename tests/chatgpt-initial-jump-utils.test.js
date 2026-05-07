const assert = require('node:assert/strict');

const {
  evaluateInitialJumpReadiness,
  evaluateScrollCorrection,
  normalizeMarkerPositions,
  pickBestScrollableCandidate,
  resolveActiveReferenceY,
  resolveScrollAnchoring,
  resolveScrollFocusOffset,
  resolveScrollTarget,
  selectActiveIndex
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

run('resolveActiveReferenceY uses the same focus line as controlled jumps', () => {
  assert.equal(resolveActiveReferenceY({
    scrollTop: 924,
    focusOffset: 76,
    epsilon: 2
  }), 1002);
});

run('selectActiveIndex uses measured live positions instead of stale visible hints', () => {
  assert.equal(selectActiveIndex({
    positions: [100, 300, 900],
    visibleIndices: [0],
    referenceY: 920
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

run('normalizeMarkerPositions remaps visual spacing from live measured positions', () => {
  assert.deepEqual(normalizeMarkerPositions({
    positions: [100, 250, 700]
  }), [0, 0.25, 1]);
});

run('normalizeMarkerPositions preserves previous values when live positions are invalid', () => {
  assert.deepEqual(normalizeMarkerPositions({
    positions: [100, NaN, 700],
    previous: [0, 0.5, 1]
  }), [0, 0.5, 1]);
});

run('pickBestScrollableCandidate prefers the nearest real non-document scroll root', () => {
  assert.equal(pickBestScrollableCandidate([
    { key: 'inner', overflow: 500, isDocument: false, depth: 1 },
    { key: 'outer', overflow: 5000, isDocument: false, depth: 3 },
    { key: 'document', overflow: 10000, isDocument: true, depth: 99 }
  ]).key, 'inner');
});
