'use strict';

// Storage keys & constants
const KEY_V1 = 'sandy-studio-v1';
const KEY_V2 = 'sandy-studio-v2';
const DEFAULT_LEARNER_ID = 'learner_local_default';
const MAX_TEXT_LEN = 10000;
const MAX_IMPORT_BYTES = 10000000; // 10MB bounded import

const KIT = [
  'Wig block and secure stand',
  'Tail comb and sectioning clips',
  'Fibre-appropriate detangling brush',
  'Measuring tape, wig cap and band',
  'Tool cleaner, clean towel and storage',
  'Temperature-controlled hot tools',
  'Fibre-appropriate heat protectant',
  'Elastics, U-pins and setting clips',
  'Suitable shampoo and conditioner',
  'Adhesive and its compatible remover',
  'Optional padding, hairnet and accessories'
];

const FIELDS = {
  look: 'Chosen look and reference',
  hair: 'Wig fibre, length, density and cap',
  occasion: 'Ceremony, outfit and weather plan',
  fit: 'Fit, comfort and product checks',
  accessories: 'Veil and accessory placement',
  timing: 'Trial date, styling time and touch-ups',
  aftercare: 'Removal and aftercare plan',
  review: 'Trial result and changes to make'
};

// Utilities
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const ext = (url, text, cls = '') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>`;

// -------------------------------------------------------------
// PURE VALIDATION, MIGRATION & MERGE ENGINE
// -------------------------------------------------------------

function emptyV1() {
  return {
    version: 1,
    done: {},
    checks: {},
    answers: {},
    notes: {},
    kit: {},
    bridal: {}
  };
}

function emptyV2(learnerId = DEFAULT_LEARNER_ID) {
  return {
    version: 2,
    appVersion: '2.0.0',
    activeLearnerId: learnerId,
    learners: {
      [learnerId]: {
        id: learnerId,
        displayName: 'Sandy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    },
    done: {},
    checks: {},
    answers: {}, // Retained for backwards compatibility
    notes: {},
    kit: {},
    bridal: {},
    bridalProfiles: {
      'default': {
        id: 'default',
        clientName: 'Nana Akua (Practice Rehearsal)',
        eventDate: '2026-11-20',
        ceremonyType: 'Traditional Engagement & Church Wedding',
        venueClimate: 'Outdoor Coastal / Air-Conditioned Hall (Accra)',
        bridalPartyCount: 4,
        fields: {},
        schedule: [
          { id: 'sch-1', time: '06:00', task: 'Scalp cleansing, sweat-blocker & skin prep', done: false },
          { id: 'sch-2', time: '06:45', task: 'Wig cap placement & anchor braid tension check', done: false },
          { id: 'sch-3', time: '07:30', task: 'Unit install & adhesive/glueless perimeter lock', done: false },
          { id: 'sch-4', time: '08:15', task: 'Bridal styling (curls/waves/chignon) & pin anchoring', done: false },
          { id: 'sch-5', time: '09:00', task: 'Veil & tiara placement with comb lock-in', done: false },
          { id: 'sch-6', time: '09:30', task: 'Final humidity-shield spray & touch-up kit handover', done: false }
        ],
        contractChecklist: {
          trialCompleted: false,
          patchTestSigned: false,
          depositReceived: false,
          removerSupplied: false,
          touchupKitPacked: false
        },
        updatedAt: new Date().toISOString()
      }
    },
    activeBridalProfile: 'default',
    photos: {},
    rehearsalLog: [],
    legacyAnswers: {},
    events: [],
    reflections: {},
    quizProgress: {}, // Resume state for interactive question flows
    gamification: {
      weeklyGoalSessions: 3,
      earnedBadges: {},
      celebratedBadges: {},
      activityPoints: 0
    },
    settings: {
      theme: 'system',
      reducedMotion: false,
      celebrationsEnabled: true
    }
  };
}

function validateV1(raw) {
  if (!raw || raw.version !== 1) {
    throw new Error('Unrecognised backup format: expected version 1');
  }
  const clean = emptyV1();
  for (const k of ['done', 'checks', 'answers', 'notes', 'kit', 'bridal']) {
    if (!raw[k] || typeof raw[k] !== 'object' || Array.isArray(raw[k])) {
      throw new Error(`Invalid backup: section "${k}" is corrupt`);
    }
  }
  for (const l of LESSONS) {
    if (raw.done[l.id] === true) clean.done[l.id] = true;
    if (typeof raw.notes[l.id] === 'string') clean.notes[l.id] = raw.notes[l.id].slice(0, MAX_TEXT_LEN);
    if (Number.isInteger(raw.answers[l.id]) && raw.answers[l.id] >= 0 && raw.answers[l.id] < l.answers.length) {
      clean.answers[l.id] = raw.answers[l.id];
    }
    for (let i = 0; i < 3; i++) {
      const key = `${l.id}-${i}`;
      if (raw.checks[key] === true) clean.checks[key] = true;
    }
  }
  for (const k of KIT) {
    if (raw.kit[k] === true) clean.kit[k] = true;
  }
  for (const k of Object.keys(FIELDS)) {
    if (typeof raw.bridal[k] === 'string') clean.bridal[k] = raw.bridal[k].slice(0, MAX_TEXT_LEN);
  }
  return clean;
}

function migrateV1toV2(v1State, learnerId = DEFAULT_LEARNER_ID) {
  const v2 = emptyV2(learnerId);
  const now = new Date().toISOString();

  // Carry over progress flags & checklists
  for (const [id, val] of Object.entries(v1State.done || {})) {
    if (val === true) v2.done[id] = true;
  }
  for (const [key, val] of Object.entries(v1State.checks || {})) {
    if (val === true) v2.checks[key] = true;
  }
  for (const [k, val] of Object.entries(v1State.kit || {})) {
    if (val === true) v2.kit[k] = true;
  }
  for (const [k, val] of Object.entries(v1State.bridal || {})) {
    if (typeof val === 'string') {
      const sanitized = val.slice(0, MAX_TEXT_LEN);
      v2.bridal[k] = sanitized;
      if (v2.bridalProfiles && v2.bridalProfiles.default) {
        if (!v2.bridalProfiles.default.fields) v2.bridalProfiles.default.fields = {};
        v2.bridalProfiles.default.fields[k] = sanitized;
      }
    }
  }
  for (const [id, val] of Object.entries(v1State.notes || {})) {
    if (typeof val === 'string') v2.notes[id] = val.slice(0, MAX_TEXT_LEN);
  }

  // Preserve legacy answers without fabricating first attempt timestamps or mastery
  for (const [lessonId, optIndex] of Object.entries(v1State.answers || {})) {
    if (Number.isInteger(optIndex)) {
      v2.legacyAnswers[lessonId] = {
        selectedOptionIndex: optIndex,
        migratedAt: now,
        status: 'legacy-uncalibrated'
      };
      v2.answers[lessonId] = optIndex;
    }
  }

  return v2;
}

function validateV2(raw) {
  const cand = (raw && raw.data && raw.version === 2) ? raw.data : raw;
  if (!cand || cand.version !== 2) {
    throw new Error('Unrecognised backup format: expected version 2');
  }

  // Validate section types if present
  for (const k of ['done', 'checks', 'kit', 'notes', 'bridal', 'legacyAnswers']) {
    if (cand[k] !== undefined && (typeof cand[k] !== 'object' || cand[k] === null || Array.isArray(cand[k]))) {
      throw new Error(`Invalid backup: section "${k}" is corrupt`);
    }
  }
  if (cand.events !== undefined && !Array.isArray(cand.events)) {
    throw new Error('Invalid backup: "events" must be an array');
  }

  const learnerId = typeof cand.activeLearnerId === 'string' && cand.activeLearnerId ? cand.activeLearnerId : DEFAULT_LEARNER_ID;
  const clean = emptyV2(learnerId);

  clean.appVersion = typeof cand.appVersion === 'string' ? cand.appVersion : '2.0.0';

  if (cand.learners && typeof cand.learners === 'object' && !Array.isArray(cand.learners)) {
    clean.learners = { ...cand.learners };
  }

  for (const k of ['done', 'checks', 'kit']) {
    if (cand[k]) {
      for (const [id, v] of Object.entries(cand[k])) {
        if (v === true) clean[k][id] = true;
      }
    }
  }

  for (const k of ['notes', 'bridal']) {
    if (cand[k]) {
      for (const [id, v] of Object.entries(cand[k])) {
        if (typeof v === 'string') clean[k][id] = v.slice(0, MAX_TEXT_LEN);
      }
    }
  }

  // Legacy answers
  if (cand.legacyAnswers) {
    for (const [id, v] of Object.entries(cand.legacyAnswers)) {
      if (v && Number.isInteger(v.selectedOptionIndex)) {
        clean.legacyAnswers[id] = {
          selectedOptionIndex: v.selectedOptionIndex,
          migratedAt: typeof v.migratedAt === 'string' ? v.migratedAt : new Date().toISOString(),
          status: 'legacy-uncalibrated'
        };
        clean.answers[id] = v.selectedOptionIndex;
      }
    }
  }

  // Graded attempt events array
  if (Array.isArray(cand.events)) {
    for (const ev of cand.events) {
      if (ev && typeof ev.eventId === 'string' && typeof ev.lessonId === 'string') {
        clean.events.push({
          eventId: ev.eventId,
          learnerId: ev.learnerId || learnerId,
          lessonId: ev.lessonId,
          questionId: ev.questionId || (ev.lessonId + '-q0'),
          contentRevision: Number.isInteger(ev.contentRevision) ? ev.contentRevision : 1,
          response: ev.response,
          confidence: ev.confidence || null,
          outcome: ev.outcome === 'correct' ? 'correct' : 'incorrect',
          gradingSource: 'objective',
          timestamp: typeof ev.timestamp === 'string' ? ev.timestamp : new Date().toISOString()
        });
      }
    }
  }

  // Reflections
  if (cand.reflections && typeof cand.reflections === 'object' && !Array.isArray(cand.reflections)) {
    for (const [qid, r] of Object.entries(cand.reflections)) {
      if (r && typeof r.response === 'string') {
        clean.reflections[qid] = {
          response: r.response.slice(0, MAX_TEXT_LEN),
          criteriaChecked: Array.isArray(r.criteriaChecked) ? r.criteriaChecked.slice(0, 20) : [],
          completedAt: typeof r.completedAt === 'string' ? r.completedAt : new Date().toISOString()
        };
      }
    }
  }

  // Resume state
  if (cand.quizProgress && typeof cand.quizProgress === 'object' && !Array.isArray(cand.quizProgress)) {
    clean.quizProgress = { ...cand.quizProgress };
  }

  // Gamification & Settings
  if (cand.gamification && typeof cand.gamification === 'object') {
    clean.gamification.weeklyGoalSessions = (Number.isInteger(cand.gamification.weeklyGoalSessions) && cand.gamification.weeklyGoalSessions >= 1 && cand.gamification.weeklyGoalSessions <= 7) ? cand.gamification.weeklyGoalSessions : 3;
    clean.gamification.activityPoints = Number.isInteger(cand.gamification.activityPoints) && cand.gamification.activityPoints >= 0 ? cand.gamification.activityPoints : 0;
    if (cand.gamification.earnedBadges && typeof cand.gamification.earnedBadges === 'object' && !Array.isArray(cand.gamification.earnedBadges)) {
      clean.gamification.earnedBadges = { ...cand.gamification.earnedBadges };
    }
    if (cand.gamification.celebratedBadges && typeof cand.gamification.celebratedBadges === 'object' && !Array.isArray(cand.gamification.celebratedBadges)) {
      clean.gamification.celebratedBadges = { ...cand.gamification.celebratedBadges };
    }
  }

  if (cand.settings && typeof cand.settings === 'object') {
    clean.settings.theme = ['light', 'dark', 'system'].includes(cand.settings.theme) ? cand.settings.theme : 'system';
    clean.settings.reducedMotion = Boolean(cand.settings.reducedMotion);
    clean.settings.celebrationsEnabled = cand.settings.celebrationsEnabled !== false;
  }

  // Phase 4: Bridal Profiles
  if (cand.bridalProfiles && typeof cand.bridalProfiles === 'object' && !Array.isArray(cand.bridalProfiles)) {
    clean.bridalProfiles = {};
    for (const [pId, p] of Object.entries(cand.bridalProfiles)) {
      if (p && typeof p === 'object') {
        const cleanProf = {
          id: pId,
          clientName: typeof p.clientName === 'string' ? p.clientName.slice(0, 100) : 'Practice Bride',
          eventDate: typeof p.eventDate === 'string' ? p.eventDate.slice(0, 20) : '',
          ceremonyType: typeof p.ceremonyType === 'string' ? p.ceremonyType.slice(0, 100) : '',
          venueClimate: typeof p.venueClimate === 'string' ? p.venueClimate.slice(0, 100) : '',
          bridalPartyCount: Number.isInteger(p.bridalPartyCount) ? Math.max(1, Math.min(20, p.bridalPartyCount)) : 1,
          fields: {},
          schedule: Array.isArray(p.schedule) ? p.schedule.slice(0, 25).map(s => ({
            id: typeof s.id === 'string' ? s.id : ('sch_' + Math.random().toString(36).slice(2, 6)),
            time: typeof s.time === 'string' ? s.time.slice(0, 10) : '08:00',
            task: typeof s.task === 'string' ? s.task.slice(0, 200) : '',
            done: Boolean(s.done)
          })) : [],
          contractChecklist: typeof p.contractChecklist === 'object' && p.contractChecklist !== null ? { ...p.contractChecklist } : {},
          updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString()
        };
        for (const [k, v] of Object.entries(p.fields || {})) {
          if (typeof v === 'string') cleanProf.fields[k] = v.slice(0, MAX_TEXT_LEN);
        }
        clean.bridalProfiles[pId] = cleanProf;
      }
    }
  }
  if (!clean.bridalProfiles || Object.keys(clean.bridalProfiles).length === 0) {
    clean.bridalProfiles = emptyV2(learnerId).bridalProfiles;
  }
  if (clean.bridalProfiles.default) {
    for (const [k, v] of Object.entries(clean.bridal)) {
      if (!clean.bridalProfiles.default.fields[k] && v) {
        clean.bridalProfiles.default.fields[k] = v;
      }
    }
  }
  clean.activeBridalProfile = (typeof cand.activeBridalProfile === 'string' && clean.bridalProfiles[cand.activeBridalProfile]) ? cand.activeBridalProfile : Object.keys(clean.bridalProfiles)[0] || 'default';

  // Phase 4: Photos
  if (cand.photos && typeof cand.photos === 'object' && !Array.isArray(cand.photos)) {
    clean.photos = {};
    for (const [lId, dataUri] of Object.entries(cand.photos)) {
      if (typeof dataUri === 'string' && dataUri.startsWith('data:image/')) {
        clean.photos[lId] = dataUri.slice(0, 400000);
      }
    }
  }

  // Phase 4: Rehearsal Log
  if (Array.isArray(cand.rehearsalLog)) {
    clean.rehearsalLog = cand.rehearsalLog.slice(0, 50).map(r => ({
      id: typeof r.id === 'string' ? r.id : ('reh_' + Math.random().toString(36).slice(2, 6)),
      presetId: typeof r.presetId === 'string' ? r.presetId : 'full',
      presetLabel: typeof r.presetLabel === 'string' ? r.presetLabel : 'Rehearsal',
      durationMinutes: Number.isInteger(r.durationMinutes) ? r.durationMinutes : 0,
      clientName: typeof r.clientName === 'string' ? r.clientName.slice(0, 100) : '',
      completedAt: typeof r.completedAt === 'string' ? r.completedAt : new Date().toISOString()
    }));
  }

  return clean;
}

function mergeV2(current, incoming, options = { mode: 'restore-own' }) {
  const merged = JSON.parse(JSON.stringify(current));

  if (options.mode === 'restore-own') {
    // Union boolean flags
    for (const [id, v] of Object.entries(incoming.done || {})) if (v) merged.done[id] = true;
    for (const [id, v] of Object.entries(incoming.checks || {})) if (v) merged.checks[id] = true;
    for (const [id, v] of Object.entries(incoming.kit || {})) if (v) merged.kit[id] = true;

    // Fill blank notes; preserve both if conflicting
    for (const [id, incomingNote] of Object.entries(incoming.notes || {})) {
      const currentNote = merged.notes[id];
      if (!currentNote || currentNote.trim() === '') {
        merged.notes[id] = incomingNote;
      } else if (incomingNote && incomingNote.trim() !== '' && currentNote !== incomingNote) {
        if (!currentNote.includes(incomingNote)) {
          merged.notes[id] = (currentNote + '\n\n[Imported note]:\n' + incomingNote).slice(0, MAX_TEXT_LEN);
        }
      }
    }

    // Fill blank bridal planner fields
    for (const [k, v] of Object.entries(incoming.bridal || {})) {
      if ((!merged.bridal[k] || merged.bridal[k].trim() === '') && v) {
        merged.bridal[k] = v;
        if (merged.bridalProfiles && merged.bridalProfiles.default) {
          if (!merged.bridalProfiles.default.fields) merged.bridalProfiles.default.fields = {};
          if (!merged.bridalProfiles.default.fields[k] || merged.bridalProfiles.default.fields[k].trim() === '') {
            merged.bridalProfiles.default.fields[k] = v;
          }
        }
      }
    }

    // Carry over legacy answers if not already present
    for (const [id, v] of Object.entries(incoming.legacyAnswers || {})) {
      if (!merged.legacyAnswers[id]) {
        merged.legacyAnswers[id] = v;
        if (merged.answers[id] === undefined) merged.answers[id] = v.selectedOptionIndex;
      }
    }

    // Deduplicate and append events
    const existingEventIds = new Set(merged.events.map(e => e.eventId));
    for (const ev of incoming.events || []) {
      if (!existingEventIds.has(ev.eventId)) {
        merged.events.push(ev);
        existingEventIds.add(ev.eventId);
      }
    }

    // Merge reflections
    for (const [qid, r] of Object.entries(incoming.reflections || {})) {
      if (!merged.reflections[qid]) {
        merged.reflections[qid] = r;
      }
    }

    // Merge resume state
    if (incoming.quizProgress && typeof incoming.quizProgress === 'object') {
      merged.quizProgress = { ...merged.quizProgress, ...incoming.quizProgress };
    }

    // Gamification
    merged.gamification.weeklyGoalSessions = (incoming.gamification && Number.isInteger(incoming.gamification.weeklyGoalSessions)) ? incoming.gamification.weeklyGoalSessions : (merged.gamification.weeklyGoalSessions || 3);
    merged.gamification.activityPoints = Math.max(merged.gamification.activityPoints || 0, incoming.gamification?.activityPoints || 0);
    if (!merged.gamification.earnedBadges) merged.gamification.earnedBadges = {};
    for (const [bId, badge] of Object.entries(incoming.gamification?.earnedBadges || {})) {
      if (!merged.gamification.earnedBadges[bId]) {
        merged.gamification.earnedBadges[bId] = badge;
      }
    }
    if (!merged.gamification.celebratedBadges) merged.gamification.celebratedBadges = {};
    for (const [bId, v] of Object.entries(incoming.gamification?.celebratedBadges || {})) {
      if (v) merged.gamification.celebratedBadges[bId] = true;
    }
    if (incoming.settings && typeof incoming.settings === 'object') {
      if (incoming.settings.celebrationsEnabled !== undefined) {
        merged.settings.celebrationsEnabled = Boolean(incoming.settings.celebrationsEnabled);
      }
      if (['light', 'dark', 'system'].includes(incoming.settings.theme)) {
        merged.settings.theme = incoming.settings.theme;
      }
      if (incoming.settings.reducedMotion !== undefined) {
        merged.settings.reducedMotion = Boolean(incoming.settings.reducedMotion);
      }
    }

    // Merge Phase 4 bridal profiles
    if (incoming.bridalProfiles && typeof incoming.bridalProfiles === 'object') {
      if (!merged.bridalProfiles) merged.bridalProfiles = {};
      for (const [pId, inProf] of Object.entries(incoming.bridalProfiles)) {
        if (!merged.bridalProfiles[pId]) {
          merged.bridalProfiles[pId] = inProf;
        } else {
          for (const [k, v] of Object.entries(inProf.fields || {})) {
            if ((!merged.bridalProfiles[pId].fields[k] || merged.bridalProfiles[pId].fields[k].trim() === '') && v) {
              merged.bridalProfiles[pId].fields[k] = v;
            }
          }
        }
      }
      if (incoming.activeBridalProfile && merged.bridalProfiles[incoming.activeBridalProfile]) {
        merged.activeBridalProfile = incoming.activeBridalProfile;
      }
    }

    // Merge Phase 4 photos
    if (incoming.photos && typeof incoming.photos === 'object') {
      if (!merged.photos) merged.photos = {};
      for (const [lId, dataUri] of Object.entries(incoming.photos)) {
        if (!merged.photos[lId] && dataUri) {
          merged.photos[lId] = dataUri;
        }
      }
    }

    // Merge Phase 4 rehearsalLog
    if (Array.isArray(incoming.rehearsalLog)) {
      if (!merged.rehearsalLog) merged.rehearsalLog = [];
      const existingIds = new Set(merged.rehearsalLog.map(r => r.id));
      for (const r of incoming.rehearsalLog) {
        if (!existingIds.has(r.id)) {
          merged.rehearsalLog.push(r);
          existingIds.add(r.id);
        }
      }
    }
  }

  return merged;
}

function recordGradedAttempt(st, attempt) {
  const event = {
    eventId: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    learnerId: st.activeLearnerId || DEFAULT_LEARNER_ID,
    lessonId: attempt.lessonId,
    questionId: attempt.questionId || `${attempt.lessonId}-q0`,
    contentRevision: attempt.contentRevision || 1,
    response: attempt.response,
    confidence: attempt.confidence || null,
    outcome: attempt.outcome === 'correct' ? 'correct' : 'incorrect',
    gradingSource: 'objective',
    timestamp: new Date().toISOString()
  };
  st.events.push(event);
  return event;
}

// -------------------------------------------------------------
// PILOT QUESTION HELPERS & PROGRESS EVALUATION
// -------------------------------------------------------------

function getLessonQuizProgress(lessonId) {
  if (!state.quizProgress[lessonId]) {
    state.quizProgress[lessonId] = {
      activeIdx: 0,
      pendingChoices: {},
      activeConfidence: {},
      stepOrders: {},
      draftReflections: {}
    };
  }
  return state.quizProgress[lessonId];
}

function getLatestEventForQuestion(questionId) {
  for (let i = state.events.length - 1; i >= 0; i--) {
    if (state.events[i].questionId === questionId) {
      return state.events[i];
    }
  }
  return null;
}

function getFirstEventForQuestion(questionId) {
  for (let i = 0; i < state.events.length; i++) {
    if (state.events[i].questionId === questionId) {
      return state.events[i];
    }
  }
  return null;
}

function getLessonKnowledgeStats(l, st = state) {
  const questions = l.questions || [];
  const readyGraded = questions.filter(q => q.status === 'ready' && q.type !== 'reflection');
  let passedCount = 0;
  let firstTryCorrect = 0;

  for (const q of readyGraded) {
    const hasCorrect = (st.events || []).some(e => e.questionId === q.id && e.outcome === 'correct');
    if (hasCorrect) passedCount++;
    const firstEv = (st.events || []).find(e => e.questionId === q.id);
    if (firstEv && firstEv.outcome === 'correct') firstTryCorrect++;
  }

  const reflections = questions.filter(q => q.type === 'reflection');
  const reflectionsCompleted = reflections.filter(q => !!st.reflections?.[q.id]).length;

  return {
    totalGraded: readyGraded.length,
    passedCount,
    isComplete: readyGraded.length > 0 && passedCount === readyGraded.length,
    firstTryAccuracy: passedCount > 0 ? Math.round((firstTryCorrect / readyGraded.length) * 100) : 0,
    totalReflections: reflections.length,
    reflectionsCompleted
  };
}

// -------------------------------------------------------------
// PHASE 3: GAMIFICATION, RECOMMENDATIONS & CELEBRATIONS
// -------------------------------------------------------------

function getRecommendedLesson(st = state) {
  // Find the first lesson where st.done is not true
  const nextUndone = LESSONS.find(l => !st.done[l.id]);
  if (nextUndone) return nextUndone;
  // If all are marked done, recommend lesson 5 (frontal) or lesson 1
  return LESSONS.find(l => l.id === 'frontal') || LESSONS[0];
}

function getWeeklyPracticeCount(st = state) {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const mondayIso = monday.toISOString();

  const lessonsActiveThisWeek = new Set();
  // Check events this week
  for (const ev of st.events || []) {
    if (ev.timestamp && ev.timestamp >= mondayIso && ev.lessonId) {
      lessonsActiveThisWeek.add(ev.lessonId);
    }
  }
  // Check reflections completed this week
  for (const [qid, r] of Object.entries(st.reflections || {})) {
    if (r.completedAt && r.completedAt >= mondayIso) {
      const parentLesson = LESSONS.find(l => (l.questions || []).some(q => q.id === qid));
      if (parentLesson) lessonsActiveThisWeek.add(parentLesson.id);
    }
  }
  // Check done lessons
  for (const [id, isDone] of Object.entries(st.done || {})) {
    if (isDone) lessonsActiveThisWeek.add(id);
  }

  return lessonsActiveThisWeek.size;
}

function getWeeklyGoalProgress(st = state) {
  const current = getWeeklyPracticeCount(st);
  const rawTarget = st.gamification?.weeklyGoalSessions;
  const target = Math.max(1, Math.min(7, Number.isInteger(rawTarget) ? rawTarget : 3));
  const percent = Math.min(100, Math.round((current / target) * 100));
  return {
    current,
    target,
    percent,
    isMet: current >= target
  };
}

function calculateActivityPoints(st = state) {
  let pts = 0;
  // 10 pts per step checklist tick
  pts += Object.values(st.checks || {}).filter(Boolean).length * 10;
  // 20 pts per unique question passed
  const passedQuestionIds = new Set();
  for (const ev of st.events || []) {
    if (ev.outcome === 'correct' && ev.questionId) {
      passedQuestionIds.add(ev.questionId);
    }
  }
  pts += passedQuestionIds.size * 20;
  // 25 pts per reflection completed
  pts += Object.keys(st.reflections || {}).length * 25;
  // 50 pts per lesson completed
  pts += Object.values(st.done || {}).filter(Boolean).length * 50;
  // 50 pts per bridal trial rehearsal completed
  pts += (st.rehearsalLog || []).length * 50;
  // 15 pts per practice photo attached
  pts += Object.keys(st.photos || {}).length * 15;
  return pts;
}

const STUDIO_BADGES = [
  {
    id: 'badge_first_practice',
    title: 'First Practice',
    icon: '🎖️',
    desc: 'Saved your first hands-on practice session with personal observation notes or reflection.',
    evaluate(st) {
      const hasDoneWithNote = Object.keys(st.done || {}).some(id => st.done[id] && (st.notes[id] || '').trim().length >= 10);
      const hasReflection = Object.keys(st.reflections || {}).length >= 1;
      return hasDoneWithNote || hasReflection;
    }
  },
  {
    id: 'badge_three_looks',
    title: 'Three Looks Practised',
    icon: '✨',
    desc: 'Completed hands-on practice across 3 distinct lessons spanning at least 2 styling categories.',
    evaluate(st) {
      const doneLessons = LESSONS.filter(l => st.done[l.id]);
      if (doneLessons.length < 3) return false;
      const groups = new Set(doneLessons.map(l => l.group));
      return groups.size >= 2;
    }
  },
  {
    id: 'badge_knowledge_checked',
    title: 'Knowledge Checked',
    icon: '🎓',
    desc: 'Successfully verified all understanding checks in at least one pilot lesson.',
    evaluate(st) {
      const pilots = LESSONS.filter(l => l.isPilot);
      return pilots.some(p => {
        const stats = getLessonKnowledgeStats(p, st);
        return stats.isComplete === true;
      });
    }
  },
  {
    id: 'badge_weekly_goal',
    title: 'Weekly Goal Met',
    icon: '👑',
    desc: 'Achieved your personal weekly styling practice session target.',
    evaluate(st) {
      const wp = getWeeklyGoalProgress(st);
      return wp.isMet;
    }
  }
];

function evaluateBadges(st = state, { triggerCelebration = false } = {}) {
  if (!st.gamification) {
    st.gamification = { weeklyGoalSessions: 3, earnedBadges: {}, celebratedBadges: {}, activityPoints: 0 };
  }
  if (!st.gamification.earnedBadges) st.gamification.earnedBadges = {};
  if (!st.gamification.celebratedBadges) st.gamification.celebratedBadges = {};

  const newlyUnlocked = [];
  for (const badge of STUDIO_BADGES) {
    if (!st.gamification.earnedBadges[badge.id]) {
      if (badge.evaluate(st)) {
        st.gamification.earnedBadges[badge.id] = {
          id: badge.id,
          title: badge.title,
          earnedAt: new Date().toISOString()
        };
        newlyUnlocked.push(badge);
      }
    }
  }

  st.gamification.activityPoints = calculateActivityPoints(st);

  if (triggerCelebration && newlyUnlocked.length > 0) {
    const firstNew = newlyUnlocked[0];
    if (!st.gamification.celebratedBadges[firstNew.id] && st.settings?.celebrationsEnabled !== false) {
      st.gamification.celebratedBadges[firstNew.id] = true;
      showMilestoneModal(firstNew.icon, `Milestone Achieved: ${firstNew.title}`, firstNew.desc);
      triggerCelebrationCanvas();
    }
  }

  return newlyUnlocked;
}

function triggerCelebrationCanvas() {
  if (state.settings?.celebrationsEnabled === false || state.settings?.reducedMotion) return;
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('celebration-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = window.innerWidth;
  const height = canvas.height = window.innerHeight;

  const colors = ['#591d3e', '#c5a059', '#d4af37', '#fdfcfb', '#c27ba0'];
  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: width * 0.5 + (Math.random() - 0.5) * 80,
      y: height * 0.35 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 1.2) * 10,
      w: Math.random() * 8 + 5,
      h: Math.random() * 5 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      opacity: 1
    });
  }

  const start = performance.now();
  const duration = 1800;

  function loop(now) {
    const elapsed = now - start;
    const progress = elapsed / duration;
    if (progress >= 1) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // subtle gravity
      p.rot += p.rotSpeed;
      p.opacity = Math.max(0, 1 - progress);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

let lastCelebrationFocus = null;

function showMilestoneModal(icon, title, desc) {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('celebration-modal');
  if (!modal) return;
  lastCelebrationFocus = document.activeElement;
  const iconEl = document.getElementById('celebration-icon');
  const titleEl = document.getElementById('celebration-title');
  const descEl = document.getElementById('celebration-desc');
  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  try {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  } catch (e) {
    modal.setAttribute('open', '');
  }
  const btn = document.getElementById('close-celebration-btn');
  if (btn && typeof btn.focus === 'function') btn.focus();
}

function closeMilestoneModal() {
  const modal = document.getElementById('celebration-modal');
  if (!modal) return;
  try {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  } catch (e) {
    modal.removeAttribute('open');
  }
  if (lastCelebrationFocus && typeof lastCelebrationFocus.focus === 'function') {
    lastCelebrationFocus.focus();
    lastCelebrationFocus = null;
  }
}

// -------------------------------------------------------------
// STATE INITIALISATION & STORAGE RESILIENCE
// -------------------------------------------------------------

let state = emptyV2();
let storageOK = true;
let query = '', group = 'All', status = 'all';

try {
  const rawV2 = localStorage.getItem(KEY_V2);
  if (rawV2) {
    state = validateV2(JSON.parse(rawV2));
  } else {
    // Check for legacy v1 state
    const rawV1 = localStorage.getItem(KEY_V1);
    if (rawV1) {
      const v1 = validateV1(JSON.parse(rawV1));
      state = migrateV1toV2(v1);
      validateV2(state);
      localStorage.setItem(KEY_V2, JSON.stringify(state));
      const verify = localStorage.getItem(KEY_V2);
      if (!verify) throw new Error('Verification read-back of migrated state failed');
    } else {
      localStorage.setItem(KEY_V2, JSON.stringify(state));
    }
  }
} catch (e) {
  storageOK = false;
  console.warn('Storage initialisation limitation:', e.message);
}

function save() {
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(state));
    storageOK = true;
  } catch (e) {
    storageOK = false;
    notify('Browser saving is unavailable. Back up your progress before closing.');
  }
}

function notify(t) {
  const notice = $('#notice');
  if (!notice) return;
  notice.textContent = t;
  notice.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => notice.classList.remove('show'), 4000);
}

const completed = () => LESSONS.filter(l => state.done[l.id]).length;

function applyTheme(theme) {
  const currentTheme = theme || state.settings?.theme || 'system';
  const systemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemDark);

  if (typeof document !== 'undefined' && document.documentElement) {
    if (currentTheme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }

  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  const toggleBtn = document.getElementById('theme-toggle');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? 'Light' : 'Dark';
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
    toggleBtn.setAttribute('title', isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme');
  }

  const select = document.getElementById('today-theme-select');
  if (select && select.value !== currentTheme) {
    select.value = currentTheme;
  }
}

// -------------------------------------------------------------
// VIEW RENDERING
// -------------------------------------------------------------

function today() {
  evaluateBadges(state, { triggerCelebration: false });
  const rec = getRecommendedLesson(state);
  const wp = getWeeklyGoalProgress(state);
  const doneCount = completed();
  const pts = state.gamification?.activityPoints || 0;
  const notesCount = Object.values(state.notes || {}).filter(n => n && n.trim().length > 0).length;

  const pilots = LESSONS.filter(l => l.isPilot);
  const passedPilotGraded = pilots.reduce((acc, l) => acc + getLessonKnowledgeStats(l).passedCount, 0);
  const totalPilotGraded = pilots.reduce((acc, l) => acc + (l.questions || []).filter(q => q.status === 'ready' && q.type !== 'reflection').length, 0);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning, Sandy' : (hour < 18 ? 'Good afternoon, Sandy' : 'Good evening, Sandy');

  // Recent notes
  const recentNotes = LESSONS
    .filter(l => state.notes[l.id] && state.notes[l.id].trim().length > 0)
    .slice(0, 3);

  return `
    <div class="today-head">
      <p class="eyebrow">PREPARE · PRACTISE · REFINE</p>
      <h1>${esc(greeting)}</h1>
      <p class="muted">Your executive bridal & wig styling workstation. Track weekly practice goals, check understanding, and celebrate milestones.</p>
    </div>

    <!-- 4-Metrics Strip -->
    <div class="metrics-strip">
      <div class="metric-tile">
        <div class="metric-num">${doneCount}<span style="font-size:18px;color:var(--muted)">/17</span></div>
        <div class="metric-lbl">Lessons Practised</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${passedPilotGraded}<span style="font-size:18px;color:var(--muted)">/${totalPilotGraded}</span></div>
        <div class="metric-lbl">Pilot Checks Passed</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${notesCount}</div>
        <div class="metric-lbl">Practice Records</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${pts}</div>
        <div class="metric-lbl">Studio Points</div>
      </div>
    </div>

    <div class="today-grid">
      <!-- Left Column: Recommended Next Step & Studio Achievements -->
      <div class="today-column">
        <!-- Recommended Next Action -->
        <div class="panel card-accent recommended-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span class="eyebrow" style="margin:0;color:var(--gold-dark)">RECOMMENDED NEXT STEP</span>
            <span class="badge ${state.done[rec.id] ? 'done' : ''}">${state.done[rec.id] ? 'Practised ✓' : 'Up Next'}</span>
          </div>
          <div class="recommended-body">
            ${rec.thumbnail ? `<img class="recommended-thumb" src="${esc(rec.thumbnail)}" alt="" loading="lazy">` : '<div class="recommended-thumb"></div>'}
            <div class="recommended-meta">
              <span class="small muted">${esc(rec.group)} · Lesson ${String(rec.number).padStart(2, '0')}</span>
              <h3><a href="#lesson/${rec.id}">${esc(rec.title)}</a></h3>
              <p class="small muted" style="margin:4px 0">${esc(rec.practice)}</p>
            </div>
          </div>
          <div class="actions" style="margin-top:4px">
            <a class="button" href="#lesson/${rec.id}">${state.done[rec.id] ? 'Review lesson →' : 'Continue lesson →'}</a>
            <a class="button quiet" href="#kit">View hair & tools guide</a>
          </div>
        </div>

        <!-- Studio Achievements Badges -->
        <div class="panel card-gold badges-section">
          <div class="row" style="margin-bottom:14px">
            <div>
              <p class="eyebrow" style="margin:0;color:var(--gold-dark)">STUDIO ACHIEVEMENTS</p>
              <h2 style="font-size:22px;margin:2px 0 0">Evidence-Based Badges</h2>
            </div>
            <span class="small muted">${Object.keys(state.gamification?.earnedBadges || {}).length} of 4 unlocked</span>
          </div>
          <div class="badge-grid">
            ${STUDIO_BADGES.map(b => {
              const isEarned = Boolean(state.gamification?.earnedBadges?.[b.id]);
              const earnedDate = isEarned ? new Date(state.gamification.earnedBadges[b.id].earnedAt).toLocaleDateString() : null;
              return `
                <div class="badge-item ${isEarned ? 'earned' : ''}">
                  <div class="badge-icon">${b.icon}</div>
                  <div class="badge-content">
                    <h4>${esc(b.title)}</h4>
                    <p class="badge-desc">${esc(b.desc)}</p>
                    <span class="badge-status">${isEarned ? `Unlocked ${earnedDate} ✓` : 'In progress'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Weekly Goal, Recent Notes & Preferences -->
      <div class="today-column">
        <!-- Weekly Goal Card -->
        <div class="panel goal-card">
          <div class="row">
            <div>
              <p class="eyebrow" style="margin:0">WEEKLY PRACTICE GOAL</p>
              <h3 style="margin:4px 0 0">${wp.current} of ${wp.target} sessions completed</h3>
            </div>
            <span class="badge ${wp.isMet ? 'done' : ''}">${wp.isMet ? 'Goal Met ★' : `${wp.percent}%`}</span>
          </div>
          <div class="goal-progress-wrap">
            <div class="gold-bar">
              <div class="gold-fill" style="width:${wp.percent}%"></div>
            </div>
            <p class="small muted" style="margin:4px 0 0">
              ${wp.isMet ? 'Brilliant dedication! Your weekly target is achieved.' : `Target: ${wp.target - wp.current} more practice session${wp.target - wp.current === 1 ? '' : 's'} this week.`}
            </p>
          </div>
          <div class="goal-footer">
            <label for="today-goal-select" class="goal-select-wrap">
              <span>Goal target:</span>
              <select id="today-goal-select">
                ${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}" ${n === wp.target ? 'selected' : ''}>${n} session${n === 1 ? '' : 's'}/week</option>`).join('')}
              </select>
            </label>
          </div>
        </div>

        <!-- Recent Observations / Notes -->
        <div class="panel">
          <div class="row" style="margin-bottom:12px">
            <h3 style="margin:0;font-size:17px">Recent Practice Notes</h3>
            <a class="small" href="#journal">View all →</a>
          </div>
          ${recentNotes.length > 0 ? recentNotes.map(l => `
            <div style="border-bottom:1px solid var(--line);padding:10px 0">
              <span class="small" style="font-weight:600"><a href="#lesson/${l.id}">${l.number}. ${esc(l.title)}</a></span>
              <p class="small muted" style="margin:4px 0;white-space:pre-wrap">${esc((state.notes[l.id] || '').slice(0, 140))}${(state.notes[l.id] || '').length > 140 ? '…' : ''}</p>
            </div>
          `).join('') : '<p class="small muted">No practice observations written yet. Open any lesson to record notes.</p>'}
        </div>

        <!-- Studio Preferences -->
        <div class="panel">
          <h3 style="margin:0 0 10px;font-size:17px">Studio Preferences</h3>
          <div style="margin-bottom:12px">
            <label for="today-theme-select" style="font-size:13px;margin-bottom:6px">Studio Theme</label>
            <select id="today-theme-select" style="width:100%;font-size:13px;padding:8px 10px">
              <option value="system" ${state.settings?.theme === 'system' ? 'selected' : ''}>Follow Device System Theme</option>
              <option value="light" ${state.settings?.theme === 'light' ? 'selected' : ''}>Light Theme (Ivory &amp; Plum)</option>
              <option value="dark" ${state.settings?.theme === 'dark' ? 'selected' : ''}>Dark Theme (Obsidian &amp; Rose Gold)</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding-top:10px;border-top:1px solid var(--line)">
            <label style="display:flex;align-items:center;gap:10px;font-weight:400;font-size:13px;margin:0">
              <input type="checkbox" id="pref-celebrations" ${state.settings?.celebrationsEnabled !== false ? 'checked' : ''}>
              <span>Enable milestone celebration effects</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;font-weight:400;font-size:13px;margin:0">
              <input type="checkbox" id="pref-reduced-motion" ${state.settings?.reducedMotion ? 'checked' : ''}>
              <span>Reduce motion (disable celebratory bursts &amp; animated transitions)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

function card(l) {
  const stats = getLessonKnowledgeStats(l);
  return `<article class="card">
    <a class="card-image" href="#lesson/${l.id}" tabindex="-1" aria-hidden="true">
      ${l.thumbnail ? `<img src="${esc(l.thumbnail)}" alt="" loading="lazy">` : ''}
      <span class="number">${String(l.number).padStart(2, '0')}</span>
    </a>
    <div class="card-body">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge ${state.done[l.id] ? 'done' : ''}">${state.done[l.id] ? 'Practised ✓' : esc(l.group)}</span>
        ${stats.isComplete ? '<span class="badge" style="background:#e2f0e8;color:var(--green)">Knowledge Checked ✓</span>' : ''}
      </div>
      <h3 style="margin-top:13px">${esc(l.title)}</h3>
      <p>${esc(l.creator)} · Selected YouTube lesson</p>
      <a class="button quiet" href="#lesson/${l.id}">Open lesson <span aria-hidden="true">→</span></a>
    </div>
  </article>`;
}

function cards() {
  const list = LESSONS.filter(l =>
    (group === 'All' || l.group === group) &&
    (status === 'all' || (status === 'done' ? !!state.done[l.id] : !state.done[l.id])) &&
    [l.title, l.hair, l.tools.join(' '), l.creator].join(' ').toLowerCase().includes(query.toLowerCase())
  );
  $('#results').textContent = `${list.length} of ${LESSONS.length} lessons`;
  $('#lesson-grid').innerHTML = list.length
    ? list.map(card).join('')
    : '<div class="empty"><h3>No lessons match</h3><p>Try a different style, group or progress filter.</p><button id="clear-filter" class="quiet">Clear filters</button></div>';
  $('#clear-filter')?.addEventListener('click', () => {
    query = '';
    group = 'All';
    status = 'all';
    render();
  });
}

function learn() {
  const next = LESSONS.find(l => !state.done[l.id]) || LESSONS[0];
  return `<section class="hero">
    <div>
      <p class="eyebrow">Your learning space · Ghana · 2026 edition</p>
      <h1>Beautiful hair.<br>A skill at a time.</h1>
      <p class="muted">Sandy, start with a secure fit. Build your finishing skills. Then bring it all together for the bride.</p>
      <div class="actions">
        <a class="button" href="#lesson/${next.id}">${completed() ? 'Continue practising' : 'Start with your kit'} →</a>
        ${ext(PLAYLIST, 'YouTube playlist', 'button quiet')}
      </div>
    </div>
    <div class="panel">
      <div class="row">
        <div>
          <span class="eyebrow">Your progress</span>
          <span class="metric">${completed()} <span class="muted" style="font-size:23px">/ ${LESSONS.length}</span></span>
        </div>
        <span class="badge">At your own pace</span>
      </div>
      <div class="progress" role="progressbar" aria-label="Lessons practised" aria-valuenow="${completed()}" aria-valuemin="0" aria-valuemax="${LESSONS.length}">
        <span style="width:${(completed() / LESSONS.length) * 100}%"></span>
      </div>
      <p class="small">Watch → check understanding → practise → record.<br>Tick “Practised” when you have completed hands-on work.</p>
    </div>
  </section>
  <div class="path">
    <span>01 · Prepare</span>
    <span>02 · Fit & install</span>
    <span>03 · Style</span>
    <span>04 · Bridal finish</span>
  </div>
  <div class="section-head">
    <h2>Your lesson library</h2>
    <p class="muted">One selected video, a short guide and a practical task in every lesson.</p>
  </div>
  <div class="toolbar">
    <label class="visually-hidden" for="search">Search lessons</label>
    <input id="search" type="search" placeholder="Find a style, tool or hair type…" value="${esc(query)}">
    <label class="visually-hidden" for="group">Lesson group</label>
    <select id="group">
      ${['All', 'Foundation', 'Installation', 'Everyday', 'Bridal', 'Care'].map(g => `<option ${g === group ? 'selected' : ''}>${g}</option>`).join('')}
    </select>
    <label class="visually-hidden" for="status">Progress filter</label>
    <select id="status">
      <option value="all">All progress</option>
      <option value="todo" ${status === 'todo' ? 'selected' : ''}>To practise</option>
      <option value="done" ${status === 'done' ? 'selected' : ''}>Practised</option>
    </select>
  </div>
  <p id="results" class="small" role="status"></p>
  <div class="grid" id="lesson-grid"></div>
  <details>
    <summary>Why these styles for Ghana and 2026?</summary>
    <p>Accra salon menus offer frontal/closure installation, wig maintenance, half-up styles and ponytails. These are useful local service signals. Low chignons, waves, soft updos, sculptural buns, French twists and bobs are our bridal practice shortlist, informed by international 2026 trend coverage.</p>
    <p>These are learning priorities, not a verified ranking of Ghanaian bookings. Ask local brides and salons which looks they request before buying a large kit. <a href="#sources">See the sources.</a></p>
  </details>`;
}

function renderPilotQuestionHtml(l, q, qp, activeIdx) {
  const latestEvent = getLatestEventForQuestion(q.id);
  const isAnswered = !!latestEvent;
  const isCorrect = latestEvent && latestEvent.outcome === 'correct';

  let bodyHtml = '';

  if (q.type === 'choice') {
    const selectedOptId = qp.pendingChoices[q.id] || (latestEvent ? latestEvent.response : '');
    const currentConf = qp.activeConfidence[q.id] || 'medium';

    bodyHtml = `
      <form id="pilot-choice-form">
        <fieldset style="border:0;padding:0;margin:0">
          <legend class="visually-hidden">Choose the best answer</legend>
          ${q.options.map(opt => `
            <label class="quiz-option" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;margin:8px 0;background:var(--paper);border:1px solid ${selectedOptId === opt.id ? 'var(--plum)' : 'var(--line)'};border-radius:6px;cursor:pointer">
              <input type="radio" name="pilot-choice" value="${esc(opt.id)}" ${selectedOptId === opt.id ? 'checked' : ''}>
              <span style="font-size:14px;line-height:1.4">${esc(opt.text)}</span>
            </label>
          `).join('')}
        </fieldset>

        ${q.askConfidence ? `
          <fieldset class="confidence-fieldset">
            <legend>Optional: How confident do you feel in this decision?</legend>
            <div class="confidence-row">
              ${['low', 'medium', 'high', 'skip'].map(c => `
                <label class="confidence-label">
                  <input type="radio" name="pilot-confidence" value="${c}" ${currentConf === c ? 'checked' : ''}>
                  <span>${c.charAt(0).toUpperCase() + c.slice(1)}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>
        ` : ''}

        <div style="margin-top:14px;display:flex;gap:12px;align-items:center">
          <button type="submit">Check answer</button>
          ${isAnswered ? `<span class="small muted">${isCorrect ? 'Answered correctly ✓' : 'Recorded attempt'}</span>` : ''}
        </div>
      </form>
    `;
  } else if (q.type === 'order') {
    const currentOrder = qp.stepOrders[q.id] || q.steps.map(s => s.id);
    const stepMap = new Map(q.steps.map(s => [s.id, s.text]));

    bodyHtml = `
      <form id="pilot-order-form">
        <p class="small muted">Arrange the steps into the correct sequence from top to bottom:</p>
        <ol class="order-list">
          ${currentOrder.map((stepId, idx) => `
            <li class="order-item">
              <span class="order-handle">${idx + 1}</span>
              <span class="order-text">${esc(stepMap.get(stepId) || stepId)}</span>
              <div class="order-controls">
                <button type="button" class="btn-order-move" data-move-up="${esc(stepId)}" ${idx === 0 ? 'disabled' : ''} aria-label="Move step up">▲</button>
                <button type="button" class="btn-order-move" data-move-down="${esc(stepId)}" ${idx === currentOrder.length - 1 ? 'disabled' : ''} aria-label="Move step down">▼</button>
              </div>
            </li>
          `).join('')}
        </ol>
        <div style="margin-top:14px;display:flex;gap:12px;align-items:center">
          <button type="submit">Check sequence</button>
          ${isAnswered ? `<span class="small muted">${isCorrect ? 'Sequence verified ✓' : 'Sequence needs adjustment'}</span>` : ''}
        </div>
      </form>
    `;
  } else if (q.type === 'reflection') {
    const savedRef = state.reflections[q.id];
    const draftText = qp.draftReflections?.[q.id] ?? (savedRef ? savedRef.response : '');

    bodyHtml = `
      <div class="reflection-box">
        <label for="pilot-reflection-text" style="font-weight:600;margin-bottom:8px">Your Explanation & Practical Action Plan:</label>
        <textarea id="pilot-reflection-text" style="min-height:120px" placeholder="Write your explanation and steps here in your own words...">${esc(draftText)}</textarea>
        <div style="margin-top:12px">
          <button type="button" id="save-reflection-btn">${savedRef ? 'Update reflection' : 'Save reflection'}</button>
          ${savedRef ? `<span class="saved" style="margin-left:12px">Saved on ${new Date(savedRef.completedAt).toLocaleDateString()} ✓</span>` : ''}
        </div>

        ${savedRef ? `
          <div class="model-answer-card">
            <h4>Educator Model Answer & Key Principles</h4>
            <p style="white-space:pre-wrap;font-size:14px">${esc(q.modelAnswer)}</p>
          </div>
          <div class="panel" style="margin-top:14px">
            <h4 style="margin:0 0 10px;font-size:14px;color:var(--plum)">Self-Check Assessment</h4>
            <p class="small muted">Tick each standard that your answer covered:</p>
            <ul class="criteria-list">
              ${q.selfCheckCriteria.map((crit, cIdx) => {
                const checked = savedRef.criteriaChecked && savedRef.criteriaChecked.includes(cIdx);
                return `<li>
                  <label>
                    <input type="checkbox" data-crit="${cIdx}" ${checked ? 'checked' : ''}>
                    <span>${esc(crit)}</span>
                  </label>
                </li>`;
              }).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  let feedbackHtml = '';
  if (isAnswered && (q.type === 'choice' || q.type === 'order')) {
    const isConfidentIncorrect = latestEvent.confidence === 'high' && latestEvent.outcome === 'incorrect';
    feedbackHtml = `
      <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}" style="margin-top:16px">
        ${isConfidentIncorrect ? `<div class="confident-incorrect-alert">⚠️ Note: You indicated high confidence on this answer. Take a moment to review why this option is unsafe or ineffective before moving on.</div>` : ''}
        <p><strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong> ${esc(q.explanation)}</p>
        ${q.sourceReferences ? `<p class="feedback-reference">Source: ${esc(q.sourceReferences)}</p>` : ''}
      </div>
    `;
  }

  return `
    <div class="quiz-header">
      <span class="quiz-progress-badge">Question ${activeIdx + 1} of ${l.questions.length}</span>
      <span class="topic-pill">${esc(q.topicLabel || q.topic)}</span>
    </div>
    <p class="quiz-prompt">${esc(q.prompt)}</p>
    ${bodyHtml}
    <div id="pilot-feedback-area">${feedbackHtml}</div>
    <div class="stepper-nav">
      <button type="button" id="prev-question-btn" class="quiet" ${activeIdx === 0 ? 'disabled' : ''}>← Previous question</button>
      <span class="small muted">${activeIdx + 1} / ${l.questions.length}</span>
      <button type="button" id="next-question-btn" class="quiet" ${activeIdx === l.questions.length - 1 ? 'disabled' : ''}>Next question →</button>
    </div>
  `;
}

function lesson(l) {
  const isPilot = Boolean(l.isPilot && l.questions && l.questions.length > 1);
  const qp = isPilot ? getLessonQuizProgress(l.id) : null;
  const activeIdx = qp ? Math.max(0, Math.min(l.questions.length - 1, qp.activeIdx || 0)) : 0;
  const q = isPilot ? l.questions[activeIdx] : null;
  const stats = isPilot ? getLessonKnowledgeStats(l) : null;

  return `<p class="small"><a href="#learn">← All lessons</a> &nbsp; / &nbsp; ${l.number} of ${LESSONS.length} · ${esc(l.group)}</p>
  <div class="detail">
    <section>
      <p class="eyebrow">Lesson ${String(l.number).padStart(2, '0')}</p>
      <h1>${esc(l.title)}</h1>
      <a class="video-link" href="https://www.youtube.com/watch?v=${l.video}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${esc(l.videoTitle)} on YouTube">
        ${l.thumbnail ? `<img src="${esc(l.thumbnail)}" alt="Tutorial preview from ${esc(l.creator)}">` : ''}
        <div class="play"><span>▶ Watch on YouTube</span></div>
      </a>
      <p class="small"><strong>${esc(l.creator)}</strong><br>${esc(l.videoTitle)}</p>
      
      <div class="panel">
        <h2>Try it in three steps</h2>
        <ul class="checklist">
          ${l.steps.map((s, i) => {
            const bm = l.videoAdapter?.bookmarks?.find(b => b.stepIndex === i && b.verified);
            return `<li>
              <label>
                <input type="checkbox" data-step="${l.id}-${i}" ${state.checks[`${l.id}-${i}`] ? 'checked' : ''}>
                <span>${i + 1}. ${esc(s)}</span>
              </label>
              ${bm ? `
                <div style="margin:4px 0 6px 28px">
                  <a class="step-bookmark-link" href="https://www.youtube.com/watch?v=${l.video}&t=${bm.startTime}s" target="_blank" rel="noopener noreferrer">
                    ⏱️ Watch this step (${Math.floor(bm.startTime / 60)}:${String(bm.startTime % 60).padStart(2, '0')}) ↗
                  </a>
                </div>
              ` : ''}
            </li>`;
          }).join('')}
        </ul>
        <hr class="rule">
        <h3>Your practice task</h3>
        <p>${esc(l.practice)}</p>
        <p class="small">Take front, left, right and back photos. Check comfort, neatness, secure hold and visible lace or tracks. Repeat after correcting one issue.</p>
        <label class="completed-line"><input id="done" type="checkbox" ${state.done[l.id] ? 'checked' : ''}> I have practised this lesson</label>
      </div>

      <div class="panel quiz">
        <h2>Check your understanding</h2>
        ${isPilot ? `
          <div class="knowledge-summary ${stats.isComplete ? 'complete' : ''}">
            <span>${stats.isComplete ? '★ Knowledge Checked (All graded questions passed)' : `${stats.passedCount} of ${stats.totalGraded} checks passed (${stats.firstTryAccuracy}% first-try accuracy)`}</span>
          </div>
          ${renderPilotQuestionHtml(l, q, qp, activeIdx)}
        ` : `
          <form id="quiz">
            <fieldset>
              <legend>${esc(l.question)}</legend>
              ${l.answers.map((a, i) => `<label><input type="radio" name="answer" value="${i}" ${state.answers[l.id] === i ? 'checked' : ''}>${esc(a)}</label>`).join('')}
            </fieldset>
            <button style="margin-top:12px" type="submit">Check answer</button>
          </form>
          <div id="feedback" aria-live="polite"></div>
        `}
      </div>
    </section>

    <aside>
      <div class="panel">
        <p class="eyebrow">Before you begin</p>
        <h3>Hair to use</h3>
        <p>${esc(l.hair)}</p>
        <h3>Tools & products</h3>
        <ul>${l.tools.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="note">${esc(l.note)}</p>
        <a class="small" href="#kit">Open the hair & tools guide →</a>
      </div>

      <div class="panel">
        <label for="notes">My practice notes <span id="note-saved" class="saved"></span></label>
        <p class="small">What worked? What needs improving? Add your own photo filenames if helpful.</p>
        <textarea id="notes" maxlength="10000" placeholder="One thing I learned… One thing I will change…">${esc(state.notes[l.id] || '')}</textarea>
        <p class="small">Saved in this browser. Use “Back up progress” to keep a copy or move devices.</p>
      </div>

      <div class="actions">
        ${l.number > 1 ? `<a class="button quiet" href="#lesson/${LESSONS[l.number - 2].id}">← Previous</a>` : ''}
        ${l.number < LESSONS.length ? `<a class="button" href="#lesson/${LESSONS[l.number].id}">Next lesson →</a>` : '<a class="button" href="#bridal">Plan your trial →</a>'}
      </div>
    </aside>
  </div>`;
}

function feedback(l) {
  const a = state.answers[l.id];
  if (a === undefined) return;
  const isCorrect = a === l.correct;
  const fb = $('#feedback');
  if (!fb) return;
  fb.className = 'feedback ' + (isCorrect ? 'correct' : '');
  fb.textContent = (isCorrect ? 'Correct. ' : 'Try again. ') + l.note;
}

// -------------------------------------------------------------
// PHASE 4: REHEARSAL TIMER, MULTI-PROFILE BRIDAL & ENHANCED GUIDES
// -------------------------------------------------------------

const REHEARSAL_PRESETS = {
  full: {
    id: 'full',
    label: 'Full Bridal Rehearsal (90 min)',
    totalMinutes: 90,
    phases: [
      { name: '1. Scalp Prep & Braid Foundation', minutes: 30 },
      { name: '2. Lace Melt & Perimeter Security', minutes: 25 },
      { name: '3. Bridal Styling & Hairpiece Anchor', minutes: 25 },
      { name: '4. Veil Placement & Touch-Up Handover', minutes: 10 }
    ]
  },
  express: {
    id: 'express',
    label: 'Express Styling Rehearsal (45 min)',
    totalMinutes: 45,
    phases: [
      { name: '1. Cap & Foundation', minutes: 15 },
      { name: '2. Styling Execution', minutes: 20 },
      { name: '3. Veil & Fixative', minutes: 10 }
    ]
  },
  drill: {
    id: 'drill',
    label: 'Quick Touch-Up Drill (15 min)',
    totalMinutes: 15,
    phases: [
      { name: '1. Edge Re-melt & Sweat Check', minutes: 5 },
      { name: '2. Pin Security & Veil Adjustment', minutes: 10 }
    ]
  }
};

let rehearsalTimer = {
  presetId: 'full',
  activePhaseIdx: 0,
  secondsRemaining: 90 * 60,
  totalSeconds: 90 * 60,
  isRunning: false,
  intervalId: null
};

let journalFilter = 'all';

function formatTimerDigits(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function playTimerChime() {
  if (state.settings?.reducedMotion || state.settings?.celebrationsEnabled === false) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {}
}

function startRehearsalTimer() {
  if (rehearsalTimer.isRunning) return;
  rehearsalTimer.isRunning = true;
  clearInterval(rehearsalTimer.intervalId);
  rehearsalTimer.intervalId = setInterval(tickRehearsalTimer, 1000);
  updateTimerUI();
}

function pauseRehearsalTimer() {
  rehearsalTimer.isRunning = false;
  clearInterval(rehearsalTimer.intervalId);
  updateTimerUI();
}

function resetRehearsalTimer(presetId = rehearsalTimer.presetId) {
  rehearsalTimer.isRunning = false;
  clearInterval(rehearsalTimer.intervalId);
  rehearsalTimer.presetId = presetId;
  const p = REHEARSAL_PRESETS[presetId] || REHEARSAL_PRESETS.full;
  rehearsalTimer.totalSeconds = p.totalMinutes * 60;
  rehearsalTimer.secondsRemaining = rehearsalTimer.totalSeconds;
  rehearsalTimer.activePhaseIdx = 0;
  updateTimerUI();
}

function tickRehearsalTimer() {
  if (!rehearsalTimer.isRunning) return;
  if (rehearsalTimer.secondsRemaining > 0) {
    rehearsalTimer.secondsRemaining--;
    const p = REHEARSAL_PRESETS[rehearsalTimer.presetId] || REHEARSAL_PRESETS.full;
    const elapsed = rehearsalTimer.totalSeconds - rehearsalTimer.secondsRemaining;
    let accumulated = 0;
    let newPhaseIdx = 0;
    for (let i = 0; i < p.phases.length; i++) {
      accumulated += p.phases[i].minutes * 60;
      if (elapsed < accumulated || i === p.phases.length - 1) {
        newPhaseIdx = i;
        break;
      }
    }
    if (newPhaseIdx !== rehearsalTimer.activePhaseIdx) {
      rehearsalTimer.activePhaseIdx = newPhaseIdx;
      playTimerChime();
    }
    updateTimerUI();
  } else {
    pauseRehearsalTimer();
    playTimerChime();
    const p = REHEARSAL_PRESETS[rehearsalTimer.presetId] || REHEARSAL_PRESETS.full;
    if (!state.rehearsalLog) state.rehearsalLog = [];
    const activeProf = (state.bridalProfiles && state.bridalProfiles[state.activeBridalProfile]) || { clientName: 'Practice Bride' };
    state.rehearsalLog.push({
      id: 'reh_' + Date.now(),
      presetId: p.id,
      presetLabel: p.label,
      durationMinutes: p.totalMinutes,
      clientName: activeProf.clientName,
      completedAt: new Date().toISOString()
    });
    evaluateBadges(state, { triggerCelebration: true });
    save();
    updateTimerUI();
    notify(`Congratulations! Completed ${p.label} rehearsal.`);
  }
}

function updateTimerUI() {
  const digitsEl = document.getElementById('timer-digits');
  if (!digitsEl) return;
  const p = REHEARSAL_PRESETS[rehearsalTimer.presetId] || REHEARSAL_PRESETS.full;
  digitsEl.textContent = formatTimerDigits(rehearsalTimer.secondsRemaining);
  const phasePill = document.getElementById('timer-phase-pill');
  if (phasePill) {
    const curPhase = p.phases[rehearsalTimer.activePhaseIdx] || p.phases[0];
    phasePill.textContent = `Phase ${rehearsalTimer.activePhaseIdx + 1} of ${p.phases.length}: ${curPhase.name} (${curPhase.minutes}m)`;
  }
  const fill = document.getElementById('timer-progress-fill');
  if (fill) {
    const pct = rehearsalTimer.totalSeconds > 0 ? Math.round(((rehearsalTimer.totalSeconds - rehearsalTimer.secondsRemaining) / rehearsalTimer.totalSeconds) * 100) : 0;
    fill.style.width = pct + '%';
  }
  const toggleBtn = document.getElementById('timer-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = rehearsalTimer.isRunning ? 'Pause Rehearsal ⏸' : (rehearsalTimer.secondsRemaining < rehearsalTimer.totalSeconds ? 'Resume Rehearsal ▶' : 'Start Rehearsal ▶');
  }
  document.querySelectorAll('.timer-phase-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === rehearsalTimer.activePhaseIdx && rehearsalTimer.isRunning);
    el.classList.toggle('done', idx < rehearsalTimer.activePhaseIdx);
  });
}

function renderTimerHtml() {
  const p = REHEARSAL_PRESETS[rehearsalTimer.presetId] || REHEARSAL_PRESETS.full;
  const curPhase = p.phases[rehearsalTimer.activePhaseIdx] || p.phases[0];
  const pct = rehearsalTimer.totalSeconds > 0 ? Math.round(((rehearsalTimer.totalSeconds - rehearsalTimer.secondsRemaining) / rehearsalTimer.totalSeconds) * 100) : 0;
  const logCount = (state.rehearsalLog || []).length;

  return `
    <div class="timer-panel" role="region" aria-label="Bridal Rehearsal Pacing Timer">
      <div class="timer-header">
        <div>
          <span class="timer-badge">PACING STOPWATCH</span>
          <h2 style="margin:4px 0 0;font-size:22px;color:white">Bridal Rehearsal Live Timer</h2>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <label for="timer-preset-select" class="visually-hidden">Rehearsal Preset</label>
          <select id="timer-preset-select" style="background:#2b1a25;color:white;border-color:#591d3e;font-size:13px;padding:6px 10px">
            ${Object.values(REHEARSAL_PRESETS).map(pr => `<option value="${pr.id}" ${pr.id === rehearsalTimer.presetId ? 'selected' : ''}>${pr.label}</option>`).join('')}
          </select>
          <span class="badge" style="background:#3a2030;color:var(--gold)">${logCount} Rehearsal${logCount === 1 ? '' : 's'} Logged</span>
        </div>
      </div>
      <div class="timer-display">
        <div id="timer-digits" class="timer-digits" role="timer" aria-live="off">${formatTimerDigits(rehearsalTimer.secondsRemaining)}</div>
        <div id="timer-phase-pill" class="timer-phase-pill" role="status" aria-live="polite">Phase ${rehearsalTimer.activePhaseIdx + 1} of ${p.phases.length}: ${curPhase.name} (${curPhase.minutes}m)</div>
      </div>
      <div class="timer-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div id="timer-progress-fill" class="timer-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="timer-controls">
        <button type="button" id="timer-toggle-btn" class="button timer-btn-primary">
          ${rehearsalTimer.isRunning ? 'Pause Rehearsal ⏸' : (rehearsalTimer.secondsRemaining < rehearsalTimer.totalSeconds ? 'Resume Rehearsal ▶' : 'Start Rehearsal ▶')}
        </button>
        <button type="button" id="timer-next-phase-btn" class="button timer-btn-secondary" title="Advance to next phase">Next Phase ⏭</button>
        <button type="button" id="timer-reset-btn" class="button timer-btn-secondary" title="Reset stopwatch">Reset ↺</button>
      </div>
      <div class="timer-phase-list">
        ${p.phases.map((ph, idx) => `
          <div class="timer-phase-item ${idx === rehearsalTimer.activePhaseIdx && rehearsalTimer.isRunning ? 'active' : ''} ${idx < rehearsalTimer.activePhaseIdx ? 'done' : ''}">
            <strong>${idx + 1}. ${esc(ph.name.split(':')[0])}</strong><br>
            <span>${ph.minutes} mins</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function compressAndStorePhoto(lessonId, file) {
  if (!file) return Promise.resolve(null);
  if (!file.type.startsWith('image/')) {
    notify('Please select an image file (JPEG, PNG, WebP).');
    return Promise.resolve(null);
  }
  if (file.size > 8 * 1024 * 1024) {
    notify('Image file is too large (maximum 8MB).');
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUri = canvas.toDataURL('image/jpeg', 0.72);
        if (!state.photos) state.photos = {};
        state.photos[lessonId] = compressedDataUri;
        evaluateBadges(state, { triggerCelebration: true });
        save();
        render();
        notify('Practice photo attached and saved.');
        resolve(compressedDataUri);
      };
      img.onerror = () => {
        notify('Could not process this image.');
        resolve(null);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

let lastPhotoFocus = null;

function openPhotoModal(src) {
  const modal = document.getElementById('photo-modal');
  const img = document.getElementById('photo-modal-img');
  if (!modal || !img) return;
  lastPhotoFocus = document.activeElement;
  img.src = src;
  try {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  } catch (e) {
    modal.setAttribute('open', '');
  }
  const closeBtn = document.getElementById('close-photo-modal');
  if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
}

function closePhotoModal() {
  const modal = document.getElementById('photo-modal');
  if (!modal) return;
  try {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  } catch (e) {
    modal.removeAttribute('open');
  }
  if (lastPhotoFocus && typeof lastPhotoFocus.focus === 'function') {
    lastPhotoFocus.focus();
    lastPhotoFocus = null;
  }
}

function kit() {
  const kitItems = KIT;
  const checkedCount = kitItems.filter(k => state.kit[k]).length;
  const pct = Math.round((checkedCount / kitItems.length) * 100);

  return `
    <div class="intro">
      <p class="eyebrow">HAIR FIBRE & SALON ARSENAL · 2026 EDITION</p>
      <h1>Hair Fibre Diagnostics & Studio Tools</h1>
      <p class="muted">Master tactile fibre identification, thermal limits, Ghanaian coastal humidity resistance, and hospital-grade salon sanitisation protocols.</p>
    </div>

    <!-- Fibre Diagnostic Matrix -->
    <h2 style="font-size:24px;margin:28px 0 12px">Tactile Hair Fibre Identification Matrix</h2>
    <div class="fibre-matrix">
      <div class="fibre-card highlight">
        <span class="fibre-tag">PREMIUM BRIDAL</span>
        <h3>100% Human Hair (Virgin / Remy)</h3>
        <p class="fibre-metric"><strong>Thermal Limit:</strong> 150°C–180°C (300°F–350°F). Always use silicone-free heat protectant spray.</p>
        <p class="fibre-metric"><strong>Accra Climate:</strong> High moisture absorption. Expands under 80%+ humidity; requires humidity-shield lacquer to lock curls.</p>
        <p class="fibre-metric"><strong>Burn Test:</strong> Burns slowly with white smoke; distinctive keratin/feather odor; crushes into soft, dark ash.</p>
        <p class="fibre-metric"><strong>Wash & Care:</strong> Sulfate-free moisturizing shampoo, silicone-free deep conditioner; air-dry on block.</p>
      </div>
      <div class="fibre-card">
        <span class="fibre-tag">HYBRID PRACTICE</span>
        <h3>Human Hair / Synthetic Blend</h3>
        <p class="fibre-metric"><strong>Thermal Limit:</strong> Strictly ≤ 160°C (320°F). Exceeding this irreversibly melts the synthetic component.</p>
        <p class="fibre-metric"><strong>Accra Climate:</strong> Moderate humidity tolerance. Synthetic component resists wilting, but over-heating causes separation.</p>
        <p class="fibre-metric"><strong>Burn Test:</strong> Emits mixed odor; produces partial soft ash alongside small hard beads.</p>
        <p class="fibre-metric"><strong>Wash & Care:</strong> Lukewarm water; synthetic-friendly cleansing; never rub or twist lace perimeters.</p>
      </div>
      <div class="fibre-card">
        <span class="fibre-tag">RESILIENT SYNTHETIC</span>
        <h3>Heat-Friendly Synthetic (Futura / Kanekalon)</h3>
        <p class="fibre-metric"><strong>Thermal Limit:</strong> 120°C–140°C (250°F–285°F). Must cool completely in pinned position to take the shape.</p>
        <p class="fibre-metric"><strong>Accra Climate:</strong> Outstanding humidity immunity; zero frizz from ocean breeze. Prone to friction frizz at neckline.</p>
        <p class="fibre-metric"><strong>Burn Test:</strong> Melts rapidly with dark chemical smoke; plastic odor; hard uncrushable black bead.</p>
        <p class="fibre-metric"><strong>Wash & Care:</strong> Cool soak with synthetic wig wash and fabric softener bath for fiber revival.</p>
      </div>
      <div class="fibre-card">
        <span class="fibre-tag">READY-TO-WEAR</span>
        <h3>Ordinary Synthetic</h3>
        <p class="fibre-metric"><strong>Thermal Limit:</strong> ZERO hot tools. Flat irons and curling wands instantly scorch and ruin the unit.</p>
        <p class="fibre-metric"><strong>Accra Climate:</strong> Completely unaffected by tropical humidity, but prone to static cling during dry harmattan dust.</p>
        <p class="fibre-metric"><strong>Burn Test:</strong> Rapid flame; sharp chemical smell; instantly forms dense plastic lump.</p>
        <p class="fibre-metric"><strong>Wash & Care:</strong> Cold water soak only; leave-in synthetic conditioner spray; finger-detangle only.</p>
      </div>
    </div>

    <!-- Salon Sanitisation & Hygiene SOP -->
    <div class="sop-box">
      <h3 style="margin-top:0;font-size:18px;color:#164734">Salon Sanitisation & Cross-Contamination SOP (Ghana Standard)</h3>
      <ol style="margin:10px 0;padding-left:20px;font-size:14px;line-height:1.6">
        <li><strong>Tool Sterilisation:</strong> Submerge metal tail combs, stainless clips, and shears in hospital-grade disinfectant (Barbicide or 70% isopropyl alcohol) for a full 10 minutes between every client.</li>
        <li><strong>Wig Block Hygiene:</strong> Wrap canvas and styrofoam styling heads with fresh plastic barrier film prior to pinning each unit to prevent oil, adhesive, and scalp buildup.</li>
        <li><strong>Adhesive Safety & Patch Testing:</strong> Always test liquid latex/acrylic adhesives behind the ear 24–48 hours prior to installation. Never install over broken skin, abrasions, or fresh relaxer burns.</li>
        <li><strong>Gentle Bond Release:</strong> Apply citrus or alcohol-based solvent generously and wait 3–5 minutes. Never pull dry lace edges away from the natural hairline.</li>
      </ol>
    </div>

    <!-- Categorised Studio Kit Checklist -->
    <div class="panel" style="margin-top:28px">
      <div class="row" style="margin-bottom:14px">
        <div>
          <h2 style="font-size:22px;margin:0">Studio Tool Inventory & Readiness</h2>
          <p class="small muted" style="margin:2px 0 0">Tick each item currently packed in your mobile styling kit.</p>
        </div>
        <span id="kit-readiness-badge" class="badge ${checkedCount === kitItems.length ? 'done' : ''}">${checkedCount} of ${kitItems.length} ready (${pct}%)</span>
      </div>
      <div class="progress" style="margin:10px 0 20px">
        <span id="kit-progress-fill" style="width:${pct}%"></span>
      </div>
      <div class="kit-module-grid">
        <div class="kit-module">
          <h3>Module A: Foundation & Cap Setup</h3>
          <ul class="checklist">
            <li><label><input type="checkbox" data-kit="0" ${state.kit[kitItems[0]] ? 'checked' : ''}><span>${esc(kitItems[0])}</span></label></li>
            <li><label><input type="checkbox" data-kit="3" ${state.kit[kitItems[3]] ? 'checked' : ''}><span>${esc(kitItems[3])}</span></label></li>
            <li><label><input type="checkbox" data-kit="4" ${state.kit[kitItems[4]] ? 'checked' : ''}><span>${esc(kitItems[4])}</span></label></li>
          </ul>
        </div>
        <div class="kit-module">
          <h3>Module B: Thermal & Precision Styling</h3>
          <ul class="checklist">
            <li><label><input type="checkbox" data-kit="1" ${state.kit[kitItems[1]] ? 'checked' : ''}><span>${esc(kitItems[1])}</span></label></li>
            <li><label><input type="checkbox" data-kit="2" ${state.kit[kitItems[2]] ? 'checked' : ''}><span>${esc(kitItems[2])}</span></label></li>
            <li><label><input type="checkbox" data-kit="5" ${state.kit[kitItems[5]] ? 'checked' : ''}><span>${esc(kitItems[5])}</span></label></li>
            <li><label><input type="checkbox" data-kit="6" ${state.kit[kitItems[6]] ? 'checked' : ''}><span>${esc(kitItems[6])}</span></label></li>
          </ul>
        </div>
        <div class="kit-module">
          <h3>Module C: Adhesives, Cleansers & Care</h3>
          <ul class="checklist">
            <li><label><input type="checkbox" data-kit="8" ${state.kit[kitItems[8]] ? 'checked' : ''}><span>${esc(kitItems[8])}</span></label></li>
            <li><label><input type="checkbox" data-kit="9" ${state.kit[kitItems[9]] ? 'checked' : ''}><span>${esc(kitItems[9])}</span></label></li>
          </ul>
        </div>
        <div class="kit-module">
          <h3>Module D: Bridal Finishing & Emergency</h3>
          <ul class="checklist">
            <li><label><input type="checkbox" data-kit="7" ${state.kit[kitItems[7]] ? 'checked' : ''}><span>${esc(kitItems[7])}</span></label></li>
            <li><label><input type="checkbox" data-kit="10" ${state.kit[kitItems[10]] ? 'checked' : ''}><span>${esc(kitItems[10])}</span></label></li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function journal() {
  evaluateBadges(state, { triggerCelebration: false });
  const pilots = LESSONS.filter(l => l.isPilot);
  const totalPilotGraded = pilots.reduce((acc, l) => acc + (l.questions || []).filter(q => q.status === 'ready' && q.type !== 'reflection').length, 0);
  const passedPilotGraded = pilots.reduce((acc, l) => acc + getLessonKnowledgeStats(l).passedCount, 0);
  const pts = state.gamification?.activityPoints || calculateActivityPoints(state);
  const photoCount = Object.keys(state.photos || {}).length;
  const rehearsalsCount = (state.rehearsalLog || []).length;

  let filtered = LESSONS;
  if (journalFilter === 'done') {
    filtered = LESSONS.filter(l => state.done[l.id]);
  } else if (journalFilter === 'notes') {
    filtered = LESSONS.filter(l => state.notes[l.id] && state.notes[l.id].trim().length > 0);
  } else if (journalFilter === 'photos') {
    filtered = LESSONS.filter(l => state.photos && state.photos[l.id]);
  } else if (['Foundation', 'Installation', 'Everyday', 'Bridal', 'Care'].includes(journalFilter)) {
    filtered = LESSONS.filter(l => l.group === journalFilter);
  }

  return `
    <div class="intro">
      <p class="eyebrow">STUDIO PRACTICE JOURNAL & CLIENT RECORDS</p>
      <h1>Executive Practice Records</h1>
      <p class="muted">Chronicle hands-on mastery, review diagnostic quiz scores, attach photographic evidence, and track verified rehearsal pacing.</p>
      <div style="margin-top:12px">
        <a class="button quiet" href="#today">Open Today's Dashboard →</a>
      </div>
    </div>

    <!-- 5-Metric Summary Strip -->
    <div class="metrics-strip" style="grid-template-columns:repeat(5,1fr);margin-bottom:24px">
      <div class="metric-tile">
        <div class="metric-num">${completed()}<span style="font-size:18px;color:var(--muted)">/17</span></div>
        <div class="metric-lbl">Practised</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${passedPilotGraded}<span style="font-size:18px;color:var(--muted)">/${totalPilotGraded}</span></div>
        <div class="metric-lbl">Pilot Checks</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${rehearsalsCount}</div>
        <div class="metric-lbl">Rehearsals</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${photoCount}</div>
        <div class="metric-lbl">Photos</div>
      </div>
      <div class="metric-tile">
        <div class="metric-num">${pts}</div>
        <div class="metric-lbl">Studio Points</div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="journal-filter-bar">
      ${[
        { id: 'all', label: 'All Lessons (17)' },
        { id: 'done', label: 'Practised Only' },
        { id: 'notes', label: 'With Notes' },
        { id: 'photos', label: 'With Photos' },
        { id: 'Foundation', label: 'Foundation' },
        { id: 'Installation', label: 'Installation' },
        { id: 'Everyday', label: 'Everyday' },
        { id: 'Bridal', label: 'Bridal' },
        { id: 'Care', label: 'Care' }
      ].map(f => `
        <button type="button" class="journal-filter-btn ${journalFilter === f.id ? 'active' : ''}" data-journal-filter="${f.id}">
          ${f.label}
        </button>
      `).join('')}
    </div>

    <!-- Journal Entries -->
    <div class="panel">
      ${filtered.length > 0 ? filtered.map(l => {
        const stats = getLessonKnowledgeStats(l);
        const hasPhoto = Boolean(state.photos && state.photos[l.id]);
        const noteText = state.notes[l.id] || '';

        return `
          <article class="journal-entry">
            <div class="row">
              <div>
                <span class="small muted">${l.group} · Lesson ${String(l.number).padStart(2, '0')}</span>
                <h3 style="margin:2px 0 4px"><a href="#lesson/${l.id}">${esc(l.title)}</a></h3>
              </div>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <span class="badge ${state.done[l.id] ? 'done' : ''}">${state.done[l.id] ? 'Practised ✓' : 'In progress'}</span>
                ${stats.isComplete ? '<span class="badge" style="background:#e2f0e8;color:var(--green)">Knowledge Checked ✓</span>' : ''}
              </div>
            </div>

            <p style="margin:10px 0;white-space:pre-wrap;font-size:14px">${esc(noteText || 'No practice observations recorded yet. Open the lesson to record notes.')}</p>

            <!-- Photo Section -->
            <div class="journal-photo-section">
              ${hasPhoto ? `
                <img class="journal-photo-thumb" src="${esc(state.photos[l.id])}" alt="Practice photo for ${esc(l.title)}" data-view-photo="${l.id}" title="Click to enlarge photo">
                <button type="button" class="button quiet" style="font-size:12px;padding:4px 10px" data-view-photo="${l.id}">View full photo 🔍</button>
                <button type="button" class="link-button small" style="color:#b83232" data-remove-photo="${l.id}">Remove photo</button>
              ` : `
                <label class="photo-upload-label">
                  <input type="file" accept="image/*" data-photo-upload="${l.id}" hidden>
                  📷 Attach Practice Photo
                </label>
                <span class="small muted">Photos are compressed client-side and saved privately on your device.</span>
              `}
              <div style="margin-left:auto">
                <a class="button quiet" style="font-size:12px;padding:5px 12px" href="#lesson/${l.id}">Open lesson →</a>
              </div>
            </div>
          </article>
        `;
      }).join('') : `
        <div class="empty">
          <h3>No lessons match this filter</h3>
          <p>Try selecting "All Lessons" or record your practice notes.</p>
          <button type="button" class="quiet" id="reset-journal-filter">Show all lessons</button>
        </div>
      `}
    </div>
  `;
}

function bridal() {
  evaluateBadges(state, { triggerCelebration: false });
  if (!state.bridalProfiles) state.bridalProfiles = {};
  if (Object.keys(state.bridalProfiles).length === 0) {
    state.bridalProfiles = emptyV2(state.activeLearnerId).bridalProfiles;
  }
  const activeId = state.activeBridalProfile && state.bridalProfiles[state.activeBridalProfile]
    ? state.activeBridalProfile
    : Object.keys(state.bridalProfiles)[0] || 'default';
  state.activeBridalProfile = activeId;
  const prof = state.bridalProfiles[activeId];

  // Sync legacy fields
  for (const [k, v] of Object.entries(state.bridal || {})) {
    if (!prof.fields[k] && v) prof.fields[k] = v;
  }

  const schedule = prof.schedule || [];
  const checklist = prof.contractChecklist || {};

  return `
    <div class="intro">
      <p class="eyebrow">BRIDAL EXECUTIVE SUITE · GHANA</p>
      <h1>Bridal Planner & Rehearsal Run Sheet</h1>
      <p class="muted">Manage client styling run sheets, execute timed rehearsals against the wedding morning clock, and verify weather-proof security.</p>
    </div>

    <!-- Live Trial Rehearsal Timer -->
    ${renderTimerHtml()}

    <!-- Multi-Profile Bar -->
    <div class="bridal-top-bar">
      <div class="profile-selector-wrap">
        <label for="bridal-profile-select" style="margin:0;font-weight:700">Active Bride / Event:</label>
        <select id="bridal-profile-select" style="min-width:220px">
          ${Object.values(state.bridalProfiles).map(p => `
            <option value="${p.id}" ${p.id === activeId ? 'selected' : ''}>${esc(p.clientName || 'Unnamed Bride')} (${esc(p.eventDate || 'No date')})</option>
          `).join('')}
        </select>
        <button type="button" id="btn-new-bridal-profile" class="quiet" style="font-size:13px;padding:6px 14px">+ New Bride Profile</button>
      </div>
      <div>
        <button type="button" id="print" class="button quiet" style="gap:6px">🖨️ Print Wedding Run Sheet</button>
      </div>
    </div>

    <!-- Profile Metadata Editor -->
    <div class="panel" style="margin-bottom:24px">
      <h3 style="margin-top:0;font-size:18px;color:var(--plum)">Client & Ceremony Details</h3>
      <div class="profile-meta-grid">
        <div>
          <label for="bride-client-name">Bride / Client Practice Name</label>
          <input type="text" id="bride-client-name" value="${esc(prof.clientName || '')}" placeholder="e.g. Nana Ama Rehearsal">
        </div>
        <div>
          <label for="bride-event-date">Wedding / Trial Date</label>
          <input type="date" id="bride-event-date" value="${esc(prof.eventDate || '')}">
        </div>
        <div>
          <label for="bride-ceremony-type">Ceremony Style</label>
          <input type="text" id="bride-ceremony-type" value="${esc(prof.ceremonyType || '')}" placeholder="e.g. Traditional Engagement & Church Wedding">
        </div>
        <div>
          <label for="bride-venue-climate">Venue & Climate Plan</label>
          <input type="text" id="bride-venue-climate" value="${esc(prof.venueClimate || '')}" placeholder="e.g. Outdoor Coastal Lawn & Air-Conditioned Hall">
        </div>
        <div>
          <label for="bride-party-count">Bridal Party Count</label>
          <input type="number" id="bride-party-count" min="1" max="20" value="${prof.bridalPartyCount || 1}">
        </div>
      </div>
    </div>

    <!-- Morning-of Schedule Timeline -->
    <div class="panel" style="margin-bottom:24px">
      <div class="row" style="margin-bottom:12px">
        <div>
          <h3 style="margin:0;font-size:18px;color:var(--plum)">Morning-of Styling Schedule</h3>
          <p class="small muted" style="margin:2px 0 0">Tick each phase as completed on the wedding morning.</p>
        </div>
        <button type="button" id="btn-add-schedule-step" class="quiet" style="font-size:12px;padding:5px 12px">+ Add Timeline Step</button>
      </div>
      <table class="schedule-table">
        <thead>
          <tr>
            <th style="width:40px">Done</th>
            <th style="width:110px">Target Time</th>
            <th>Styling Phase & Action Plan</th>
          </tr>
        </thead>
        <tbody>
          ${schedule.map((st, sIdx) => `
            <tr>
              <td>
                <input type="checkbox" data-schedule-idx="${sIdx}" ${st.done ? 'checked' : ''} aria-label="Mark step done">
              </td>
              <td class="schedule-time">
                <input type="text" data-schedule-time="${sIdx}" value="${esc(st.time)}" style="width:85px;padding:4px 6px;font-family:monospace;font-size:13px">
              </td>
              <td>
                <input type="text" data-schedule-task="${sIdx}" value="${esc(st.task)}" style="width:100%;padding:4px 8px;font-size:13px">
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- 8 Core Planning Fields -->
    <h3 style="font-size:20px;margin:28px 0 14px">Technical Styling Specifications</h3>
    <div class="split">
      ${Object.entries(FIELDS).map(([k, label]) => `
        <div class="panel">
          <label for="bride-${k}">${esc(label)}</label>
          <textarea id="bride-${k}" data-bride="${k}" maxlength="10000" placeholder="Add detailed notes for ${esc(label).toLowerCase()}…">${esc(prof.fields[k] || '')}</textarea>
        </div>`).join('')}
    </div>

    <!-- Safety & Service Agreement Checklist -->
    <div class="panel card-gold" style="margin-top:24px">
      <h3 style="margin:0 0 6px;font-size:18px;color:var(--plum)">Bridal Security & Contract Verification Checklist</h3>
      <p class="small muted">Professional quality controls required before wedding day departure.</p>
      <div class="contract-grid">
        <label class="contract-item">
          <input type="checkbox" data-contract="trialCompleted" ${checklist.trialCompleted ? 'checked' : ''}>
          <span>Trial rehearsal completed and 360° photographed</span>
        </label>
        <label class="contract-item">
          <input type="checkbox" data-contract="patchTestSigned" ${checklist.patchTestSigned ? 'checked' : ''}>
          <span>24–48h adhesive patch test verified & documented</span>
        </label>
        <label class="contract-item">
          <input type="checkbox" data-contract="depositReceived" ${checklist.depositReceived ? 'checked' : ''}>
          <span>Booking agreement & terms acknowledged</span>
        </label>
        <label class="contract-item">
          <input type="checkbox" data-contract="removerSupplied" ${checklist.removerSupplied ? 'checked' : ''}>
          <span>Compatible adhesive remover handed to bride</span>
        </label>
        <label class="contract-item">
          <input type="checkbox" data-contract="touchupKitPacked" ${checklist.touchupKitPacked ? 'checked' : ''}>
          <span>Emergency touch-up kit (pins, mini comb, blotting paper) packed</span>
        </label>
      </div>
    </div>

    <p class="small" id="planner-saved" role="status" style="margin-top:16px">All profile changes auto-save locally. Back up progress before moving devices.</p>
    <div class="actions" style="margin-top:16px">
      <button id="print-bottom" class="button quiet">Print this run sheet</button>
      <a class="button" href="#lesson/bridalrun">Open lesson 17: Bridal rehearsal →</a>
    </div>
  `;
}

function sources() {
  return `<div class="intro">
    <p class="eyebrow">Sources & practical help</p>
    <h1>Made for learning.</h1>
    <p>17 selected public YouTube videos accompany original short study notes. Titles, creators and accessible video pages were checked in September 2026. Selection used visible video details and available previews, not a complete expert review of every minute.</p>
    <p>Some videos include sponsorships, optional chemicals or extra techniques. Follow the lesson’s scope and the exact product instructions. The pack is a study aid; hands-on feedback remains valuable.</p>
  </div>
  <div class="split">
    <section class="panel">
      <h2>Ghana service signals</h2>
      <ul class="source-list">
        <li>${ext('https://studio623gh.com/services/wigs-frontal-closure/', 'Studio 623, Accra: wigs, frontals and closures')}</li>
        <li>${ext('https://twinklesbeauty.co/wig-installation-maintenance/', 'Twinkles Beauty, Accra: installation and maintenance')}</li>
      </ul>
      <p class="small">Service menus indicate what salons offer. They do not establish booking volume or a national demand ranking.</p>
      <h2>Bridal 2026 inspiration</h2>
      <p>${ext('https://www.whowhatwear.com/beauty/hair/wedding-hair-trends-2026', 'Who What Wear: wedding hair trends for 2026')}</p>
      <p class="small">International inspiration, interpreted as a practice shortlist for Ghana. Established technique videos can teach a current look even if uploaded earlier.</p>
    </section>
    <section class="panel">
      <h2>Fibre care references</h2>
      <ul class="source-list">
        <li>${ext('https://www.hairuwear.com/hair-care-and-styling/', 'HairUWear: hair care and styling')}</li>
        <li>${ext('https://jonrenau.com/blog/synthetic-hair-care-101/', 'Jon Renau: synthetic hair care')}</li>
      </ul>
      <h2>Saving your work</h2>
      <p>Notes, quiz answers and checklists are stored locally in this browser. They are not sent to a server and do not automatically sync with YouTube or another device.</p>
      <p>Use <strong>Back up progress</strong> to download a JSON file. Use <strong>Restore progress</strong> to merge a backup into this browser. Existing notes are preserved; imported text fills empty fields.</p>
      <p class="small">Keep using the same file location and browser. Browser clearing, private mode or moving the file can affect saved progress. YouTube videos need internet; the written guides and local thumbnails work offline.</p>
    </section>
  </div>
  <details>
    <summary>Video credits and direct links</summary>
    <ol>
      ${LESSONS.map(l => `<li>${ext('https://www.youtube.com/watch?v=' + l.video, l.videoTitle)}<br><span class="small">${esc(l.creator)}</span></li>`).join('')}
    </ol>
  </details>`;
}

// -------------------------------------------------------------
// MAIN ROUTER & INTERACTION HANDLERS
// -------------------------------------------------------------

function render() {
  let route = location.hash.slice(1) || 'today';
  if (route === 'main') route = 'learn';
  const l = route.startsWith('lesson/') ? LESSONS.find(v => v.id === route.split('/')[1]) : null;
  const active = l ? 'learn' : route;

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.removeAttribute('aria-current');
    if (a.dataset.nav === active) a.setAttribute('aria-current', 'page');
  });

  const routes = { today, learn, kit, journal, bridal, sources };
  $('#main').innerHTML = l ? lesson(l) : (routes[route] || today)();
  document.title = (l ? l.title : ({ today: 'Today', learn: 'Learn', kit: 'Hair & tools', journal: 'My practice', bridal: 'Bridal planner', sources: 'Sources & help' }[route] || 'Today')) + ' | Sandy';

  $('#close-celebration-btn')?.addEventListener('click', () => closeMilestoneModal());
  const celebModal = document.getElementById('celebration-modal');
  if (celebModal && !celebModal._hasA11yListeners) {
    celebModal._hasA11yListeners = true;
    celebModal.addEventListener('click', e => {
      if (e.target === celebModal) closeMilestoneModal();
    });
    celebModal.addEventListener('cancel', () => {
      closeMilestoneModal();
    });
  }

  if (route === 'today') {
    $('#today-goal-select')?.addEventListener('change', e => {
      const val = parseInt(e.target.value, 10);
      if (val >= 1 && val <= 7) {
        state.gamification.weeklyGoalSessions = val;
        evaluateBadges(state, { triggerCelebration: true });
        save();
        render();
        notify(`Weekly target updated to ${val} session${val === 1 ? '' : 's'}.`);
      }
    });

    $('#today-theme-select')?.addEventListener('change', e => {
      const chosenTheme = e.target.value;
      if (['system', 'light', 'dark'].includes(chosenTheme)) {
        state.settings.theme = chosenTheme;
        applyTheme(chosenTheme);
        save();
        notify(chosenTheme === 'system' ? 'Following device system theme.' : `Switched to ${chosenTheme === 'dark' ? 'Dark' : 'Light'} theme.`);
      }
    });

    $('#pref-celebrations')?.addEventListener('change', e => {
      state.settings.celebrationsEnabled = e.target.checked;
      save();
      notify(e.target.checked ? 'Celebration effects enabled.' : 'Celebration effects muted.');
    });

    $('#pref-reduced-motion')?.addEventListener('change', e => {
      state.settings.reducedMotion = e.target.checked;
      save();
      notify(e.target.checked ? 'Reduced motion enabled.' : 'Standard motion enabled.');
    });
  }

  if ($('#lesson-grid')) {
    cards();
    $('#search')?.addEventListener('input', e => {
      query = e.target.value;
      cards();
    });
    $('#group')?.addEventListener('change', e => {
      group = e.target.value;
      cards();
    });
    $('#status')?.addEventListener('change', e => {
      status = e.target.value;
      cards();
    });
  }

  if (l) {
    const isPilot = Boolean(l.isPilot && l.questions && l.questions.length > 1);

    if (isPilot) {
      const qp = getLessonQuizProgress(l.id);
      const activeIdx = Math.max(0, Math.min(l.questions.length - 1, qp.activeIdx || 0));
      const q = l.questions[activeIdx];

      // Stepper Navigation Buttons
      $('#prev-question-btn')?.addEventListener('click', () => {
        qp.activeIdx = Math.max(0, activeIdx - 1);
        save();
        render();
      });
      $('#next-question-btn')?.addEventListener('click', () => {
        qp.activeIdx = Math.min(l.questions.length - 1, activeIdx + 1);
        save();
        render();
      });

      // Pilot Choice Form
      if (q.type === 'choice') {
        document.querySelectorAll('input[name="pilot-choice"]').forEach(radio => {
          radio.addEventListener('change', e => {
            qp.pendingChoices[q.id] = e.target.value;
            save();
          });
        });

        document.querySelectorAll('input[name="pilot-confidence"]').forEach(radio => {
          radio.addEventListener('change', e => {
            qp.activeConfidence[q.id] = e.target.value;
            save();
          });
        });

        $('#pilot-choice-form')?.addEventListener('submit', e => {
          e.preventDefault();
          const chosen = new FormData(e.target).get('pilot-choice');
          if (!chosen) {
            notify('Choose an answer first.');
            return;
          }
          const conf = new FormData(e.target).get('pilot-confidence') || 'medium';
          const isCorrect = chosen === q.correctOptionId;

          recordGradedAttempt(state, {
            lessonId: l.id,
            questionId: q.id,
            contentRevision: q.revision,
            response: chosen,
            confidence: conf !== 'skip' ? conf : null,
            outcome: isCorrect ? 'correct' : 'incorrect'
          });

          // Sync legacy answer slot for backwards-compatibility
          const optIdx = q.options.findIndex(o => o.id === chosen);
          if (optIdx >= 0) {
            state.answers[l.id] = optIdx;
            state.legacyAnswers[l.id] = {
              selectedOptionIndex: optIdx,
              migratedAt: new Date().toISOString(),
              status: 'legacy-uncalibrated'
            };
          }

          evaluateBadges(state, { triggerCelebration: true });
          save();
          render();
          notify(isCorrect ? 'Correct! Review the explanation.' : 'Incorrect. Review the technique notes.');
        });
      }

      // Pilot Ordering Form
      if (q.type === 'order') {
        const currentOrder = qp.stepOrders[q.id] || q.steps.map(s => s.id);

        document.querySelectorAll('[data-move-up]').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepId = btn.dataset.moveUp;
            const idx = currentOrder.indexOf(stepId);
            if (idx > 0) {
              const tmp = currentOrder[idx];
              currentOrder[idx] = currentOrder[idx - 1];
              currentOrder[idx - 1] = tmp;
              qp.stepOrders[q.id] = currentOrder;
              save();
              render();
            }
          });
        });

        document.querySelectorAll('[data-move-down]').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepId = btn.dataset.moveDown;
            const idx = currentOrder.indexOf(stepId);
            if (idx >= 0 && idx < currentOrder.length - 1) {
              const tmp = currentOrder[idx];
              currentOrder[idx] = currentOrder[idx + 1];
              currentOrder[idx + 1] = tmp;
              qp.stepOrders[q.id] = currentOrder;
              save();
              render();
            }
          });
        });

        $('#pilot-order-form')?.addEventListener('submit', e => {
          e.preventDefault();
          const isCorrect = currentOrder.every((id, idx) => id === q.targetOrder[idx]);

          recordGradedAttempt(state, {
            lessonId: l.id,
            questionId: q.id,
            contentRevision: q.revision,
            response: currentOrder,
            outcome: isCorrect ? 'correct' : 'incorrect'
          });

          evaluateBadges(state, { triggerCelebration: true });
          save();
          render();
          notify(isCorrect ? 'Sequence verified! Well done.' : 'Sequence not quite right. Review the steps.');
        });
      }

      // Pilot Reflection Form
      if (q.type === 'reflection') {
        const textEl = $('#pilot-reflection-text');
        textEl?.addEventListener('input', e => {
          if (!qp.draftReflections) qp.draftReflections = {};
          qp.draftReflections[q.id] = e.target.value;
          save();
        });

        $('#save-reflection-btn')?.addEventListener('click', () => {
          const val = (textEl?.value || '').trim();
          if (val.length < 10) {
            notify('Please enter a more detailed explanation (minimum 10 characters).');
            return;
          }
          const prevCriteria = state.reflections[q.id]?.criteriaChecked || [];
          state.reflections[q.id] = {
            response: val,
            criteriaChecked: prevCriteria,
            completedAt: new Date().toISOString()
          };
          evaluateBadges(state, { triggerCelebration: true });
          save();
          render();
          notify('Reflection saved. Review the model answer and check your criteria.');
        });

        document.querySelectorAll('[data-crit]').forEach(cb => {
          cb.addEventListener('change', () => {
            const critIdx = Number(cb.dataset.crit);
            if (!state.reflections[q.id]) return;
            const list = state.reflections[q.id].criteriaChecked || [];
            if (cb.checked) {
              if (!list.includes(critIdx)) list.push(critIdx);
            } else {
              const pos = list.indexOf(critIdx);
              if (pos >= 0) list.splice(pos, 1);
            }
            state.reflections[q.id].criteriaChecked = list;
            evaluateBadges(state, { triggerCelebration: true });
            save();
          });
        });
      }
    } else {
      // Legacy single-question check for non-pilot lessons
      feedback(l);
      $('#quiz')?.addEventListener('submit', e => {
        e.preventDefault();
        const chosen = new FormData(e.target).get('answer');
        if (chosen === null) {
          notify('Choose an answer first.');
          return;
        }
        const chosenIdx = Number(chosen);
        state.answers[l.id] = chosenIdx;

        state.legacyAnswers[l.id] = {
          selectedOptionIndex: chosenIdx,
          migratedAt: new Date().toISOString(),
          status: 'legacy-uncalibrated'
        };
        recordGradedAttempt(state, {
          lessonId: l.id,
          questionId: `${l.id}-q0`,
          response: String(chosenIdx),
          outcome: chosenIdx === l.correct ? 'correct' : 'incorrect'
        });

        evaluateBadges(state, { triggerCelebration: true });
        save();
        feedback(l);
      });
    }

    // Practice checkbox & notes handlers
    $('#done')?.addEventListener('change', e => {
      state.done[l.id] = e.target.checked;
      evaluateBadges(state, { triggerCelebration: true });
      save();
      notify(e.target.checked ? 'Practice recorded. Well done, keep refining it.' : 'Lesson marked for more practice.');
    });

    $('#notes')?.addEventListener('input', e => {
      state.notes[l.id] = e.target.value;
      evaluateBadges(state, { triggerCelebration: true });
      save();
      const savedNotice = $('#note-saved');
      if (savedNotice) savedNotice.textContent = storageOK ? 'Saved' : 'Back up needed';
    });

    document.querySelectorAll('[data-step]').forEach(el =>
      el.addEventListener('change', () => {
        state.checks[el.dataset.step] = el.checked;
        evaluateBadges(state, { triggerCelebration: true });
        save();
      })
    );
  }

  // Kit readiness inventory checklist
  document.querySelectorAll('[data-kit]').forEach(el =>
    el.addEventListener('change', () => {
      state.kit[KIT[Number(el.dataset.kit)]] = el.checked;
      save();
      const count = KIT.filter(k => state.kit[k]).length;
      const pct = Math.round((count / KIT.length) * 100);
      const b = document.getElementById('kit-readiness-badge');
      if (b) {
        b.textContent = `${count} of ${KIT.length} ready (${pct}%)`;
        b.classList.toggle('done', count === KIT.length);
      }
      const fill = document.getElementById('kit-progress-fill');
      if (fill) fill.style.width = pct + '%';
    })
  );

  // Phase 4: Bridal Rehearsal Live Timer
  $('#timer-preset-select')?.addEventListener('change', e => {
    resetRehearsalTimer(e.target.value);
  });

  $('#timer-toggle-btn')?.addEventListener('click', () => {
    if (rehearsalTimer.isRunning) {
      pauseRehearsalTimer();
    } else {
      startRehearsalTimer();
    }
  });

  $('#timer-next-phase-btn')?.addEventListener('click', () => {
    const p = REHEARSAL_PRESETS[rehearsalTimer.presetId] || REHEARSAL_PRESETS.full;
    if (rehearsalTimer.activePhaseIdx < p.phases.length - 1) {
      rehearsalTimer.activePhaseIdx++;
      let pastMinutes = 0;
      for (let i = 0; i < rehearsalTimer.activePhaseIdx; i++) pastMinutes += p.phases[i].minutes;
      rehearsalTimer.secondsRemaining = Math.max(0, rehearsalTimer.totalSeconds - pastMinutes * 60);
      playTimerChime();
      updateTimerUI();
    }
  });

  $('#timer-reset-btn')?.addEventListener('click', () => {
    resetRehearsalTimer();
  });

  // Phase 4: Multi-Profile Bridal Run Sheet
  $('#bridal-profile-select')?.addEventListener('change', e => {
    state.activeBridalProfile = e.target.value;
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) {
      if (!state.bridal) state.bridal = {};
      Object.assign(state.bridal, prof.fields || {});
    }
    save();
    render();
  });

  $('#btn-new-bridal-profile')?.addEventListener('click', () => {
    const name = (typeof window !== 'undefined' && window.prompt)
      ? window.prompt('Enter client / practice name for the new bridal profile:')
      : 'New Bride';
    if (name && name.trim()) {
      const newId = 'prof_' + Date.now();
      if (!state.bridalProfiles) state.bridalProfiles = {};
      state.bridalProfiles[newId] = {
        id: newId,
        clientName: name.trim(),
        eventDate: '',
        ceremonyType: 'Traditional Engagement & Church Wedding',
        venueClimate: 'Outdoor Coastal Lawn & Air-Conditioned Hall',
        bridalPartyCount: 1,
        fields: {},
        schedule: [
          { time: '06:00', task: 'Bride scalp prep, clarifying toner, braided foundation & wig cap', done: false },
          { time: '07:00', task: 'Lace frontal alignment, adhesive melt & compression band', done: false },
          { time: '08:00', task: 'Thermal curl styling, bridal hairpiece anchor & veil pin lock', done: false },
          { time: '09:00', task: 'Final humidity spray shield & client handover with touch-up kit', done: false }
        ],
        contractChecklist: {
          trialCompleted: false,
          patchTestSigned: false,
          depositReceived: false,
          removerSupplied: false,
          touchupKitPacked: false
        }
      };
      state.activeBridalProfile = newId;
      state.bridal = { ...state.bridalProfiles[newId].fields };
      save();
      render();
      notify(`Created new bridal profile for ${name.trim()}.`);
    }
  });

  // Profile metadata fields
  $('#bride-client-name')?.addEventListener('input', e => {
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) { prof.clientName = e.target.value; save(); }
  });

  $('#bride-event-date')?.addEventListener('change', e => {
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) { prof.eventDate = e.target.value; save(); }
  });

  $('#bride-ceremony-type')?.addEventListener('input', e => {
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) { prof.ceremonyType = e.target.value; save(); }
  });

  $('#bride-venue-climate')?.addEventListener('input', e => {
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) { prof.venueClimate = e.target.value; save(); }
  });

  $('#bride-party-count')?.addEventListener('input', e => {
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) { prof.bridalPartyCount = parseInt(e.target.value, 10) || 1; save(); }
  });

  // Morning schedule table
  document.querySelectorAll('[data-schedule-idx]').forEach(el => {
    el.addEventListener('change', () => {
      const prof = state.bridalProfiles?.[state.activeBridalProfile];
      const idx = Number(el.dataset.scheduleIdx);
      if (prof?.schedule?.[idx]) {
        prof.schedule[idx].done = el.checked;
        save();
      }
    });
  });

  document.querySelectorAll('[data-schedule-time]').forEach(el => {
    el.addEventListener('input', () => {
      const prof = state.bridalProfiles?.[state.activeBridalProfile];
      const idx = Number(el.dataset.scheduleTime);
      if (prof?.schedule?.[idx]) {
        prof.schedule[idx].time = el.value;
        save();
      }
    });
  });

  document.querySelectorAll('[data-schedule-task]').forEach(el => {
    el.addEventListener('input', () => {
      const prof = state.bridalProfiles?.[state.activeBridalProfile];
      const idx = Number(el.dataset.scheduleTask);
      if (prof?.schedule?.[idx]) {
        prof.schedule[idx].task = el.value;
        save();
      }
    });
  });

  $('#btn-add-schedule-step')?.addEventListener('click', () => {
    const prof = state.bridalProfiles?.[state.activeBridalProfile];
    if (prof) {
      if (!prof.schedule) prof.schedule = [];
      prof.schedule.push({ time: '09:30', task: 'Additional styling or photography touch-up', done: false });
      save();
      render();
    }
  });

  // Contract verification checklist
  document.querySelectorAll('[data-contract]').forEach(el => {
    el.addEventListener('change', () => {
      const prof = state.bridalProfiles?.[state.activeBridalProfile];
      if (prof) {
        if (!prof.contractChecklist) prof.contractChecklist = {};
        prof.contractChecklist[el.dataset.contract] = el.checked;
        save();
      }
    });
  });

  // Technical styling specification fields (8 core fields)
  document.querySelectorAll('[data-bride]').forEach(el => {
    el.addEventListener('input', () => {
      const key = el.dataset.bride;
      state.bridal[key] = el.value;
      const prof = state.bridalProfiles?.[state.activeBridalProfile];
      if (prof) {
        if (!prof.fields) prof.fields = {};
        prof.fields[key] = el.value;
      }
      save();
      const savedNotice = $('#planner-saved');
      if (savedNotice) savedNotice.textContent = storageOK ? 'Saved in this browser.' : 'Saving unavailable. Back up progress before closing.';
    });
  });

  $('#print')?.addEventListener('click', () => window.print());
  $('#print-bottom')?.addEventListener('click', () => window.print());

  // Phase 4: Journal Filtering & Photo Management
  document.querySelectorAll('[data-journal-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      journalFilter = btn.dataset.journalFilter;
      render();
    });
  });

  $('#reset-journal-filter')?.addEventListener('click', () => {
    journalFilter = 'all';
    render();
  });

  document.querySelectorAll('[data-photo-upload]').forEach(input => {
    input.addEventListener('change', e => {
      const lessonId = input.dataset.photoUpload;
      const file = e.target.files?.[0];
      if (file) {
        compressAndStorePhoto(lessonId, file);
      }
    });
  });

  document.querySelectorAll('[data-view-photo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lessonId = btn.dataset.viewPhoto;
      if (state.photos?.[lessonId]) {
        openPhotoModal(state.photos[lessonId]);
      }
    });
  });

  document.querySelectorAll('[data-remove-photo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lessonId = btn.dataset.removePhoto;
      if (state.photos?.[lessonId]) {
        const ok = (typeof window !== 'undefined' && window.confirm)
          ? window.confirm('Remove practice photo for this lesson?')
          : true;
        if (ok) {
          delete state.photos[lessonId];
          evaluateBadges(state, { triggerCelebration: false });
          save();
          render();
          notify('Practice photo removed.');
        }
      }
    });
  });

  // Photo modal close button & backdrop dismissal
  $('#close-photo-modal')?.addEventListener('click', () => closePhotoModal());
  const photoModal = document.getElementById('photo-modal');
  if (photoModal && !photoModal._hasBackdropListener) {
    photoModal._hasBackdropListener = true;
    photoModal.addEventListener('click', e => {
      if (e.target === photoModal) closePhotoModal();
    });
    photoModal.addEventListener('cancel', () => {
      closePhotoModal();
    });
  }
}

// -------------------------------------------------------------
// BACKUP EXPORT & RESTORE IMPORT HANDLERS
// -------------------------------------------------------------

$('#backup')?.addEventListener('click', () => {
  const envelope = {
    app: 'Sandy Studio',
    version: 2,
    appVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    learnerId: state.activeLearnerId || DEFAULT_LEARNER_ID,
    hasPhotos: false,
    data: state
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sandy-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Progress backup downloaded. Keep it somewhere safe.');
});

$('#restore')?.addEventListener('click', () => $('#restore-file').click());

$('#restore-file')?.addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > MAX_IMPORT_BYTES) throw new Error('File is too large (maximum 10MB).');
    const text = await f.text();
    const incoming = JSON.parse(text);

    if (incoming.version === 1) {
      const validV1 = validateV1(incoming);
      const migrated = migrateV1toV2(validV1, state.activeLearnerId);
      state = mergeV2(state, migrated, { mode: 'restore-own' });
      save();
      render();
      notify('Legacy v1 backup migrated and merged. Existing notes were kept.');
    } else if (incoming.version === 2 || (incoming.data && incoming.version === 2)) {
      const validV2 = validateV2(incoming);
      state = mergeV2(state, validV2, { mode: 'restore-own' });
      save();
      render();
      notify('Backup merged. Existing notes were kept.');
    } else {
      throw new Error('Unrecognised backup version');
    }
  } catch (err) {
    console.error('Restore error:', err);
    notify('This is not a valid Sandy progress backup. Your current work is unchanged.');
  }
  e.target.value = '';
});

// Theme toggle in header
$('#theme-toggle')?.addEventListener('click', () => {
  const currentTheme = state.settings?.theme || 'system';
  const systemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && systemDark);
  const nextTheme = isDark ? 'light' : 'dark';

  state.settings.theme = nextTheme;
  applyTheme(nextTheme);
  save();
  notify(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} theme.`);
});

// System theme listener for automatic dark/light adjustments
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', () => {
        if (state.settings?.theme === 'system') {
          applyTheme('system');
        }
      });
    }
  } catch (e) {}
}

// Initial boot
addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
  $('#main')?.focus({ preventScroll: true });
});

applyTheme();
render();
if (!storageOK) notify('Saved progress could not be loaded. Keep regular backups.');
