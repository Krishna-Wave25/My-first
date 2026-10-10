# LIFE OS AI — personal command center (Android app)

A local-first productivity and intelligence app: tasks & planning, a daily news briefing, a technology radar,
earning-opportunity research, personal finance, career & learning, engineering-project workspace, YouTube studio
(MONEYVARK / ZILVOREX), reports, and an AI assistant that asks before it changes anything.

> This folder is separate from the SolarGrid MPPT marketing site at the repo root (which is plain HTML/CSS/JS).
> LIFE OS is a TypeScript + React app, so the root `CLAUDE.md` "no framework" rules do not apply here.

## Architecture decision (read this first)

| Brief asked for | What was built | Why |
|---|---|---|
| Android app | **Capacitor** wrapper around the web app (`android/`), installable APK | The build environment could not reach Google's Android SDK/Maven hosts, so a native Kotlin app could not be compiled or tested. A web UI could be tested in a real browser, and Capacitor adds the native pieces that matter (local notifications, native HTTP without CORS limits, back button). |
| Server, PostgreSQL, hosted auth | **None — local-first.** Data lives in on-device IndexedDB (Dexie). Auth = optional **PIN lock**. | A backend + database + auth needs infrastructure/accounts that don't exist here. Pretending otherwise would be fake. See *Roadmap*. |
| Server-side AI keys | **Bring-your-own Anthropic API key**, stored on the device, called directly | No server to hold a secret. Trade-off documented in Settings and below. |
| Scheduled background jobs | **Android local notifications** (system alarms) | Works with the app closed. A *server* job that pre-builds the briefing at 7:00 AM is not possible without a backend: the 7:00 notification is a prompt; stories are fetched when you open the app. |

Stack: React 18 · TypeScript · Vite · Dexie (IndexedDB) · chrono-node (date parsing) · date-fns · Capacitor 6
(`@capacitor/local-notifications`, `@capacitor/app`). No UI framework, no CSS framework, no backend.

## Run it

```bash
cd life-os
npm install
npm run dev            # http://localhost:5173
npm test               # 44 unit tests (vitest)
npm run e2e            # 26 browser tests incl. axe accessibility scans (Playwright)
npm run build          # type-check + production build into dist/
```

### Build the Android APK

* **Easiest:** GitHub Actions workflow `.github/workflows/life-os.yml` builds `app-debug.apk` and uploads it as the
  `life-os-ai-debug-apk` artifact (Actions → latest run → Artifacts). Sideload it (enable "install unknown apps").
* **Locally** (needs JDK 17 + Android SDK, e.g. via Android Studio):
  ```bash
  npm run build && npx cap sync android
  cd android && ./gradlew assembleDebug      # → app/build/outputs/apk/debug/app-debug.apk
  npx cap open android                        # or open in Android Studio
  ```
* **Release / Play Store:** create a keystore (never commit it), configure signing in `android/app/build.gradle`,
  then `./gradlew bundleRelease` for an `.aab`. Replace `appId` (`app.lifeos.ai`) in `capacitor.config.ts` with your own
  before publishing.

## Configuration

No environment variables or server settings. Everything is configured in the app (**Settings**):

| Setting | Needed for | Required? |
|---|---|---|
| Time zone, work hours, schedule times | 7:00 AM briefing, reminders, planner | Pre-filled from the device |
| Notification permission (Android 13+) and "Alarms & reminders" | Reminders & scheduled prompts | Optional, but reminders won't fire without it |
| Anthropic API key + model | Assistant, "why it matters" news analysis, video-idea/script drafting | **Optional** — everything else works without it |
| News/tech feeds (RSS URLs) | Briefing & radar | Defaults included; editable. No API key |
| PIN | App lock | Optional |

**Not available (needs your own accounts/API access):** Google/Outlook calendar sync, YouTube Analytics (OAuth),
email delivery, remote push (FCM), bank/investment accounts (deliberately never offered), cloud sync.

### Database & migrations
IndexedDB database `lifeos`, schema in `src/db/db.ts` (`this.version(1)`). To change tables, add a
`this.version(2).stores({...}).upgrade(tx => …)` block — never edit version 1. Backups: Settings → Data
(JSON export/restore; the API key is excluded unless you tick the box).

## What is implemented

Legend: ✅ working & tested · 🟡 working, limited · ❌ not built

**Phase 1 — foundation**
- ✅ Dashboard: greeting/date, top-3 priorities, deadlines, briefing, tech, opportunity, career, YouTube, project, habits, productivity score, quick notes, assistant; **show/hide/reorder** widgets
- ✅ Tasks: create/edit/complete/postpone/delete, 6 categories, 4 priorities, deadlines, reminders, **recurrence** (daily/weekly+weekdays/monthly, next occurrence auto-created), notes, subtasks, tags
- ✅ Views: Today, Upcoming, Overdue, Completed, Calendar (month grid)
- ✅ **Natural-language task creator** ("Tomorrow at 7 AM, spend 45 minutes learning AI automation" → structured task + reminder)
- ✅ Daily schedule suggestion (fixed events + priority/deadline-ordered gaps), conflict detection, overload & deadline-risk warnings, "apply suggested times"
- ✅ End-of-day review + tomorrow's plan; weekly report
- ✅ Habits with streaks; transparent productivity score (formula shown in the UI)
- ✅ Notes (tags, pin, search, convert to task), bookmarks, saved articles, export selected, **universal search** (Ctrl/⌘ K) over tasks, notes, news, opportunities, projects, ideas
- ✅ Dark/light themes, desktop sidebar, mobile bottom nav, keyboard-accessible, axe-clean (no serious/critical WCAG A/AA violations on any page, both themes)
- 🟡 Auth: optional PIN (PBKDF2-hashed, growing lockout, auto-lock after 30 s in background). **Single local user** — there are no accounts.

**Phase 2 — intelligence**
- ✅ Briefing of **exactly five** stories (never padded; fewer are shown with a notice if fewer qualify), ranked by source tier + recency + your interests, near-duplicates and clickbait removed, undated/stale (>72 h) items excluded
- ✅ Each story: headline, date/time, source tier, source text, link; UPSC theme hint (keyword heuristic, labelled as such)
- ✅ Confirmed reporting / AI analysis / speculation are visually separate; AI fields appear only after you request them and are limited to the source excerpt
- ✅ Filters by topic/date/importance/source, searchable archive of past briefings, per-feed health report
- ✅ Technology radar (9 areas), watchlists (technology/company/tool/industry) with mention highlighting
- 🟡 Live feed fetching is implemented and tested against recorded fixtures, **but was not verified against the real publishers** (see limitations)

**Phase 3 — money & career**
- ✅ Earn Money: 12 curated playbooks with every requested field (how it works, skills, start cost, time to first income, *estimated* revenue, difficulty, competition, risks, free resources, steps, platforms, first action), estimate/“revenue ≠ profit” disclaimers, Opportunity Tracker (Saved → Researching → In progress → Applied → Earned/Rejected), first-₹1,000 7-day plan, scam warnings
- ✅ Finance: income/expense tracker, 50/30/20 check, monthly budgets, savings goals, emergency-fund planner, SIP / lump-sum / goal / inflation calculators (cautious-assumed-optimistic scenarios, always labelled hypothetical), 9 lessons with risk notes and official sources, quiz, CSV export
- 🟡 Markets: **no live prices** by design; shows dated business/RBI headlines and official data links
- ✅ Career: official portals + tracker with eligibility/location/stipend/"verified on official site" fields, ATS resume matcher (heuristic), interview question bank with self-rating, GD topics, 4 skill roadmaps (beginner→advanced) with progress, daily learning goal/streak
- ❌ Individual job/internship/scholarship **listings** (cannot be verified without an official data feed — none are invented)

**Phase 4 — projects & content**
- ✅ Project workspaces (custom or IoT Solar Microgrid template): milestones, hardware inventory, wiring, code, test results (expected vs measured, % error), troubleshooting log, references, viva Q&A, report/slide checklist, weekly progress summary
- ✅ **Confirmed vs proposed** separation for components and wiring; connection **safety linter** (over-voltage on logic pins, unfused battery/high-voltage lines, wire gauge vs current, mains-level warnings, missing common ground, unverified "confirmed" entries). It flags visible risks only — it never certifies a circuit as safe.
- ✅ YouTube Studio: pipeline board for both channels, checklists, content calendar, manual views entry, research log
- 🟡 AI drafting of ideas/titles/hooks/outlines/tags (needs your API key; labelled as AI suggestions, not verified trends)
- ❌ Trending-topic / keyword-volume / competitor data and YouTube Analytics (need an authorised provider; never invented)

**Phase 5 — assistant & automation**
- ✅ Assistant with 13 tools over your real data; **read tools run immediately, every write tool requires explicit approval** (tested)
- ✅ Offline mode (no key): plan my day, overdue, today, briefing, weekly review, search, "add …" (with confirmation)
- ✅ Configurable schedules for briefing, morning plan, deadline alerts, evening review, weekly review, tech summary, opportunity deadlines (day before + day of)
- 🟡 Notifications: the plan is computed and tested; Android scheduling code is in place and Settings reports how many are actually pending — **not yet verified on a physical device**
- ❌ Server-side background jobs, email, remote push

## Known limitations & honest caveats

1. **Not run on a real device or emulator.** The Android SDK could not be downloaded in the dev environment. The web app is tested in Chromium; CI (GitHub Actions) builds the debug APK successfully (artifact `life-os-ai-debug-apk`), but the APK has never been launched. Notification delivery, the native HTTP path, the back button, and OEM battery-optimisation behaviour are **untested**. Use *Settings → Send test notification* on your phone first.
2. **News feeds are unverified against live publishers.** The feed URLs are public RSS endpoints from memory and the sandbox blocked all publisher domains. Each feed's health is shown in News → Sources; broken feeds can be edited/replaced in-app. In a desktop browser many sites block direct requests (CORS) — the Android app fetches natively.
3. **AI was only tested against a mocked API**, not a live key. Request format follows the Messages API; use *Settings → Test connection*.
4. **Security model:** the PIN locks the UI; the on-device database is **not encrypted** (Android app sandboxing + device encryption apply; `allowBackup` is disabled). An API key stored in an app can be extracted from a rooted device — use a spend-limited key. There is no multi-user isolation because there is only one user.
5. **Notifications are re-planned whenever the app is open or data changes** (rolling 7-day window for daily prompts). If you don't open the app for over a week, daily prompts will stop until you do. Android may delay alarms under battery optimisation; exact alarms need the "Alarms & reminders" permission on Android 12+.
6. **Earning estimates are illustrative,** not data. Curated content (playbooks, lessons, roadmaps, interview bank) was written for this app and is not a substitute for professional advice; tax rules/rates are deliberately not stated.
7. The ATS checker and UPSC theme hints are keyword heuristics.
8. No i18n; English only. No tablet-specific layouts beyond responsive CSS.

## Testing

* `npm test` — 44 unit tests: NL parsing, recurrence, planner, time zones, scoring, RSS/Atom/RDF parsing, ranking/dedupe/clickbait, fixture-network refresh, assistant confirmation gate (mock API), notification plan, ATS, wiring safety, finance maths, backup, PIN.
* `npm run e2e` — 26 Playwright tests: all 11 sections, desktop/tablet/phone layouts (no horizontal overflow), persistence after reload, tasks/recurrence/review/notes/habits, five-story briefing from fixture feeds, honest empty/failed states, tracker, finance, career, projects & safety flags, YouTube, assistant confirmation, settings/export (API key excluded), PIN lock, axe scans (dark + light).

## Roadmap (to reach the original brief)

1. **Backend** (e.g. Postgres + auth such as Supabase/Auth.js): accounts, row-level security, sync across devices.
2. **Server jobs**: build the 7:00 AM briefing server-side, FCM push and email; keep AI keys server-side with rate limiting.
3. **Background fetch** on device (WorkManager) as an interim without a server.
4. **Encrypted storage** (SQLCipher) and biometric unlock.
5. **Integrations**: Google Calendar OAuth, YouTube Analytics API, a licensed jobs/scholarship data source.
6. Verify on devices; Play Store signing & release pipeline.
