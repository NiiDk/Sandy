# Sandy | Bridal & Wig Studio — Changelog

All notable changes to this project will be documented in this file.
This project adheres to Semantic Versioning and British English documentation standards.

---

## [Phase 5] - 2026-09-30

### Added (Phase 5 - Accessibility Hardening, Dark Theme Tokens & Final Polish)
- **WCAG 2.1 AA Keyboard & Screen Reader Traversal:**
  - High-contrast skip link (`<a class="skip" href="#main">Skip to main content</a>`) sliding into view at `top: 12px` on focus with plum border and card background.
  - Programmatic focus receiver on `<main id="main" tabindex="-1">` allowing seamless jump to main content.
  - High-contrast `:focus-visible` ring across all interactive controls (`outline: 3px solid var(--focus-ring)!important; outline-offset: 3px!important`).
  - Screen reader timer live region protection: `#timer-digits` set to `aria-live="off"` to prevent spamming assistive technology every second; `#timer-phase-pill` equipped with `role="status"` and `aria-live="polite"` to announce phase transitions and completions cleanly.
  - Focus trapping and restoration on modals (`#celebration-modal` and `#photo-modal`): stores `lastFocusedElement` upon opening, focuses the dialog action/close button, and restores focus upon closure. Full `Escape` key and backdrop dismissal support.
  - Fixed `<dialog>` CSS visibility bug by enforcing `dialog:not([open]){display:none!important}` so lightboxes and modals remain hidden when not open.
- **Full Semantic Dark Theme (Obsidian & Rose Gold):**
  - Calibrated dark palette: Obsidian background (`#140f17`), warm plum cards (`#201824`), top bar (`#1c1520`), inputs (`#271e2c`), rose gold typography (`#f5f0f3` text, `#b5a8af` muted, `#e07cb0` plum accents, `#deb56d` gold accents).
  - Contrast ratios exceed WCAG AA and AAA: 13.5:1 text on card background, 6.5:1 muted text, 7.8:1 gold accents, 8.9:1 focus outline.
  - Semantic status tokens: `--red-bg`, `--red-text`, `--red-border` for incorrect feedback and `--warning-bg`, `--warning-text` for confident-incorrect alerts.
  - Header theme toggle button (`#theme-toggle`) with live emoji icon (`🌙`/`☀️`) and text label (`Dark`/`Light`) alongside progress backup.
  - Studio Theme dropdown in Today Studio Preferences (`#today-theme-select`) offering Follow Device System Theme, Light Theme, and Dark Theme.
  - Reduced Motion toggle (`#pref-reduced-motion`) allowing explicit user disabling of celebration particle bursts and animated transitions.
  - Automatic OS theme shift detection via `window.matchMedia('(prefers-color-scheme: dark)')` listener in system mode.
  - Clean print stylesheet (`@media print`): hides `#theme-toggle`, `.top-actions`, `.timer-panel`, and bottom navigation for crisp physical clipboard printing.
- **Automated Test Suite Expansion (`tests/test-preservation.cjs`):**
  - Added PASS 17: Validates skip link, `:focus-visible` CSS rules, timer ARIA live regions, dark theme tokens and contrast ratios, absence of duplicate `:root` rules, theme toggle elements, Studio Preferences select options, schema validation and non-destructive merge of `settings.theme` and `settings.reducedMotion`, `applyTheme` runtime behavior, and modal focus restoration functions. Total 17 automated tests passing (100% pass).
- **Canonical Dual-Delivery Sync (`standalone.html`):**
  - Rebuilt standalone package (`standalone.html`, 842,196 bytes) embedding all Phase 5 accessibility attributes, dark theme CSS variables, and focus restoration handlers with zero external dependencies.

---

## [Phase 4] - 2026-09-30

### Added (Phase 4 - Bridal Planner Upgrade, Rehearsal Timer, Hair & Tools Guides, Practice Journal Photos)
- **Bridal Rehearsal Live Timer (`#bridal`):**
  - Live pacing stopwatch with 3 structured presets:
    - *Full Bridal Rehearsal* (90 min: Scalp Prep 30m, Lace Melt 25m, Bridal Styling 25m, Veil & Handover 10m).
    - *Express Styling Rehearsal* (45 min: Cap & Foundation 15m, Styling Execution 20m, Veil & Fixative 10m).
    - *Quick Touch-Up Drill* (15 min: Edge Re-melt 5m, Pin Security 10m).
  - Realtime countdown display (`MM:SS`), dynamic phase pill, animated progress bar, phase step list, and Next Phase / Reset controls.
  - Zero-file Web Audio API synthesized chime (dual-tone sine wave 587.33Hz to 880Hz with exponential falloff) providing audible phase boundary cues without network requests or external audio assets. Respects reduced-motion and muted preferences.
  - Completed rehearsals automatically logged into `state.rehearsalLog` and awarded 50 Studio Points.
- **Multi-Profile Bridal Run Sheet (`#bridal`):**
  - Multi-profile selector dropdown with `+ New Bride Profile` generator allowing multiple concurrent brides/events to be planned independently.
  - Profile metadata management: Client Practice Name, Wedding/Trial Date, Ceremony Style, Venue & Climate Plan, and Bridal Party Count.
  - Morning-of styling schedule timeline table with checkable milestones, editable target times/tasks, and interactive `+ Add Timeline Step` button.
  - 8 core technical styling specification textareas (Chosen look, Wig fibre, Ceremony/weather plan, Fit checks, Veil/accessories, Timing, Removal/aftercare, Trial review) stored per profile while maintaining backwards compatibility with legacy `state.bridal`.
  - Bridal Security & Contract Verification Checklist (trial photographed, 24–48h patch test signed, booking terms acknowledged, compatible remover supplied, emergency touch-up kit packed).
  - Print run sheet styling (`@media print`): renders clean high-contrast wedding-morning run sheets with form fields flattened for physical clipboard use.
- **Tactile Hair Fibre Diagnostics & Studio Tools (`#kit`):**
  - **Tactile Fibre Diagnostic Matrix:** 4 curated cards (100% Human Hair, Human/Synthetic Blend, Heat-Friendly Synthetic, Ordinary Synthetic) specifying exact thermal ceilings (e.g. ≤160°C for blends, 0°C for ordinary synthetic), Accra coastal humidity behavior, flame/burn test ash and bead characteristics, and wash/care protocols.
  - **Salon Sanitisation & Cross-Contamination SOP:** Ghana-standard infection prevention guidelines covering 10-minute Barbicide/70% isopropyl immersion, wig block barrier film wrap, 24–48h patch testing, and non-traction bond release solvent protocols.
  - **4 Categorised Studio Tool Modules:** Module A (Foundation & Cap Setup), Module B (Thermal & Precision Styling), Module C (Adhesives, Cleansers & Care), and Module D (Bridal Finishing & Emergency), bound to `data-kit` with real-time percentage readiness counter.
- **Enhanced Practice Journal & Client Photo Records (`#journal`):**
  - 5-metric overview strip tracking Practised Lessons (`x/17`), Pilot Checks Passed (`x/15`), Completed Rehearsals, Attached Photos, and Total Studio Points.
  - 9 category/status filter buttons (`All Lessons`, `Practised Only`, `With Notes`, `With Photos`, `Foundation`, `Installation`, `Everyday`, `Bridal`, `Care`) with instant responsive DOM filtering.
  - Client-side Canvas photo compression (`compressAndStorePhoto`): automatically scales and compresses uploaded camera photos to max 600px at 0.72 JPEG quality (~40KB–70KB), strictly preventing `localStorage` 5MB quota exhaustion while allowing lightweight JSON backup exports.
  - Interactive photo section per lesson: thumbnail preview, full-screen accessible `<dialog id="photo-modal">` lightbox with backdrop dismissal, and photo removal.
  - Awards 15 Studio Points per attached photo evidence.
- **Automated Test Suite Expansion (`tests/test-preservation.cjs`):**
  - Added PASS 14 (rehearsal timer presets, phase math, and activity points), PASS 15 (multi-profile bridal schema, schedule, contract checklist, legacy migration, and non-destructive merging), and PASS 16 (standalone build integrity, CSS tokens, and offline guides). Total 16 automated test suites (100% pass).
- **Canonical Standalone Rebuild (`standalone.html`):**
  - Built standalone HTML (833,014 bytes) embedding all Phase 4 features with zero external runtime dependencies.

---

## [Phase 3] - 2026-09-30

### Added (Phase 3 - Mobile Workflow, Today Screen, Weekly Goal & Celebrations)
- **Today Workstation Dashboard (`#today`):**
  - Time-aware executive greeting (`Good morning/afternoon/evening, Sandy`) tailored to salon work rhythms.
  - 4-metric overview strip tracking **Lessons Practised** (`x/17`), **Pilot Checks Passed** (`x/15`), **Practice Records** count, and anti-inflation **Studio Points**.
  - **Recommended Next Step card** with direct continue/review buttons and links into prerequisites.
  - **Weekly Practice Goal tracker** with dynamic progress bar (`x of y sessions completed`), goal completion badge (`Goal Met ★`), remaining session countdown, and interactive target selector (1 to 7 sessions/week).
  - **Studio Achievements section** with 4 evidence-based badges:
    - `badge_first_practice` (🎖️ First Practice): Saved first hands-on practice session with notes (>=10 chars) or reflection.
    - `badge_three_looks` (✨ Three Looks Practised): Completed hands-on practice across 3 distinct lessons spanning >= 2 styling categories.
    - `badge_knowledge_checked` (🎓 Knowledge Checked): Verified all understanding checks in at least one pilot lesson.
    - `badge_weekly_goal` (👑 Weekly Goal Met): Achieved personal weekly styling practice session target.
  - **Recent Practice Notes feed** displaying recent observations with direct links to lessons and full practice journal.
  - **Studio Preferences** panel with toggle for milestone celebration visual effects.
- **Mobile Salon Ergonomics & Fixed Bottom Navigation:**
  - Added dedicated `<nav class="bottom-nav">` with 5 thumb-friendly 48px touch targets: `Today` (✨), `Learn` (📚), `Hair & Tools` (✂️), `Practice` (📝), and `Bridal` (👰).
  - Added `padding-bottom: max(6px, env(safe-area-inset-bottom))` and increased `#main` bottom padding to 95px on mobile viewports to prevent content clipping behind home indicator bars.
  - Synchronised route states between desktop header navigation and mobile bottom navigation with `aria-current="page"` semantics.
- **Milestone Celebration Engine & Anti-Inflation Mechanics:**
  - Lightweight luxury celebration canvas burst (`50` plum, gold, and champagne particles) with subtle physics and auto-cleanup.
  - Non-intrusive `<dialog id="celebration-modal">` announcing earned milestones with accessible "Continue practice" dismissal.
  - Full accessibility compliance: strictly respects `prefers-reduced-motion: reduce` and user celebration toggle preference.
  - Idempotent badge evaluation: badges are awarded once and stored under `state.gamification.earnedBadges`. Celebrations are tracked under `state.gamification.celebratedBadges` to guarantee zero duplicate modal alerts on page reload or backup re-import.
  - Anti-inflation activity point calculation: computed deterministically via `calculateActivityPoints(state)` (10 pts/step tick, 20 pts/unique question passed, 25 pts/reflection, 50 pts/lesson done). Re-attempting already passed questions never inflates points.
- **Automated Test Suite Expansion (`tests/test-preservation.cjs`):**
  - Added PASS 11, PASS 12, and PASS 13 suites (total 13 automated test suites) verifying recommendation algorithm, weekly goal bounds, deterministic anti-inflation points, badge evaluation idempotency, celebration deduplication, schema validation, and standalone HTML build integrity.
- **Canonical Standalone Rebuild (`standalone.html`):**
  - Generated standalone HTML (784,371 bytes) with embedded base64 thumbnails, Today dashboard, mobile bottom navigation, and celebration dialog with zero external dependencies.

---

## [Phase 2] - 2026-09-30

### Added (Phase 2 - Pilot Interactive Lessons & Assessment Engine)
- **18 Calibrated Pilot Questions (`lessons.js`):**
  - **`frontal` (Lesson 05 - Installation):** 6 questions covering chemical safety / 24-to-48-hour patch testing, natural hairline perimeter protection against traction alopecia, midday Accra wedding reception humidity/sweat troubleshooting, edge lifting under veil placement, 5-step bonded installation sequencing, and emergency chemical stinging / adverse reaction reflection with 4 self-check criteria.
  - **`curls` (Lesson 08 - Everyday):** 6 questions covering human-hair blend thermal limits (160°C/320°F ceiling), humidity-resistant sectioning and pinning, harmattan dryness frizz prevention and light silicone serum application, comb-out timing, 5-step hot-tool curl setting sequencing, and client heat damage education reflection with 3 self-check criteria.
  - **`chignon` (Lesson 12 - Bridal):** 6 questions covering wig foundation protection and horizontal pin placement against lace tearing, anchor ponytail tension and perimeter traction prevention, humid coastal outdoor ceremony security and sweat-resistant foundation, veil removal comb anchor technique, 5-step clean bridal chignon sequencing, and heavy veil balance and bridal trial rehearsal reflection with 3 self-check criteria.
- **Verified Video Moment Bookmarks:** Added verified timestamp bookmarks in `videoAdapter.bookmarks` for all 3 pilot lessons (e.g. 0:45, 2:15, 5:10 for frontal; 1:00, 2:35, 5:40 for curls; 0:30, 1:50, 4:10 for chignon) with direct time-stamped YouTube links.
- **Interactive Question Stepper & Knowledge Engine (`app.js`):**
  - Implemented dynamic stepper navigation (`Question X of 6`) with Previous/Next controls, topic pills, and question count badges.
  - Knowledge Summary banner displaying realtime passed check count and first-try accuracy percentage (`X of 5 checks passed (Y% first-try accuracy)`).
  - Multiple-choice form with calibrated distractor rationales, verified references, and optional 4-point confidence rating (`Low`, `Medium`, `High`, `Skip`).
  - Confident-incorrect diagnostic alerts flagging high-confidence errors for targeted review.
  - Interactive step-sequencing component with accessible move up/down controls (`▲`/`▼`) and objective sequence verification.
  - Structured practical reflection component with auto-saving textarea draft persistence, educator model answer reveal, and interactive self-check assessment criteria checklist.
- **Resume State Persistence (`state.quizProgress`):**
  - Automatically captures learner's active question index, draft reflections, selected pending options, active confidence, and current step sequences in `sandy-studio-v2`.
  - Re-entering a lesson seamlessly resumes at the learner's active question with all in-progress drafts preserved.
- **Expanded Zero-Dependency Test Suite (`tests/test-preservation.cjs`):**
  - Expanded from 7 to 10 automated test suites (PASS 1 through PASS 10) verifying all 3 pilot lessons, 18 questions, schema validity, interactive engine logic, first-try accuracy tracking, confidence recording, reflection self-check persistence, and non-destructive v2 backup/restore merging.
  - 100% test pass verified across both hosted and standalone modes.
- **Updated Offline Standalone Builder (`standalone.html`):**
  - Rebuilt `standalone.html` (759,067 bytes) containing all 18 pilot questions, stepper styling, and verified bookmarks with zero external dependencies.

---

## [Phase 1] - 2026-09-29


---

## [1.0.0] - 2026-09-28 (Baseline)

### Initial Release
- 17 structured lessons covering Foundation, Installation, Everyday, Bridal, and Care.
- Responsive HTML/CSS/JavaScript single-page application with hash routing.
- LocalStorage persistence under `sandy-studio-v1` for practice flags, step checklists, notes, kit items, and bridal planner.
- Standalone generated single-file delivery (`standalone.html`) with inlined styles and base64 embedded thumbnails.
- JSON backup export and merge restoration.
