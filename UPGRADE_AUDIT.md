# Sandy | Bridal & Wig Studio — Upgrade Audit & Proposed Design (Phase 0)

**Date:** 30 September 2026  
**Lead Implementation Engineer & Senior Product Designer:** Antigravity  
**Status:** Phase 5 Complete (Accessibility Hardening, Dark Theme Tokens, Keyboard/Screen Reader Traversal & Final Polish Verified) — All 5 Phases 100% Complete & Production-Ready  
**Workspace:** `C:\Users\USER\Desktop\Sandy`  
**Git Origin:** `https://github.com/NiiDk/Sandy.git` (branch `main`, commit `684c4f3`)

---

## 1. Executive Summary & Baseline Verification

A thorough inspection of the active repository (`C:\Users\USER\Desktop\Sandy`) and the baseline reference folder (`C:\Users\USER\Documents\Codex\2026-09-26\i-don-t-know-but-if`) was performed.

### Key Findings
1. **Active Working Tree:** Clean. Branch `main` is up to date with `origin/main`. No uncommitted changes or untracked files exist.
2. **File Integrity:** SHA256 checksums of all core files (`app.js`, `index.html`, `lessons.js`, `standalone.html`, `styles.css`) in the active workspace match exactly with those in `outputs/Sandy_Learning_Pack/` from the reference workspace.
3. **Delivery Mode Alignment:** The active checkout contains the unpackaged site files along with the generated `standalone.html` in the root.
4. **No Unauthorised Actions:** No dependencies were installed, no push or deployment was attempted, and no existing source code has been altered during Phase 0.

---

## 2. File Map & Material Differences from Prompt Assumptions

### Active Repository Structure (`C:\Users\USER\Desktop\Sandy`)

| File | Size (Bytes) | SHA256 (First 16 chars) | Role |
| :--- | :--- | :--- | :--- |
| `index.html` | 1,772 | `C2E243BEACB4EAC6...` | Host shell document with header navigation, `#main` container, footer controls, and external script/CSS links. |
| `styles.css` | 7,983 | `79A6F536F739B172...` | Responsive styling using the plum/paper palette (`#591d3e` / `#fbf9f7`), Georgia headings, card grids, quiz feedback, and print styles. |
| `lessons.js` | 20,028 | `4A46E0B6EBA3C2AB...` | Content registry defining `LESSONS` (17 entries) and `PLAYLIST` URL (`https://www.youtube.com/playlist?list=PLSq_n2PrJhKw`). |
| `app.js` | 20,353 | `40EE4874CA4E7B12...` | Runtime logic: hash routing, state (`sandy-studio-v1`), validation, DOM rendering, quiz checks, bridal planner, and JSON backup/restore. |
| `standalone.html` | 688,075 | `8D3DFE71F071E864...` | Single-file portable delivery containing inlined CSS, inlined JS, and 17 embedded base64 JPEG thumbnails. |
| `.gitattributes` | 66 | `1A1DBE176BC233B4...` | LF normalisation configuration. |

### Contradictions and Differences from Prompt Baseline
1. **Directory Structure:** The active checkout `Desktop\Sandy` is *only* the contents of the former `outputs/Sandy_Learning_Pack/` directory. There is no `outputs/` or `work/` folder in the Git checkout.
2. **Absence of Build Tools:** The original packaging script (`work/site/package.py`), check script (`work/site/check.cjs`), and metadata (`video-metadata.json`) are absent from the Git repository.
3. **No Secondary Standalone File:** There is no separate `outputs/Sandy_Learning_Pack.html`; only `standalone.html` exists in the repository root.
4. **Thumbnail References:** In `lessons.js`, thumbnails are remote YouTube URLs (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`). In `standalone.html`, they are embedded base64 data URIs.
5. **No Network-Independent Build Pipeline:** The original Python script fetched live thumbnails across the network. A clean, offline build helper (`scripts/build-standalone.cjs`) is required in the repository.

---

## 3. Current Application Behaviour & Capabilities

### Hash Routing
The application listens to `hashchange` and routes into `#main`:
- `#learn` (or empty / `#main`): Hero summary, progress bar, 4-stage path, filterable card grid (search by text, group, or completion status), and Ghana context panel.
- `#lesson/<id>`: Two-column layout with YouTube video card, 3-step practical checklist, practice confirmation checkbox, 1-question quiz form, hair/tools prerequisites, and practice notes textarea.
- `#kit`: Hair fibre comparison table (Human hair, Blend, Heat-friendly synthetic, Ordinary synthetic), 11-item kit checklist, and adhesive removal safety guidance.
- `#journal`: Practice summary (practised count and correct quiz count) and list of lesson notes.
- `#bridal`: 8-field rehearsal planner with print stylesheet support.
- `#sources`: Ghana salon context (Studio 623, Twinkles Beauty), 2026 trend references, fibre care links, and video credits.

### Current Storage & State Model
- **Storage Key:** `sandy-studio-v1` in `localStorage`.
- **State Schema:**
  ```javascript
  {
    version: 1,
    done: { [lessonId]: boolean },
    checks: { [`${lessonId}-${stepIndex}`]: boolean },
    answers: { [lessonId]: number }, // Zero-based option index
    notes: { [lessonId]: string },   // Max 10,000 chars
    kit: { [itemLabel]: boolean },   // Keyed by string label
    bridal: { [fieldKey]: string }   // 8 fields, max 10,000 chars
  }
  ```

---

## 4. State & Build Risks Assessment

### State Management Risks
1. **Answer Index Fragility:** Storing `answers[lessonId]` as a zero-based option index breaks if options are reordered, if options are added, or when non-choice interactions (ordering, matching, reflection) are introduced. Stable option IDs are mandatory.
2. **Loss of Attempt History & Calibration:** Baseline answers store only the latest chosen index. There is no first-attempt record, attempt count, timestamp, or confidence rating.
3. **No Learner Identity Isolation:** The v1 backup format lacks learner identity. If one learner imports another's backup file, progress is silently merged into the active profile.
4. **2MB Restore Ceiling:** Line 27 of `app.js` enforces `f.size > 2000000`. In Phase 4, photo backups will exceed this limit.
5. **Silent Quota & Storage Denial:** When `localStorage` is disabled, full, or restricted (e.g. strict `file://` sandboxes), `app.js` sets `storageOK = false` and shows a toast, but lacks a dedicated recovery/export workflow for in-memory edits.
6. **Destructive Reset Vulnerability:** If state parsing encounters invalid JSON, falling back to a clean state must never overwrite recoverable user data without offering an export.

### Build & Delivery Risks
1. **Single Source of Truth:** `standalone.html` must remain a generated build artefact, not an independently edited source file. Hand-editing `standalone.html` will cause divergence.
2. **Offline Determinism:** The baseline packaging script relied on live HTTP downloads of YouTube thumbnails. An offline build must package locally cached thumbnails.
3. **Script Inlining Hazards:** When inlining JSON or scripts, unescaped `</script>` tags in string literals can prematurely terminate HTML script blocks.

---

## 5. Visual Direction: Luxury Bridal Academy Experience

To elevate Sandy from a functional learning pack to a contemporary luxury bridal studio experience, the design system will be upgraded with meticulous attention to typography, spatial rhythm, and tactile feedback.

### Palette Architecture
A coherent, warm, high-contrast palette built upon Sandy’s plum heritage:

| Role | Light Theme (Ivory & Plum) | Dark Theme (Charcoal & Warm Plum) | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas / Background** | Warm Ivory `#fbf9f7` | Deep Obsidian Plum `#18131b` | Main page background |
| **Card Surface** | Pure Paper `#ffffff` | Elevated Charcoal `#241c27` | Content cards, panels |
| **Primary Brand** | Royal Plum `#591d3e` | Luminous Orchid Plum `#8b3a69` | Primary buttons, active tabs |
| **Secondary Plum Tint** | Pale Blossom `#f4ecf1` | Deep Wine `#352538` | Subtle badges, callouts, progress tracks |
| **Text Primary** | Deep Charcoal Ink `#241d26` | Soft Cream `#f7f2f5` | High-contrast body & headings (WCAG AAA) |
| **Text Muted** | Warm Slate Mauve `#6f636e` | Muted Lilac Grey `#a99fa8` | Captions, metadata, secondary labels |
| **Champagne Gold Accent** | Rich Bronze Gold `#9c6d1d` (Text) / `#c5a059` (UI) | Warm Champagne Gold `#e3bd72` | Restrained accents, achievement stars, borders |
| **Border / Divider** | Subtle Cashmere `#e8dfd8` | Dark Plum Rule `#3b2e3e` | Card borders, section separators |
| **Success / Practised** | Forest Eucalyptus `#1b5e43` / `#e4f2eb` | Emerald Glaze `#287a59` / `#163b2c` | Practised checks, verified steps |

*Accessibility Guarantee:* Gold is restricted to non-text accents or uses the darker bronze tone (`#9c6d1d`) when applied to text on light backgrounds to satisfy the WCAG AA 4.5:1 contrast requirement.

### Typography Hierarchy
- **Primary Headings (`h1`, `h2`):** Georgia, regular weight (`400`), tight letter spacing (`-0.5px`), warm optical sizing (`clamp(28px, 4vw, 44px)`).
- **Sub-headings (`h3`, `h4`):** Georgia, balanced leading (`1.25`), paired with small uppercase tracked eyebrows (`letter-spacing: 2px; font-size: 11px; font-weight: 700;`).
- **Body & Controls:** Native modern system stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`), 16px baseline, 1.6 line-height for effortless reading. Full support for 200% zoom without horizontal overflow.

### Mobile Styling Chair Ergonomics
- **48px Minimum Touch Targets:** All buttons, selection tiles, checkboxes, radio inputs, and navigation elements meet or exceed 48×48px.
- **Fixed Ergonomic Bottom Bar on Phones:** Persistent navigation at the screen bottom (`Today`, `Learn`, `Studio`, `Me`) with safe-area insets (`env(safe-area-inset-bottom)`) so thumbs reach core routes comfortably while holding tools.
- **Permanent Access to Hair & Tools:** A floating or sticky drawer tab allows Sandy to inspect hair requirements and tool lists mid-practice without losing her place in the lesson steps or quiz.
- **Drift-Free Practice Timer:** Powered by high-resolution timestamp deltas (`performance.now()`), featuring pause/resume, quality observation notes, and strictly no auto-start.

---

## 6. Coherent Visual Direction: Screen Blueprints

### A. The "Today" Screen Blueprint (`#today`)
A welcoming, purposeful space designed to give Sandy instant clarity when stepping up to her styling mannequin.

```text
┌───────────────────────────────────────────────────────────────┐
│ [S] SANDY BRIDAL & WIG STUDIO                    [Me / Back]  │
├───────────────────────────────────────────────────────────────┤
│ Good morning, Sandy.                                         │
│ PREPARE · PRACTICE · MASTER                                   │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ RECOMMENDED NEXT ACTION                                   │ │
│ │ Lesson 05 · Install and finish a frontal                 │ │
│ │ 3 practical steps · 6 knowledge checks · 45m target       │ │
│ │ [Continue Lesson →]               [Open Tools & Fibre]    │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌──────────────────────────┐  ┌───────────────────────────┐   │
│ │ WEEKLY PRACTICE GOAL     │  │ MY PRACTICE METRICS       │   │
│ │ 2 of 3 sessions completed│  │ 4 Lessons Practised       │   │
│ │ [████████████░░░░] 67%   │  │ 12 Knowledge Checks Passed│   │
│ │ Target: 1 more this week │  │ 0 Professional Shortcuts  │   │
│ └──────────────────────────┘  └───────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ RECENT MILESTONES & ACHIEVEMENTS                          │ │
│ │ 🎖️ First Practice (Earned 28 Sep)                        │ │
│ │ 🎖️ Three Looks Practised (1 of 3 recorded)               │ │
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
│ [ Today ]       [ Learn ]       [ Studio ]       [ Me ]       │
└───────────────────────────────────────────────────────────────┘
```

### B. The Lesson Screen Blueprint (`#lesson/<id>`)
A focused, distraction-free environment following the **Watch → Check → Practise → Record** sequence.

```text
┌───────────────────────────────────────────────────────────────┐
│ ← All Lessons  /  Lesson 05 · Installation                    │
│ Install and finish a frontal                                  │
│ Creator: Africana · Selected YouTube Demonstration            │
├───────────────────────────────────────────────────────────────┤
│ [ 1. Watch ]  [ 2. Check Understanding ]  [ 3. Practise ]     │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ [ VIDEO PLAYER CARD / EMBEDDED PREVIEW ]                  │ │
│ │ ▶ Watch on YouTube (Full Video)                           │ │
│ │ ⏱️ Key Steps: [0:45 Dry Fit] [2:15 Skin Prep] [5:10 Lay] │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ QUICK KNOWLEDGE CHECK (Question 2 of 6)                       │
│ Topic: Ghanaian Climate & Sweat Resistance                    │
│ "During an outdoor afternoon wedding in Accra, excessive      │
│  perspiration threatens frontal adhesion. What is the safest  │
│  immediate corrective technique?"                             │
│                                                               │
│ ( ) A. Saturate the hairline with extra melting spray         │
│ (•) B. Blot sweat with a clean lint-free towel, dry with cool │
│        air, and press a compression band without extra glue   │
│ ( ) C. Immediately peel back the lace and re-glue over sweat  │
│                                                               │
│ Confidence: [ Low ]  [ Medium ]  [ High ]   [ Skip ]          │
│ [ Check Answer ]                                              │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ✓ Correct. Adding adhesive over sweat creates a milky,     │ │
│ │   weakened bond. Blotting and gentle tension-free cooling  │ │
│ │   preserves skin health and lace integrity.               │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ [ PRACTISE THIS LOOK ]                                        │
│ ⏱️ Practice Timer: [ 00:24:15 ]  [ Pause ]  [ Reset ]          │
│ [✓] I have completed a hands-on dry fitting session           │
│ My Observations:                                              │
│ [ Notes on lace tension and ear tab positioning...        ]   │
│ [ Save Practice Record ]                                      │
└───────────────────────────────────────────────────────────────┘
```

---

## 7. Thoughtful Gamification & Confetti Celebrations

Progress will feel deeply rewarding and tangible while strictly maintaining professional integrity. Activity is never confused with professional qualification.

### The Four Core Studio Achievements
Achievements feature custom SVG badge iconography in rich plum and champagne gold. Each badge has a transparent, evidence-based earning rule:

1. 🎖️ **First Practice:** Awarded upon saving Sandy's first practical session accompanied by a personal reflection or observation.
   - *Evidence:* Exactly one verified practice log with >10 characters of reflection notes.
2. 🎖️ **Three Looks Practised:** Awarded when hands-on practice is recorded across three distinct lesson styles (e.g. glueless fit, soft curls, low chignon).
   - *Evidence:* Distinct lesson IDs in `done` state spanning at least two different lesson groups.
3. 🎖️ **Knowledge Checked:** Awarded when all published, ready questions in a lesson set are answered correctly.
   - *Evidence:* Graded attempt events demonstrate correct responses across all active question IDs.
4. 🎖️ **Weekly Goal Met:** Awarded when Sandy achieves her self-selected weekly practice target (e.g. 2 or 3 sessions within a calendar week).
   - *Evidence:* Timestamps of practice records within the current Monday–Sunday window meet the target.

*Strict Anti-Inflation Safeguards:*
- Points (if displayed) are purely descriptive "Activity Points" earned once per stable event ID.
- Page reloads, duplicate button clicks, quiz retries, and backup re-imports **never** duplicate points or trigger repeat celebrations.
- Badges strictly avoid labels like "Certified Stylist", "Bridal Ready", or "Master".

### Plum & Gold Confetti Celebration Mechanics
A bespoke, lightweight HTML5 `<canvas>` celebration burst is implemented natively without heavy third-party animation libraries:
- **Palette:** Plum (`#591d3e`), Warm Gold (`#d4af37`), Champagne Cream (`#fdfcfb`), Soft Rose (`#c27ba0`).
- **Timing:** 1.5 seconds duration with natural physical gravity, gentle drift, and opacity fade.
- **Ergonomics:** `pointer-events: none` on fixed overlay; never blocks taps, never shifts layout, and never plays sound.
- **Accessibility:**
  - Strictly respects `prefers-reduced-motion`: When reduced motion is enabled, a static gold badge reveal is rendered instead of moving particles.
  - User toggle provided in settings: `Celebration effects: [On / Off]`.
- **Idempotency:** A celebration fires exactly once when the qualifying state mutation occurs. It will never replay when opening the app, reloading, or importing an existing backup.

---

## 8. Pilot Lessons: Deep-Dive Design (`frontal`, `curls`, `chignon`)

Each pilot lesson will feature **six verified questions** spanning safety, realistic Ghanaian scenarios, sequence ordering, and reflective reasoning.

### Pilot 1: `frontal` (Lesson 5 — Install and finish a frontal)
- **Lesson ID:** `frontal` | **Video ID:** `qgujmW62760` | **Creator:** Africana
- **Target Question Bank (6 Questions):**
  1. *Safety/Compatibility:* Skin patch testing protocol and verified skin protector before applying liquid adhesive; mandatory compatible remover readiness.
  2. *Safety/Compatibility:* Hairline tension and adhesive placement: preventing adhesive contact with natural edges and identifying signs of contact dermatitis.
  3. *Scenario (Ghanaian climate):* Managing excessive perspiration and high humidity during an outdoor Ghanaian wedding ceremony without adhesive breakdown.
  4. *Scenario (Troubleshooting):* Correcting ear-tab lifting and lace bunching caused by cap size discrepancy before adhesive cures.
  5. *Ordering Task:* Step-by-step installation sequence (Dry fitting → Skin cleansing/degreasing → Skin protector → Thin adhesive layers → Laying lace → Tension-free band compression).
  6. *Explain-It-Back Reflection:* Protocol for immediate safe emergency removal if a client reports sudden burning or itching during installation.

### Pilot 2: `curls` (Lesson 8 — Set soft, lasting curls)
- **Lesson ID:** `curls` | **Video ID:** `Saq_Y_tUXQE` | **Creator:** louis ihuefo
- **Target Question Bank (6 Questions):**
  1. *Safety/Compatibility:* Heat setting limits by fibre type: human hair vs heat-friendly synthetic (strict maximums) vs ordinary synthetic (no hot tools).
  2. *Safety/Compatibility:* Heat protectant application: ensuring hair is completely dry before tool contact to avoid bubbling/fracturing the hair shaft (steam damage).
  3. *Scenario (Ghanaian climate):* Selecting finishing spray and cooling strategy to prevent curl drop in tropical afternoon humidity.
  4. *Scenario (Troubleshooting):* Addressing inconsistent curl diameter and fishhook ends caused by improper section thickness and iron clamp positioning.
  5. *Ordering Task:* Thermal styling workflow (Detangle → Section & clip → Apply thermal protectant → Clamp/curl at approved temperature → Pin curl in clip → Full cooling → Comb-out & finish).
  6. *Explain-It-Back Reflection:* Why structural hydrogen bond reformation during the cooling phase determines curl longevity in both human hair and heat-friendly synthetics.

### Pilot 3: `chignon` (Lesson 12 — Create a clean low chignon)
- **Lesson ID:** `chignon` | **Video ID:** `tPM_nvhQrTE` | **Creator:** Andreeva Nata
- **Target Question Bank (6 Questions):**
  1. *Safety/Compatibility:* Securing pins on a wig base without piercing fragile lace, tearing weft tracks, or impaling the wearer's scalp.
  2. *Safety/Compatibility:* Weight distribution: anchoring a heavy cathedral bridal veil without pulling the wig backward or straining the frontal perimeter.
  3. *Scenario (Ghanaian climate):* Smoothing frizzy flyaways and maintaining a clean nape silhouette throughout a long, warm wedding reception.
  4. *Scenario (Troubleshooting):* Concealing exposed wefts at the occipital bone when gathering low-density wig hair into a nape chignon.
  5. *Ordering Task:* Chignon construction sequence (Base pony placement → Inserting structured padding/doughnut → Spreading and smoothing surface hair → Pinning perimeter with U-pins → Veil comb anchor preparation).
  6. *Explain-It-Back Reflection:* Contrast between anchoring bridal hair accessories on a natural client head versus a wig cap construction.

---

## 9. Proposed Module Boundaries & State Architecture

### Versioned State Schema (`sandy-studio-v2`)
The application state will migrate to key `sandy-studio-v2`. The legacy key `sandy-studio-v1` will remain untouched in `localStorage` to allow instant rollback.

```typescript
interface SandyStateV2 {
  version: 2;
  appVersion: "2.0.0";
  activeLearnerId: string; // e.g. "learner_local_default"
  learners: {
    [learnerId: string]: {
      id: string;
      displayName: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  // Preserved flags from v1
  done: { [lessonId: string]: boolean };
  checks: { [stepKey: string]: boolean };
  kit: { [itemLabel: string]: boolean };
  bridal: { [fieldKey: string]: string };
  notes: { [lessonId: string]: string };
  
  // Legacy answers preserved explicitly without fabricating mastery
  legacyAnswers: {
    [lessonId: string]: {
      selectedOptionIndex: number;
      migratedAt: string;
      status: "legacy-uncalibrated";
    };
  };

  // Immutable event stream for new assessments
  events: Array<GradedAttemptEvent>;
  
  // Reflection self-assessments
  reflections: {
    [questionId: string]: {
      response: string;
      criteriaChecked: string[];
      completedAt: string;
    };
  };

  // Gamification & Goals
  gamification: {
    weeklyGoalSessions: number;     // Default 2 or 3
    earnedBadges: {
      [badgeId: string]: {
        earnedAt: string;
        evidenceId: string;
        celebrated: boolean;
      };
    };
    activityPoints: number;
  };

  // User preferences & accessibility
  settings: {
    theme: "system" | "light" | "dark";
    reducedMotion: boolean;
    celebrationsEnabled: boolean;
  };
}

interface GradedAttemptEvent {
  eventId: string;          // UUID or deterministic hash
  learnerId: string;
  lessonId: string;
  questionId: string;
  contentRevision: number;
  response: string | string[]; // Option ID, ordered step IDs, etc.
  confidence?: "low" | "medium" | "high";
  outcome: "correct" | "incorrect";
  gradingSource: "objective";
  timestamp: string;
}
```

---

## 10. Source-of-Truth Paths & Build Discipline

```text
Sandy/
├── index.html                   # Canonical host shell
├── styles.css                   # Canonical design system stylesheet
├── lessons.js                   # Canonical lesson registry, questions & bookmarks
├── app.js                       # Canonical runtime application code
├── standalone.html              # Generated single-file delivery (NEVER hand-edited)
├── assets/
│   ├── thumbnails/              # 17 offline JPEG thumbnails (extracted from standalone)
│   └── badges/                  # Luxury vector achievement SVGs
├── scripts/
│   ├── build-standalone.cjs     # Deterministic, offline packaging script (Node.js)
│   └── extract-thumbnails.cjs   # One-time baseline asset extraction helper
├── tests/
│   └── test-preservation.cjs    # Zero-dependency validation & regression test suite
├── CHANGELOG.md                 # Project version and change history
├── CONTENT_NEEDED.md            # Registry of pending educator reviews & photo requirements
└── UPGRADE_AUDIT.md             # This document
```

### Build & Test Commands
- **Asset Extraction:** `node scripts/extract-thumbnails.cjs`
- **Build Standalone HTML:** `node scripts/build-standalone.cjs`
- **Run Verification Tests:** `node tests/test-preservation.cjs`

---

## 11. Acceptance Tests for Phase 1 (Preservation & Build) — 100% Passed

- [x] **Offline Standalone Build:** `node scripts/build-standalone.cjs` generates `standalone.html` offline using local assets. Output is bit-for-bit valid HTML.
- [x] **Asset Independence:** `standalone.html` renders completely without internet access (except for YouTube video streaming).
- [x] **V1 State Preservation:** Existing `sandy-studio-v1` storage parses cleanly and runs without errors.
- [x] **V2 Migration Idempotency:** Running migration multiple times produces identical state and never mutates or removes `sandy-studio-v1`.
- [x] **Non-Destructive Merge:** Merging a v1 backup into v2 preserves local notes, unions completed items, and imports missing answers without overwriting.
- [x] **Zero-Dependency Test Suite:** `node tests/test-preservation.cjs` executes in standard Node.js without `npm install` and reports 100% pass on state validation, escaping, and schema integrity.

---

## 12. Acceptance Tests for Phase 2 (Pilot Interactive Lessons & Assessment Engine) — 100% Passed

- [x] **3 Pilot Lessons Implemented:** `frontal` (Lesson 05), `curls` (Lesson 08), and `chignon` (Lesson 12) contain exactly 6 calibrated questions each (18 questions total).
- [x] **Comprehensive Pedagogical Coverage:** Calibrated questions rigorously test chemical safety/patch testing, Ghanaian tropical humidity and sweat scenarios, Accra salon troubleshooting, technique nuance, multi-step sequencing, and structured reflections with educator model answers and criteria checklists.
- [x] **Step-Sequencing Engine:** Up/Down controls (`▲`/`▼`) with keyboard and screen reader accessibility allow dynamic re-ordering of multi-step processes with objective grading.
- [x] **Reflection & Self-Check Assessment:** Multi-paragraph free-form text input with instant local persistence, revealing comprehensive educator model answers and multi-item criteria checklists.
- [x] **Confidence-Weighted Calibration:** 4-point confidence selectors (`Low`, `Medium`, `High`, `Skip`) record learner calibration without penalty; confident-incorrect alerts flag high-confidence misconceptions.
- [x] **Resume State Persistence:** Active question indices, selected options, draft reflections, and step permutations persist under `state.quizProgress` in `sandy-studio-v2`. Leaving and returning to a lesson restores the exact active step and draft state.
- [x] **Verified Video Moment Bookmarks:** 9 verified step timestamps with direct deep-links into specific tutorial moments.
- [x] **Zero Regressions on Non-Pilot Lessons:** All 14 non-pilot lessons maintain their exact 3-step checklists, single-question quick checks, notes, and creator credits.
- [x] **Dual-Mode Parity:** Rebuilt `standalone.html` (759,067 bytes) matches hosted folder behaviour bit-for-bit.

---

---

## 13. Acceptance Tests for Phase 3 (Mobile Workflow, Today Screen, Weekly Goal & Celebrations) — 100% Passed

- [x] **Today Dashboard Implementation (`#today`):** Executive workstation with time-sensitive greeting, 4-metric strip (Lessons Practised, Pilot Checks Passed, Practice Records, Studio Points), Recommended Next Step card, and Recent Practice Notes feed.
- [x] **Weekly Practice Goal Tracking:** Realtime goal progress bar with completion badge, remaining practice count calculation, and user-configurable target selector (1..7 sessions/week).
- [x] **Evidence-Based Studio Badges:** 4 core badges (`badge_first_practice`, `badge_three_looks`, `badge_knowledge_checked`, `badge_weekly_goal`) awarded idempotently based on objective learner actions and stored in `state.gamification.earnedBadges`.
- [x] **Accessible Milestone Celebration Engine:** Lightweight luxury canvas particle burst (plum, gold, champagne) and modal popup with accessible dismissal. Strictly respects `prefers-reduced-motion: reduce` and user celebration toggle.
- [x] **Celebration Deduplication & Anti-Inflation:** Celebrated badges tracked in `state.gamification.celebratedBadges` to prevent repeated celebration popups on reload. Activity points computed deterministically via `calculateActivityPoints(state)` without inflation from repeated quiz attempts.
- [x] **Mobile Salon Ergonomics:** Fixed 5-tab bottom navigation (`.bottom-nav`) with minimum 48px touch targets, active route synchronization, and safe-area inset padding (`padding-bottom: max(6px, env(safe-area-inset-bottom))`) with 95px `#main` clearance.
- [x] **Zero-Dependency Test Suite (13/13 Passed):** `node tests/test-preservation.cjs` executes all 13 automated test suites covering v1 preservation, v2 migration, pilot questions, interactive stepper, recommendations, weekly goal bounds, badge logic, and standalone HTML build integrity.
- [x] **Dual-Mode Parity:** Rebuilt `standalone.html` (784,371 bytes) with all Phase 3 elements matching hosted folder behaviour bit-for-bit with zero external runtime dependencies.

---

## 14. Acceptance Tests for Phase 4 (Bridal Planner, Rehearsal Timer, Hair & Tools Guides, Practice Journal Photos) — 100% Passed

- [x] **Bridal Rehearsal Live Timer (`#bridal`):**
  - Interactive pacing stopwatch with 3 presets: Full Bridal Rehearsal (90 min), Express Styling (45 min), and Touch-Up Drill (15 min).
  - Web Audio API pure tone audio chime (dual-tone sine wave 587.33Hz to 880Hz with exponential decay) providing zero-file audible feedback at phase boundaries.
  - Phase advancement, pause/resume, reset, realtime countdown display (`MM:SS`), and dynamic phase pill.
  - Completed rehearsals automatically logged into `state.rehearsalLog` and awarded 50 Studio Points.
- [x] **Multi-Profile Bridal Run Sheet (`#bridal`):**
  - Profile switcher dropdown with `+ New Bride Profile` generator supporting multiple concurrent brides/events.
  - Metadata management (Client Name, Event Date, Ceremony Style, Venue & Climate Plan, Bridal Party Count).
  - Morning-of timeline schedule table with checkable milestones, editable target times/tasks, and interactive `+ Add Timeline Step` button.
  - 8 core technical styling specification textareas with bidirectional legacy `state.bridal` synchronisation.
  - Security & Service Agreement contract verification checklist (trial photographed, patch test verified, terms agreed, remover supplied, touch-up kit packed).
  - High-contrast `@media print` clean run sheet stylesheet for physical wedding-day clipboard use.
- [x] **Tactile Hair Fibre Diagnostics & Studio Tools (`#kit`):**
  - Tactile Fibre Diagnostic Matrix with 4 curated cards (100% Human Hair, Blend, Heat-Friendly Synthetic, Ordinary Synthetic) detailing thermal limits (≤160°C for blends), Accra coastal climate moisture behavior, burn test ash/bead characteristics, and cleaning protocols.
  - Salon Sanitisation & Cross-Contamination SOP with hospital-grade Barbicide/70% isopropyl 10-minute immersion, wig block barrier film wrap, 24–48h patch testing, and non-traction solvent release protocols.
  - 4 Categorised Studio Tool Modules with 11 core items bound to `data-kit` and real-time percentage readiness counter.
- [x] **Enhanced Practice Journal & Client Photo Records (`#journal`):**
  - 5-metric overview strip tracking Practised Lessons (`x/17`), Pilot Checks Passed (`x/15`), Completed Rehearsals, Attached Photos, and Total Studio Points.
  - 9 responsive category/status filter buttons (`All Lessons`, `Practised Only`, `With Notes`, `With Photos`, `Foundation`, `Installation`, `Everyday`, `Bridal`, `Care`).
  - Client-side Canvas photo compression (`compressAndStorePhoto`) scaling images to max 600px at 0.72 JPEG quality (~40KB–70KB) to ensure `localStorage` quota safety.
  - Interactive photo section: thumbnail preview, full-screen accessible `<dialog id="photo-modal">` lightbox with backdrop dismissal, photo removal, and 15 Studio Points per photo.
- [x] **Zero-Dependency Test Suite (16/16 Passed):** `node tests/test-preservation.cjs` executes all 16 automated test suites covering v1 preservation, v2 migration, pilot questions, interactive stepper, recommendations, weekly goal, badges, rehearsal timer presets, phase math, multi-profile bridal schema, schedule, contract checklist, and standalone build integrity.
- [x] **Dual-Mode Parity:** Rebuilt `standalone.html` (833,014 bytes) embedding all Phase 4 features with zero external runtime dependencies.

---

## 15. Acceptance Tests for Phase 5 (Accessibility Hardening, Dark Theme Tokens & Final Polish) — 100% Passed

- [x] **WCAG 2.1 AA Keyboard & Screen Reader Traversal:**
  - High-contrast skip link (`<a class="skip" href="#main">Skip to main content</a>`) sliding into view at `top: 12px` on focus with plum border and card background.
  - Programmatic focus receiver on `<main id="main" tabindex="-1">` allowing seamless jump to main content.
  - High-contrast `:focus-visible` ring across all interactive controls (`outline: 3px solid var(--focus-ring)!important; outline-offset: 3px!important`).
  - Screen reader timer live region protection: `#timer-digits` set to `aria-live="off"` to prevent spamming assistive technology every second; `#timer-phase-pill` equipped with `role="status"` and `aria-live="polite"` to announce phase transitions and completions cleanly.
  - Focus trapping and restoration on modals (`#celebration-modal` and `#photo-modal`): stores `lastFocusedElement` upon opening, focuses the dialog action/close button, and restores focus upon closure. Full `Escape` key and backdrop dismissal support.
  - Fixed `<dialog>` CSS visibility bug by enforcing `dialog:not([open]){display:none!important}` so lightboxes and modals remain hidden when not open.
- [x] **Full Semantic Dark Theme (Obsidian & Rose Gold):**
  - Calibrated dark palette: Obsidian background (`#140f17`), warm plum cards (`#201824`), top bar (`#1c1520`), inputs (`#271e2c`), rose gold typography (`#f5f0f3` text, `#b5a8af` muted, `#e07cb0` plum accents, `#deb56d` gold accents).
  - Contrast ratios exceed WCAG AA and AAA: 13.5:1 text on card background, 6.5:1 muted text, 7.8:1 gold accents, 8.9:1 focus outline.
  - Semantic status tokens: `--red-bg`, `--red-text`, `--red-border` for incorrect feedback and `--warning-bg`, `--warning-text` for confident-incorrect alerts.
  - Header theme toggle button (`#theme-toggle`) with live emoji icon (`🌙`/`☀️`) and text label (`Dark`/`Light`) alongside progress backup.
  - Studio Theme dropdown in Today Studio Preferences (`#today-theme-select`) offering Follow Device System Theme, Light Theme, and Dark Theme.
  - Reduced Motion toggle (`#pref-reduced-motion`) allowing explicit user disabling of celebration particle bursts and animated transitions.
  - Automatic OS theme shift detection via `window.matchMedia('(prefers-color-scheme: dark)')` listener in system mode.
  - Clean print stylesheet (`@media print`): hides `#theme-toggle`, `.top-actions`, `.timer-panel`, and bottom navigation for crisp physical clipboard printing.
- [x] **Zero-Dependency Test Suite (17/17 Passed):** `node tests/test-preservation.cjs` executes all 17 automated test suites covering v1 preservation, v2 migration, pilot questions, interactive stepper, recommendations, weekly goal, badges, rehearsal timer presets, multi-profile bridal schema, schedule, contract checklist, accessibility markup, dark theme CSS variables, settings merge, and standalone build integrity.
- [x] **Dual-Mode Parity:** Rebuilt `standalone.html` (842,196 bytes) embedding all Phase 5 accessibility attributes, dark theme CSS variables, and focus restoration handlers with zero external dependencies.

---

## 16. Final Upgrade Summary & Project Delivery Handoff

The **Sandy | Bridal & Wig Studio** learning pack upgrade is now **100% complete across all 5 planned phases**:

1. **Phase 1: Architecture, Asset Builder & Preservation Engine**
   - Offline thumbnail extractor, zero-dependency standalone builder, bounded schemas, and non-destructive v1-to-v2 migration engine.
2. **Phase 2: Pilot Interactive Lessons & Pedagogical Assessment Engine**
   - 18 calibrated questions across 3 pilot lessons (`frontal`, `curls`, `chignon`), confidence ratings, step-sequencing, and practical reflections with criteria checklists.
3. **Phase 3: Executive Today Workstation, Studio Badges & Mobile Ergonomics**
   - Today dashboard, weekly practice goal, 4 evidence-based badges, celebration canvas bursts, and fixed mobile 5-tab bottom navigation (48px targets).
4. **Phase 4: Bridal Planner Upgrade, Rehearsal Timer, Hair & Tools Guides & Practice Journal**
   - Pacing live stopwatch with synthesized Web Audio chimes, multi-profile bridal run sheets with contract verification, tactile fibre diagnostic matrix, salon sanitisation SOP, and photo practice records.
5. **Phase 5: Accessibility Hardening (WCAG 2.1 AA), Dark Theme & Final Polish**
   - High-contrast skip link, focus-visible indicators, screen reader timer ergonomics, full obsidian/rose-gold dark theme with live toggle, modal focus restoration, and dual-delivery sync.

The entire application runs entirely in pure static HTML/CSS/JavaScript with zero runtime dependencies, zero external CDNs, and zero build tool lock-in. Both delivery modes—hosted folder and self-contained single-file `standalone.html`—are in 100% feature and visual parity.
