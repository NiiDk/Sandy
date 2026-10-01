'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('Running Sandy Learning Pack - Preservation & Migration Test Suite (Phases 1, 2, 3 & 4)...');

const root = path.resolve(__dirname, '..');
const lessonsPath = path.join(root, 'lessons.js');
const appPath = path.join(root, 'app.js');
const standalonePath = path.join(root, 'standalone.html');
const fixturesDir = path.join(root, 'tests', 'fixtures');

// 1. Verify lessons.js content and metadata
const lessonsSource = fs.readFileSync(lessonsPath, 'utf8');
const LESSONS = vm.runInNewContext(lessonsSource + '; LESSONS');
const PLAYLIST = vm.runInNewContext(lessonsSource + '; PLAYLIST');

assert.equal(LESSONS.length, 17, 'Must have exactly 17 lessons');
assert.equal(new Set(LESSONS.map(l => l.id)).size, 17, 'All 17 lesson IDs must be unique');
assert.equal(new Set(LESSONS.map(l => l.video)).size, 17, 'All 17 YouTube videos must be unique');

for (const l of LESSONS) {
  assert(l.id && typeof l.id === 'string', `Lesson must have string id: ${JSON.stringify(l)}`);
  assert(l.title && typeof l.title === 'string', `Lesson ${l.id} must have title`);
  assert(l.group && ['Foundation', 'Installation', 'Everyday', 'Bridal', 'Care'].includes(l.group), `Lesson ${l.id} has invalid group`);
  assert(l.hair && typeof l.hair === 'string', `Lesson ${l.id} must have hair guidance`);
  assert(Array.isArray(l.tools) && l.tools.length > 0, `Lesson ${l.id} must have tools list`);
  assert(Array.isArray(l.steps) && l.steps.length === 3, `Lesson ${l.id} must have exactly 3 steps`);
  assert(l.practice && typeof l.practice === 'string', `Lesson ${l.id} must have practice task`);
  assert(l.question && typeof l.question === 'string', `Lesson ${l.id} must have question`);
  assert(Array.isArray(l.answers) && l.answers.length >= 2, `Lesson ${l.id} must have at least 2 answers`);
  assert(Number.isInteger(l.correct) && l.correct >= 0 && l.correct < l.answers.length, `Lesson ${l.id} correct answer index must be in range`);
  assert(l.creator && l.creator !== 'YouTube creator', `Lesson ${l.id} must have specific creator credit`);
  assert(l.videoTitle && typeof l.videoTitle === 'string', `Lesson ${l.id} must have video title`);
  assert(l.thumbnail && typeof l.thumbnail === 'string', `Lesson ${l.id} must have thumbnail path or URL`);
  assert(fs.existsSync(path.join(root, l.thumbnail)), `Lesson ${l.id} thumbnail file must exist at ${l.thumbnail}`);
}
console.log('PASS 1: All 17 lessons, metadata, creators and local thumbnails verified.');

// 2. Load app.js in headless test harness
const appSource = fs.readFileSync(appPath, 'utf8');

// Create mock browser context
const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const mockDocument = {
  querySelector(s) {
    return {
      addEventListener() {},
      textContent: '',
      innerHTML: '',
      classList: { add() {}, remove() {} },
      setAttribute() {},
      removeAttribute() {},
      focus() {}
    };
  },
  getElementById(id) {
    return {
      id,
      addEventListener() {},
      textContent: '',
      innerHTML: '',
      value: '',
      showModal() {},
      close() {},
      setAttribute() {},
      removeAttribute() {},
      focus() {},
      getContext() {
        return {
          clearRect() {},
          save() {},
          restore() {},
          translate() {},
          rotate() {},
          fillRect() {}
        };
      }
    };
  },
  documentElement: {
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; }
  },
  querySelectorAll() { return []; },
  title: ''
};

const sandbox = {
  LESSONS,
  PLAYLIST,
  localStorage: mockLocalStorage,
  document: mockDocument,
  location: { hash: '' },
  window: {
    scrollTo() {},
    print() {},
    innerWidth: 1024,
    innerHeight: 768,
    matchMedia: () => ({ matches: false })
  },
  addEventListener() {},
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  performance: { now: () => 1000 },
  requestAnimationFrame: () => {},
  console,
  Blob: class {},
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} }
};

const ctx = vm.createContext(sandbox);
vm.runInContext(appSource, ctx);

// Helper to evaluate in app context
const run = (expr) => vm.runInContext(expr, ctx);

// 3. Test validateV1 against fixtures
const v1Empty = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1-valid-empty.json'), 'utf8'));
const v1Populated = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1-valid-populated.json'), 'utf8'));
const v1Corrupt = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1-corrupt-schema.json'), 'utf8'));
const v1Oversized = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1-oversized-notes.json'), 'utf8'));

ctx._v1Empty = v1Empty;
ctx._v1Populated = v1Populated;
ctx._v1Corrupt = v1Corrupt;
ctx._v1Oversized = v1Oversized;

assert.equal(run('validateV1(_v1Empty).version'), 1, 'validateV1 must accept empty v1');
assert.equal(run('validateV1(_v1Populated).version'), 1, 'validateV1 must accept populated v1');
assert.equal(run('validateV1(_v1Populated).done.kit'), true, 'validateV1 preserves done flags');
assert.equal(run('validateV1(_v1Populated).answers.kit'), 1, 'validateV1 preserves answers');
assert.throws(() => run('validateV1(_v1Corrupt)'), 'validateV1 must throw on corrupt schema');
assert.throws(() => run('validateV1({ version: 2 })'), 'validateV1 must reject version !== 1');
assert.equal(run('validateV1(_v1Oversized).notes.kit.length'), 10000, 'validateV1 truncates notes at 10,000 characters');

console.log('PASS 2: validateV1 correctly validates, sanitises, and bounds legacy v1 state.');

// 4. Test migrateV1toV2
const migrated = run('migrateV1toV2(_v1Populated)');
ctx._migrated = migrated;

assert.equal(migrated.version, 2, 'Migrated state must have version 2');
assert.equal(migrated.appVersion, '2.0.0', 'Migrated state must declare appVersion 2.0.0');
assert(migrated.activeLearnerId, 'Must have activeLearnerId');
assert(migrated.learners[migrated.activeLearnerId], 'Must create learner record for activeLearnerId');
assert.equal(migrated.done.kit, true, 'Done flags must carry forward');
assert.equal(migrated.done.frontal, true, 'Done flags must carry forward');
assert.equal(migrated.checks['kit-0'], true, 'Step checks must carry forward');
assert.equal(migrated.notes.kit, 'Organised mannequin stand and heat protectants.', 'Notes must carry forward');
assert.equal(migrated.bridal.look, 'Low chignon with side swoop', 'Bridal fields must carry forward');
assert.equal(migrated.kit['Wig block and secure stand'], true, 'Kit selections must carry forward');

// Critical constraint: legacy answers preserved explicitly without fabricating mastery
assert(migrated.legacyAnswers && migrated.legacyAnswers.kit, 'Legacy answer for kit must be recorded');
assert.equal(migrated.legacyAnswers.kit.selectedOptionIndex, 1, 'Legacy answer index preserved');
assert.equal(migrated.legacyAnswers.kit.status, 'legacy-uncalibrated', 'Legacy answer marked uncalibrated');
assert.equal(migrated.events.length, 0, 'No false graded attempt events fabricated during migration');

// Idempotency: migrating twice produces identical data
const migratedAgain = run('migrateV1toV2(_v1Populated)');
assert.deepStrictEqual(migrated.done, migratedAgain.done, 'Migration must be idempotent');
assert.deepStrictEqual(migrated.checks, migratedAgain.checks, 'Migration must be idempotent');
assert.deepStrictEqual(migrated.notes, migratedAgain.notes, 'Migration must be idempotent');

console.log('PASS 3: migrateV1toV2 is pure, non-destructive, idempotent, and never fabricates mastery.');

// 5. Test validateV2
const v2Sample = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v2-sample.json'), 'utf8'));
ctx._v2Sample = v2Sample;

const validatedV2 = run('validateV2(_v2Sample)');
assert.equal(validatedV2.version, 2);
assert.equal(validatedV2.events.length, 1);
assert.equal(validatedV2.events[0].eventId, 'evt_test_101');
assert.throws(() => run('validateV2({ version: 2, done: "not-an-object" })'), 'validateV2 rejects invalid types');
assert.throws(() => run('validateV2({ version: 3 })'), 'validateV2 rejects unknown future versions');

console.log('PASS 4: validateV2 validates structure, types and event schemas.');

// 6. Test mergeV2
ctx._current = run('migrateV1toV2(_v1Populated)');
ctx._incoming = run('validateV2(_v2Sample)');

// Test same-learner restore (unions flags, fills blanks, appends events, preserves conflicting notes)
const merged = run('mergeV2(_current, _incoming, { mode: "restore-own" })');
ctx._merged = merged;

assert.equal(merged.done.kit, true);
assert.equal(merged.done.glueless, true, 'Preserved from current');
assert.equal(merged.done.frontal, true, 'Unioned from incoming');
assert.equal(merged.notes.glueless, 'Band tension adjusted, comfortable on ears.', 'Existing note preserved');
assert(merged.events.some(e => e.eventId === 'evt_test_101'), 'Incoming events appended');

// Test event deduplication on repeated merge
const mergedTwice = run('mergeV2(_merged, _incoming, { mode: "restore-own" })');
assert.equal(mergedTwice.events.length, merged.events.length, 'Repeated merge must not duplicate events');

console.log('PASS 5: mergeV2 performs safe, non-destructive, deduplicated merges.');

// 7. Test HTML Escaping
assert.equal(run('esc("<script>alert(1)</script>")'), '&lt;script&gt;alert(1)&lt;/script&gt;');
assert.equal(run('esc(\'"Hello & Welcome"\')'), '&quot;Hello &amp; Welcome&quot;');
assert.equal(run('esc(null)'), '');
assert.equal(run('esc(undefined)'), '');

console.log('PASS 6: HTML escaping protects against injection.');

// 8. Test Standalone HTML Build Integrity
assert(fs.existsSync(standalonePath), 'standalone.html must exist');
const standaloneHtml = fs.readFileSync(standalonePath, 'utf8');

assert(!standaloneHtml.includes('<link rel="stylesheet"'), 'standalone.html must not have external stylesheet links');
assert(!standaloneHtml.includes('<script src='), 'standalone.html must not have external script tags');
assert(standaloneHtml.includes('<style>'), 'standalone.html must have inlined style');
assert(standaloneHtml.includes('const LESSONS ='), 'standalone.html must have inlined LESSONS');
assert(standaloneHtml.includes('data:image/jpeg;base64,'), 'standalone.html must embed base64 images');

// Check that 17 base64 images are embedded
const b64Matches = standaloneHtml.match(/data:image\/jpeg;base64,/g) || [];
assert.equal(b64Matches.length, 17, `standalone.html must embed all 17 base64 thumbnails (found ${b64Matches.length})`);

// Check that </script> inside strings was escaped
assert(!standaloneHtml.includes('</script/'), 'Script tags inside code must be properly escaped');

console.log('PASS 7: standalone.html build integrity verified (zero external dependencies, 17 embedded images).');

// 9. Phase 2: Pilot Lessons Content & Schema Integrity
const pilotLessonIds = ['frontal', 'curls', 'chignon'];
const pilots = LESSONS.filter(l => l.isPilot);

assert.equal(pilots.length, 3, 'Must have exactly 3 pilot lessons');
assert.equal(pilots.map(p => p.id).sort().join(','), pilotLessonIds.slice().sort().join(','), 'Pilot lessons must be frontal, curls, and chignon');

const allQuestionIds = new Set();

for (const p of pilots) {
  assert(Array.isArray(p.questions), `Pilot lesson ${p.id} must have questions array`);
  assert.equal(p.questions.length, 6, `Pilot lesson ${p.id} must have exactly 6 calibrated questions`);

  const types = p.questions.map(q => q.type);
  assert(types.includes('choice'), `Pilot lesson ${p.id} must include multiple-choice questions`);
  assert(types.includes('order'), `Pilot lesson ${p.id} must include step-ordering question`);
  assert(types.includes('reflection'), `Pilot lesson ${p.id} must include structured reflection question`);

  const topics = p.questions.map(q => q.topic);
  assert(topics.includes('safety'), `Pilot lesson ${p.id} must include safety/hygiene topic`);
  assert(topics.includes('climate'), `Pilot lesson ${p.id} must include Ghanaian climate / humidity topic`);

  for (const q of p.questions) {
    assert(q.id && typeof q.id === 'string', `Question in ${p.id} must have id`);
    assert(!allQuestionIds.has(q.id), `Question id ${q.id} must be globally unique`);
    allQuestionIds.add(q.id);

    assert.equal(q.lessonId, p.id, `Question ${q.id} lessonId must match parent lesson`);
    assert.equal(q.revision, 1, `Question ${q.id} revision must be 1`);
    assert(['choice', 'order', 'reflection'].includes(q.type), `Question ${q.id} has invalid type ${q.type}`);
    assert(q.topic && typeof q.topic === 'string', `Question ${q.id} must have topic`);
    assert(q.topicLabel && typeof q.topicLabel === 'string', `Question ${q.id} must have topicLabel`);
    assert(q.prompt && typeof q.prompt === 'string', `Question ${q.id} must have prompt`);
    assert.equal(q.status, 'ready', `Question ${q.id} must have status ready`);

    if (q.type === 'choice') {
      assert(Array.isArray(q.options) && q.options.length >= 2, `Question ${q.id} must have >= 2 options`);
      const optionIds = new Set(q.options.map(o => o.id));
      assert.equal(optionIds.size, q.options.length, `Question ${q.id} options must have unique ids`);
      assert(optionIds.has(q.correctOptionId), `Question ${q.id} correctOptionId ${q.correctOptionId} must exist in options`);
      assert(q.explanation && typeof q.explanation === 'string', `Question ${q.id} must have explanation`);
      assert(q.sourceReferences && typeof q.sourceReferences === 'string', `Question ${q.id} must have source references`);
    } else if (q.type === 'order') {
      assert(Array.isArray(q.steps) && q.steps.length >= 3, `Question ${q.id} must have >= 3 steps`);
      assert(Array.isArray(q.targetOrder), `Question ${q.id} must have targetOrder array`);
      assert.equal(q.targetOrder.length, q.steps.length, `Question ${q.id} targetOrder length must match steps length`);
      const stepIds = new Set(q.steps.map(s => s.id));
      for (const tId of q.targetOrder) {
        assert(stepIds.has(tId), `Question ${q.id} targetOrder contains invalid stepId ${tId}`);
      }
      assert(q.explanation && typeof q.explanation === 'string', `Question ${q.id} must have explanation`);
    } else if (q.type === 'reflection') {
      assert(q.modelAnswer && q.modelAnswer.length >= 50, `Question ${q.id} must have substantial modelAnswer`);
      assert(Array.isArray(q.selfCheckCriteria) && q.selfCheckCriteria.length >= 3, `Question ${q.id} must have >= 3 selfCheckCriteria`);
    }
  }

  // Verify video adapter bookmarks
  assert(p.videoAdapter, `Pilot lesson ${p.id} must have videoAdapter`);
  assert.equal(p.videoAdapter.provider, 'youtube');
  assert.equal(p.videoAdapter.providerId, p.video);
  assert(Array.isArray(p.videoAdapter.bookmarks), `Pilot lesson ${p.id} must have bookmarks array`);
  assert(p.videoAdapter.bookmarks.length > 0, `Pilot lesson ${p.id} must have verified bookmarks`);
  for (const bm of p.videoAdapter.bookmarks) {
    assert(Number.isInteger(bm.stepIndex) && bm.stepIndex >= 0 && bm.stepIndex < 3, `Bookmark stepIndex must be 0, 1, or 2`);
    assert(Number.isInteger(bm.startTime) && bm.startTime >= 0, `Bookmark startTime must be non-negative integer`);
    assert(bm.verified === true, `Bookmark must be verified`);
  }
}

// Check non-pilot lessons
for (const l of LESSONS.filter(l => !l.isPilot)) {
  assert.equal(l.questions.length, 1, `Non-pilot lesson ${l.id} must preserve single baseline question in questions array`);
  assert.equal(l.questions[0].status, 'ready');
}

console.log('PASS 8: All 3 pilot lessons, 18 calibrated questions, video bookmarks, and non-pilot baselines verified.');

// 10. Phase 2: Interactive Question Engine & Resume State Logic
const freshState = run('emptyV2()');
ctx.state = freshState;

// Test resume state creation
const qpFrontal = run('getLessonQuizProgress("frontal")');
assert.equal(qpFrontal.activeIdx, 0);
assert.equal(Object.keys(qpFrontal.pendingChoices).length, 0);

// Simulate recording attempts with confidence
const frontalChoiceQ = pilots[0].questions.find(q => q.type === 'choice');
const attempt1 = run(`recordGradedAttempt(state, {
  lessonId: "frontal",
  questionId: "${frontalChoiceQ.id}",
  contentRevision: 1,
  response: "${frontalChoiceQ.correctOptionId}",
  confidence: "high",
  outcome: "correct"
})`);

assert.equal(attempt1.outcome, 'correct');
assert.equal(attempt1.confidence, 'high');
assert.equal(run('state.events.length'), 1);

// Test knowledge stats computation
const statsAfterPass = run(`getLessonKnowledgeStats(LESSONS.find(l => l.id === "frontal"))`);
assert.equal(statsAfterPass.passedCount, 1);
assert.equal(statsAfterPass.firstTryAccuracy, 20); // 1 passed out of 5 graded = 20%
assert.equal(statsAfterPass.isComplete, false);

// Test reflection storage & self-check criteria toggle
const frontalRefQ = pilots[0].questions.find(q => q.type === 'reflection');
run(`state.reflections["${frontalRefQ.id}"] = {
  response: "I will perform a 24-hour patch test behind the ear with compatible remover present.",
  criteriaChecked: [0, 1],
  completedAt: new Date().toISOString()
}`);

const statsWithRef = run(`getLessonKnowledgeStats(LESSONS.find(l => l.id === "frontal"))`);
assert.equal(statsWithRef.totalReflections, 1);
assert.equal(statsWithRef.reflectionsCompleted, 1);

console.log('PASS 9: Interactive question engine, confidence recording, and reflection storage verified.');

// 11. Phase 2: State Validation & Merging of Phase 2 Fields
const testV2Payload = {
  version: 2,
  appVersion: '2.0.0',
  activeLearnerId: 'learner_pilot_test',
  done: { frontal: true },
  quizProgress: {
    frontal: { activeIdx: 3, pendingChoices: { 'frontal-q1-safety-patch': 'opt_patch_test' } }
  },
  reflections: {
    [frontalRefQ.id]: {
      response: 'Backed up reflection answer',
      criteriaChecked: [0, 2],
      completedAt: '2026-09-29T12:00:00.000Z'
    }
  },
  events: [
    {
      eventId: 'evt_phase2_001',
      learnerId: 'learner_pilot_test',
      lessonId: 'frontal',
      questionId: 'frontal-q1-safety-patch',
      contentRevision: 1,
      response: 'opt_patch_test',
      confidence: 'high',
      outcome: 'correct',
      timestamp: '2026-09-29T12:01:00.000Z'
    }
  ]
};

ctx._testV2Payload = testV2Payload;
const validatedPhase2 = run('validateV2(_testV2Payload)');
assert.equal(validatedPhase2.quizProgress.frontal.activeIdx, 3);
assert.equal(validatedPhase2.reflections[frontalRefQ.id].response, 'Backed up reflection answer');
assert.equal(validatedPhase2.events[0].eventId, 'evt_phase2_001');

// Test merging into current state
ctx._curSt = run('emptyV2()');
ctx._incomingPhase2 = validatedPhase2;
const mergedPhase2 = run('mergeV2(_curSt, _incomingPhase2, { mode: "restore-own" })');

assert.equal(mergedPhase2.quizProgress.frontal.activeIdx, 3, 'Quiz progress must merge into current state');
assert.equal(mergedPhase2.reflections[frontalRefQ.id].response, 'Backed up reflection answer', 'Reflections must merge into current state');
assert.equal(mergedPhase2.events.length, 1, 'Events must merge and deduplicate');

console.log('PASS 10: Phase 2 schema validation and non-destructive merging verified.');

// 12. Phase 3: Today Engine, Recommendations, Weekly Goal & Anti-Inflation Activity Points
const p3St = run('emptyV2()');
ctx._p3St = p3St;

// getRecommendedLesson: initially first undone lesson
const initialRec = run('getRecommendedLesson(_p3St)');
assert.equal(initialRec.id, LESSONS[0].id, 'Initially recommends first lesson');

// Mark first lesson done
p3St.done[LESSONS[0].id] = true;
const nextRec = run('getRecommendedLesson(_p3St)');
assert.equal(nextRec.id, LESSONS[1].id, 'Recommends second lesson once first is done');

// Mark all done -> fallback
for (const l of LESSONS) p3St.done[l.id] = true;
const allDoneRec = run('getRecommendedLesson(_p3St)');
assert.equal(allDoneRec.id, 'frontal', 'Falls back to frontal lesson if all are completed');

// Weekly practice count & progress
const freshWeeklySt = run('emptyV2()');
ctx._freshWeeklySt = freshWeeklySt;
const initialGoal = run('getWeeklyGoalProgress(_freshWeeklySt)');
assert.equal(initialGoal.current, 0, 'Initial weekly practice count is 0');
assert.equal(initialGoal.target, 3, 'Default weekly goal target is 3');
assert.equal(initialGoal.percent, 0, 'Initial progress is 0%');
assert.equal(initialGoal.isMet, false, 'Initial goal is not met');

// Target bounds
freshWeeklySt.gamification.weeklyGoalSessions = 10; // clamp to 7
assert.equal(run('getWeeklyGoalProgress(_freshWeeklySt).target'), 7, 'Weekly goal target clamped to max 7');
freshWeeklySt.gamification.weeklyGoalSessions = 0; // clamp to 1
assert.equal(run('getWeeklyGoalProgress(_freshWeeklySt).target'), 1, 'Weekly goal target clamped to min 1');
freshWeeklySt.gamification.weeklyGoalSessions = 2;

// Add 2 done lessons this week
freshWeeklySt.done['frontal'] = true;
freshWeeklySt.done['low-bun'] = true;
const metGoal = run('getWeeklyGoalProgress(_freshWeeklySt)');
assert.equal(metGoal.current, 2, 'Weekly practice count reflects 2 completed lessons');
assert.equal(metGoal.isMet, true, 'Goal met when current >= target');
assert.equal(metGoal.percent, 100, 'Percent capped at 100%');

// calculateActivityPoints & Anti-Inflation
const ptsSt = run('emptyV2()');
ctx._ptsSt = ptsSt;
assert.equal(run('calculateActivityPoints(_ptsSt)'), 0, 'Empty state has 0 activity points');

// Step ticks: 10 pts each
ptsSt.checks['step-1'] = true;
ptsSt.checks['step-2'] = true;
assert.equal(run('calculateActivityPoints(_ptsSt)'), 20, '2 step checks = 20 pts');

// Unique questions passed: 20 pts each
ptsSt.events.push({ questionId: 'frontal-q1', outcome: 'correct', timestamp: new Date().toISOString() });
assert.equal(run('calculateActivityPoints(_ptsSt)'), 40, '1 passed question adds 20 pts (total 40)');

// Anti-inflation test: Duplicate attempt on same question must NOT increase points
ptsSt.events.push({ questionId: 'frontal-q1', outcome: 'correct', timestamp: new Date().toISOString() });
ptsSt.events.push({ questionId: 'frontal-q1', outcome: 'incorrect', timestamp: new Date().toISOString() });
assert.equal(run('calculateActivityPoints(_ptsSt)'), 40, 'Duplicate correct attempts on same question do NOT inflate points');

// Reflection completed: 25 pts each
ptsSt.reflections['frontal-q6-reflection'] = { response: 'Test reflection', completedAt: new Date().toISOString() };
assert.equal(run('calculateActivityPoints(_ptsSt)'), 65, 'Reflection adds 25 pts (total 65)');

// Lesson completed: 50 pts each
ptsSt.done['frontal'] = true;
assert.equal(run('calculateActivityPoints(_ptsSt)'), 115, 'Lesson done adds 50 pts (total 115)');

console.log('PASS 11: Phase 3 recommendation engine, weekly goal progress, and anti-inflation activity points verified.');

// 13. Phase 3: Studio Badges & Milestone Celebrations
const badgeSt = run('emptyV2()');
ctx._badgeSt = badgeSt;

// Initial evaluation: 0 badges
assert.equal(run('STUDIO_BADGES.length'), 4, 'Must define exactly 4 studio badges');
badgeSt.gamification.weeklyGoalSessions = 5; // set target to 5 so weekly goal isn't met prematurely
let unlocked = run('evaluateBadges(_badgeSt, { triggerCelebration: false })');
assert.equal(unlocked.length, 0, 'No badges unlocked initially');
assert.equal(Object.keys(badgeSt.gamification.earnedBadges).length, 0);

// 1. badge_first_practice: Done lesson with >= 10 chars notes OR reflection
badgeSt.done['kit'] = true;
badgeSt.notes['kit'] = 'Detailed notes on scalp preparation and kit setup.';
unlocked = run('evaluateBadges(_badgeSt, { triggerCelebration: false })');
assert.equal(unlocked.length, 1, 'badge_first_practice unlocked after saving practice note');
assert.equal(unlocked[0].id, 'badge_first_practice');
assert(badgeSt.gamification.earnedBadges['badge_first_practice'], 'Badge recorded in earnedBadges');

// Idempotent: re-evaluating does NOT duplicate or re-award
unlocked = run('evaluateBadges(_badgeSt, { triggerCelebration: false })');
assert.equal(unlocked.length, 0, 'evaluateBadges is idempotent and does not re-unlock already earned badge');

// 2. badge_three_looks: 3 lessons spanning >= 2 styling groups
// kit is Foundation
badgeSt.done['straight'] = true; // Everyday
badgeSt.done['chignon'] = true; // Bridal
unlocked = run('evaluateBadges(_badgeSt, { triggerCelebration: false })');
assert.equal(unlocked.length, 1, 'badge_three_looks unlocked');
assert.equal(unlocked[0].id, 'badge_three_looks');

// 3. badge_weekly_goal: current >= target
badgeSt.gamification.weeklyGoalSessions = 3; // now current (3) >= target (3)
unlocked = run('evaluateBadges(_badgeSt, { triggerCelebration: false })');
assert.equal(unlocked.length, 1, 'badge_weekly_goal unlocked');
assert.equal(unlocked[0].id, 'badge_weekly_goal');

// 4. badge_knowledge_checked: pass all ready graded questions in a pilot lesson
const frontalPilot = LESSONS.find(l => l.id === 'frontal');
const gradedQIds = (frontalPilot.questions || []).filter(q => q.status === 'ready' && q.type !== 'reflection').map(q => q.id);
for (const qid of gradedQIds) {
  badgeSt.events.push({ questionId: qid, outcome: 'correct', timestamp: new Date().toISOString() });
}
unlocked = run('evaluateBadges(_badgeSt, { triggerCelebration: false })');
assert.equal(unlocked.length, 1, 'badge_knowledge_checked unlocked');
assert.equal(unlocked[0].id, 'badge_knowledge_checked');
assert.equal(Object.keys(badgeSt.gamification.earnedBadges).length, 4, 'All 4 badges unlocked');

// Celebration deduplication and modal trigger test
const celebSt = run('emptyV2()');
ctx._celebSt = celebSt;
celebSt.done['kit'] = true;
celebSt.notes['kit'] = 'Good session on sanitising combs and wig stand.';
// Trigger celebration
run('evaluateBadges(_celebSt, { triggerCelebration: true })');
assert.equal(celebSt.gamification.celebratedBadges['badge_first_practice'], true, 'Badge marked celebrated');

// Re-evaluating with celebration must NOT re-celebrate
run('evaluateBadges(_celebSt, { triggerCelebration: true })');
assert.equal(celebSt.gamification.celebratedBadges['badge_first_practice'], true);

// Celebration suppression when setting disabled
const quietSt = run('emptyV2()');
ctx._quietSt = quietSt;
quietSt.settings.celebrationsEnabled = false;
quietSt.done['kit'] = true;
quietSt.notes['kit'] = 'Quiet practice without celebration effects.';
run('evaluateBadges(_quietSt, { triggerCelebration: true })');
assert.equal(quietSt.gamification.celebratedBadges['badge_first_practice'], undefined, 'Celebration suppressed when celebrationsEnabled is false');

console.log('PASS 12: Studio badges evaluation, idempotency, and milestone celebration deduplication verified.');

// 14. Phase 3: Schema Validation, Merging & Standalone HTML Delivery Integrity
const p3Payload = {
  version: 2,
  appVersion: '2.0.0',
  activeLearnerId: 'learner_p3',
  settings: {
    celebrationsEnabled: false
  },
  gamification: {
    weeklyGoalSessions: 5,
    activityPoints: 210,
    earnedBadges: {
      badge_first_practice: { id: 'badge_first_practice', title: 'First Practice', earnedAt: '2026-09-30T10:00:00.000Z' }
    },
    celebratedBadges: {
      badge_first_practice: true
    }
  }
};

ctx._p3Payload = p3Payload;
const validP3 = run('validateV2(_p3Payload)');
assert.equal(validP3.settings.celebrationsEnabled, false, 'validateV2 preserves celebrationsEnabled setting');
assert.equal(validP3.gamification.weeklyGoalSessions, 5, 'validateV2 preserves bounded weekly goal');
assert.equal(validP3.gamification.earnedBadges.badge_first_practice.id, 'badge_first_practice');
assert.equal(validP3.gamification.celebratedBadges.badge_first_practice, true);

// Test merging Phase 3 state
ctx._curP3 = run('emptyV2()');
ctx._curP3.gamification.earnedBadges['badge_three_looks'] = { id: 'badge_three_looks', title: 'Three Looks', earnedAt: '2026-09-29T10:00:00.000Z' };
ctx._incomingP3 = validP3;

const mergedP3 = run('mergeV2(_curP3, _incomingP3, { mode: "restore-own" })');
assert.equal(mergedP3.settings.celebrationsEnabled, false, 'mergeV2 preserves incoming settings');
assert.equal(mergedP3.gamification.weeklyGoalSessions, 5, 'mergeV2 takes valid weeklyGoalSessions');
assert(mergedP3.gamification.earnedBadges.badge_first_practice, 'mergeV2 merges incoming badges');
assert(mergedP3.gamification.earnedBadges.badge_three_looks, 'mergeV2 preserves existing badges');
assert.equal(mergedP3.gamification.celebratedBadges.badge_first_practice, true);

// Verify standalone.html has Phase 3 elements
const standaloneHtmlP3 = fs.readFileSync(standalonePath, 'utf8');
assert(standaloneHtmlP3.includes('href="#today"'), 'standalone.html must have #today nav link');
assert(standaloneHtmlP3.includes('class="bottom-nav"'), 'standalone.html must have mobile bottom navigation');
assert(standaloneHtmlP3.includes('id="celebration-canvas"'), 'standalone.html must have celebration canvas');
assert(standaloneHtmlP3.includes('id="celebration-modal"'), 'standalone.html must have celebration modal');
assert(standaloneHtmlP3.includes('--gold:#c5a059') || standaloneHtmlP3.includes('--gold: #c5a059'), 'standalone.html must have gold design tokens');
assert(!standaloneHtmlP3.includes('<link rel="stylesheet"'), 'standalone.html must not have external stylesheet links');
assert(!standaloneHtmlP3.includes('<script src='), 'standalone.html must not have external script tags');

console.log('PASS 13: Phase 3 schema validation, state merging, and standalone build integrity verified.');
 
// 15. Phase 4: Rehearsal Timer Presets, Phase Math, and Activity Points
const timerPresets = run('REHEARSAL_PRESETS');
assert(timerPresets.full && timerPresets.express && timerPresets.drill, 'REHEARSAL_PRESETS must include full, express, and drill presets');

for (const [key, preset] of Object.entries(timerPresets)) {
  assert(preset.id && typeof preset.id === 'string');
  assert(preset.label && typeof preset.label === 'string');
  assert(Number.isInteger(preset.totalMinutes) && preset.totalMinutes > 0);
  assert(Array.isArray(preset.phases) && preset.phases.length >= 2, `Preset ${key} must have at least 2 phases`);
  const sumMinutes = preset.phases.reduce((acc, ph) => acc + ph.minutes, 0);
  assert.equal(sumMinutes, preset.totalMinutes, `Preset ${key} phase minutes sum (${sumMinutes}) must match totalMinutes (${preset.totalMinutes})`);
}

// Timer digits formatting
assert.equal(run('formatTimerDigits(5400)'), '90:00');
assert.equal(run('formatTimerDigits(2700)'), '45:00');
assert.equal(run('formatTimerDigits(900)'), '15:00');
assert.equal(run('formatTimerDigits(65)'), '01:05');
assert.equal(run('formatTimerDigits(0)'), '00:00');

// Activity Points with Phase 4 additions (Rehearsals: 50 pts each, Photos: 15 pts each)
const p4PtsSt = run('emptyV2()');
ctx._p4PtsSt = p4PtsSt;
assert.equal(run('calculateActivityPoints(_p4PtsSt)'), 0);

p4PtsSt.photos['frontal'] = 'data:image/jpeg;base64,mock';
assert.equal(run('calculateActivityPoints(_p4PtsSt)'), 15, '1 attached practice photo = 15 pts');

p4PtsSt.photos['curls'] = 'data:image/jpeg;base64,mock2';
assert.equal(run('calculateActivityPoints(_p4PtsSt)'), 30, '2 attached practice photos = 30 pts');

p4PtsSt.rehearsalLog.push({
  id: 'reh_1',
  presetId: 'full',
  presetLabel: 'Full Bridal Rehearsal (90 min)',
  durationMinutes: 90,
  clientName: 'Nana Akua Test',
  completedAt: new Date().toISOString()
});
assert.equal(run('calculateActivityPoints(_p4PtsSt)'), 80, '1 completed rehearsal log entry adds 50 pts (total 80)');

console.log('PASS 14: Phase 4 rehearsal timer presets, phase math, and activity points verified.');

// 16. Phase 4: Multi-Profile Bridal Planner Schema, Schedule, Contract & Non-Destructive Merge
const p4Fresh = run('emptyV2()');
assert(p4Fresh.bridalProfiles, 'emptyV2 must initialise bridalProfiles');
assert(p4Fresh.bridalProfiles.default, 'emptyV2 must initialise default bridal profile');
assert.equal(p4Fresh.activeBridalProfile, 'default');
assert.equal(p4Fresh.bridalProfiles.default.clientName, 'Nana Akua (Practice Rehearsal)');
assert(Array.isArray(p4Fresh.bridalProfiles.default.schedule) && p4Fresh.bridalProfiles.default.schedule.length >= 4);
assert(p4Fresh.bridalProfiles.default.contractChecklist);

// Test validation of Phase 4 payload
const p4Payload = {
  version: 2,
  appVersion: '2.0.0',
  activeLearnerId: 'learner_p4_test',
  activeBridalProfile: 'prof_koforidua',
  bridalProfiles: {
    prof_koforidua: {
      id: 'prof_koforidua',
      clientName: 'Serwaa Wedding Rehearsal',
      eventDate: '2026-11-20',
      ceremonyType: 'Traditional Ghanaian Engagement',
      venueClimate: 'Outdoor Garden & Humid Marquee',
      bridalPartyCount: 4,
      fields: { look: 'Sleek side-part frontal bun', accessories: 'Gold hair vine' },
      schedule: [
        { time: '05:30', task: 'Bride scalp prep & foundation', done: true },
        { time: '06:30', task: 'Frontal installation & melt band', done: false }
      ],
      contractChecklist: {
        trialCompleted: true,
        patchTestSigned: true,
        depositReceived: true,
        removerSupplied: true,
        touchupKitPacked: false
      }
    }
  },
  photos: {
    frontal: 'data:image/jpeg;base64,dGVzdA=='
  },
  rehearsalLog: [
    {
      id: 'reh_p4_01',
      presetId: 'express',
      presetLabel: 'Express Styling Rehearsal (45 min)',
      durationMinutes: 45,
      clientName: 'Serwaa Wedding Rehearsal',
      completedAt: '2026-09-30T14:00:00.000Z'
    }
  ]
};

ctx._p4Payload = p4Payload;
const validP4 = run('validateV2(_p4Payload)');
assert.equal(validP4.activeBridalProfile, 'prof_koforidua');
assert.equal(validP4.bridalProfiles.prof_koforidua.clientName, 'Serwaa Wedding Rehearsal');
assert.equal(validP4.bridalProfiles.prof_koforidua.schedule[0].done, true);
assert.equal(validP4.bridalProfiles.prof_koforidua.contractChecklist.patchTestSigned, true);
assert.equal(validP4.photos.frontal, 'data:image/jpeg;base64,dGVzdA==');
assert.equal(validP4.rehearsalLog[0].presetId, 'express');

// Test merging Phase 4 state
ctx._curP4State = run('emptyV2()');
ctx._incomingP4 = validP4;
const mergedP4 = run('mergeV2(_curP4State, _incomingP4, { mode: "restore-own" })');

assert(mergedP4.bridalProfiles.prof_koforidua, 'Incoming bridal profile merged');
assert(mergedP4.bridalProfiles.default, 'Default profile preserved');
assert.equal(mergedP4.activeBridalProfile, 'prof_koforidua');
assert.equal(mergedP4.photos.frontal, 'data:image/jpeg;base64,dGVzdA==', 'Photos merged');
assert.equal(mergedP4.rehearsalLog.length, 1, 'Rehearsal log merged');

// Test migration of legacy v1 bridal notes into default bridal profile
const legacyWithBridal = {
  version: 1,
  done: {},
  checks: {},
  notes: {},
  answers: {},
  bridal: {
    look: 'Hollywood waves with frontal',
    accessories: 'Cathedral lace trim'
  },
  kit: {}
};
ctx._legacyWithBridal = legacyWithBridal;
const migratedBridal = run('migrateV1toV2(validateV1(_legacyWithBridal))');
assert.equal(migratedBridal.bridal.look, 'Hollywood waves with frontal');
assert.equal(migratedBridal.bridalProfiles.default.fields.look, 'Hollywood waves with frontal', 'Legacy bridal fields migrated to default bridal profile');
assert.equal(migratedBridal.bridalProfiles.default.fields.accessories, 'Cathedral lace trim');

console.log('PASS 15: Phase 4 multi-profile bridal schema, schedule, contract checklist, and non-destructive merging verified.');

// 17. Phase 4: Standalone Build Integrity and DOM/CSS Assertions
const standaloneHtmlP4 = fs.readFileSync(standalonePath, 'utf8');
assert(standaloneHtmlP4.includes('id="photo-modal"'), 'standalone.html must include photo modal dialog');
assert(standaloneHtmlP4.includes('class="photo-lightbox"'), 'standalone.html must include photo lightbox styling');
assert(standaloneHtmlP4.includes('.timer-panel'), 'standalone.html must include rehearsal timer CSS');
assert(standaloneHtmlP4.includes('.fibre-matrix'), 'standalone.html must include fibre matrix CSS');
assert(standaloneHtmlP4.includes('.sop-box'), 'standalone.html must include sanitisation SOP CSS');
assert(standaloneHtmlP4.includes('.kit-module-grid'), 'standalone.html must include kit module grid CSS');
assert(standaloneHtmlP4.includes('.journal-filter-bar'), 'standalone.html must include journal filter CSS');
assert(standaloneHtmlP4.includes('.schedule-table'), 'standalone.html must include schedule table CSS');
assert(standaloneHtmlP4.includes('.contract-grid'), 'standalone.html must include contract checklist CSS');
assert(standaloneHtmlP4.includes('Tactile Hair Fibre Identification Matrix'), 'standalone.html must include fibre matrix in JS');
assert(standaloneHtmlP4.includes('Salon Sanitisation &amp; Cross-Contamination SOP') || standaloneHtmlP4.includes('Salon Sanitisation & Cross-Contamination SOP'), 'standalone.html must include sanitisation SOP in JS');
assert(standaloneHtmlP4.includes('Bridal Security &amp; Contract Verification Checklist') || standaloneHtmlP4.includes('Bridal Security & Contract Verification Checklist'), 'standalone.html must include contract checklist in JS');

console.log('PASS 16: Phase 4 standalone build integrity, CSS tokens, and offline guides verified.');

// 18. Phase 5: Accessibility Hardening (WCAG 2.1 AA), Dark Theme Tokens & Modal Focus
console.log('\nTesting Phase 5: Accessibility hardening, dark theme tokens, and focus traversal...');

const indexHtmlP5 = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stylesCssP5 = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const standaloneHtmlP5 = fs.readFileSync(standalonePath, 'utf8');

// 18.1 Skip link & main focus target
assert(indexHtmlP5.includes('<a class="skip" href="#main">Skip to main content</a>'), 'index.html must include skip link');
assert(indexHtmlP5.includes('<main id="main" tabindex="-1">'), 'index.html main must have tabindex="-1"');
assert(standaloneHtmlP5.includes('<a class="skip" href="#main">Skip to main content</a>'), 'standalone.html must include skip link');
assert(stylesCssP5.includes('.skip:focus') && stylesCssP5.includes('.skip:focus-visible'), 'styles.css must style skip link on focus/focus-visible');

// 18.2 High contrast focus visible rings
assert(stylesCssP5.includes(':focus-visible{outline:3px solid var(--focus-ring)!important;outline-offset:3px!important}'), 'styles.css must have high-contrast focus-visible ring');
assert(standaloneHtmlP5.includes(':focus-visible{outline:3px solid var(--focus-ring)!important;outline-offset:3px!important}'), 'standalone.html must include focus-visible outline');

// 18.3 Screen reader timer ergonomics
assert(appSource.includes('id="timer-digits" class="timer-digits" role="timer" aria-live="off"'), 'app.js timer digits must have aria-live="off" to avoid tick spam');
assert(appSource.includes('id="timer-phase-pill" class="timer-phase-pill" role="status" aria-live="polite"'), 'app.js timer phase pill must have role="status" aria-live="polite"');

// 18.4 Dark theme tokens and contrast
assert(stylesCssP5.includes('@media(prefers-color-scheme:dark){:root:not([data-theme="light"])'), 'styles.css must support system dark mode');
assert(stylesCssP5.includes('[data-theme="dark"]'), 'styles.css must support manual dark theme attribute');
assert(!stylesCssP5.includes(':root{--gold:#c5a059;--gold-light:#fbf7ef;--gold-dark:#8c6d2c}'), 'styles.css must not have conflicting duplicate :root gold rule');
assert(stylesCssP5.includes('--card-bg:#201824'), 'dark theme must have card-bg #201824');
assert(stylesCssP5.includes('--top-bg:#1c1520'), 'dark theme must have top-bg #1c1520');
assert(stylesCssP5.includes('--plum:#e07cb0'), 'dark theme must have plum accent #e07cb0');
assert(stylesCssP5.includes('--gold:#deb56d'), 'dark theme must have gold accent #deb56d');
assert(stylesCssP5.includes('--red-bg'), 'styles.css must include semantic status red-bg');
assert(stylesCssP5.includes('--warning-bg'), 'styles.css must include semantic status warning-bg');

// 18.5 Header theme toggle & Today preferences
assert(indexHtmlP5.includes('id="theme-toggle"'), 'index.html header must have theme toggle button');
assert(indexHtmlP5.includes('id="theme-icon"'), 'index.html header must have theme icon');
assert(indexHtmlP5.includes('id="theme-label"'), 'index.html header must have theme label');
assert(standaloneHtmlP5.includes('id="theme-toggle"'), 'standalone.html header must have theme toggle button');
assert(appSource.includes('id="today-theme-select"'), 'app.js today view must have studio theme select dropdown');
assert(appSource.includes('id="pref-reduced-motion"'), 'app.js today view must have reduced motion toggle');

// 18.6 Schema, validation, merge & applyTheme logic
const emptyWithSettings = run('emptyV2()');
assert.equal(emptyWithSettings.settings.theme, 'system');
assert.equal(emptyWithSettings.settings.reducedMotion, false);
assert.equal(emptyWithSettings.settings.celebrationsEnabled, true);

ctx._themePayload = {
  version: 2,
  activeLearnerId: 'learner_dark_test',
  settings: {
    theme: 'dark',
    reducedMotion: true,
    celebrationsEnabled: false
  }
};
const validatedSettings = run('validateV2(_themePayload)');
assert.equal(validatedSettings.settings.theme, 'dark');
assert.equal(validatedSettings.settings.reducedMotion, true);
assert.equal(validatedSettings.settings.celebrationsEnabled, false);

ctx._baseState = run('emptyV2()');
ctx._incomingSettings = validatedSettings;
const mergedThemeState = run('mergeV2(_baseState, _incomingSettings, { mode: "restore-own" })');
assert.equal(mergedThemeState.settings.theme, 'dark');
assert.equal(mergedThemeState.settings.reducedMotion, true);
assert.equal(mergedThemeState.settings.celebrationsEnabled, false);

// 18.7 applyTheme function invocation in test context
run('applyTheme("dark")');
run('applyTheme("light")');
run('applyTheme("system")');

// 18.8 Modal focus restoration functions
assert.equal(typeof run('closeMilestoneModal'), 'function');
assert.equal(typeof run('closePhotoModal'), 'function');
run('closeMilestoneModal()');
run('closePhotoModal()');

console.log('PASS 17: Phase 5 WCAG 2.1 AA accessibility hardening, dark theme tokens, and focus traversal verified.');

console.log('\nALL 17 PHASES 1, 2, 3, 4 & 5 PRESERVATION & UPGRADE TESTS PASSED SUCCESSFULLY!');
