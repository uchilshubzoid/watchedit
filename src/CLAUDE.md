# WatchedIt — Project Memory for Claude Code
*This file gives Claude Code full context on the WatchedIt project. Read this before doing anything.*

---

## What is WatchedIt

WatchedIt is a personal content manual — a mobile app for logging, searching, and analysing everything you've watched. Target user: unashamed, high-volume, opinionated consumer of content who wants to own their taste data instead of leaving it locked in streaming platforms.

**One liner:** Every title you've watched, rated, and remembered — searchable, analysable, and finally yours.

**Core philosophy:** Intentional capture. You chose to log it — that makes the rating and reaction meaningful. Tone throughout is warm and slightly playful.

---

## Current Build Status

### Stage 1 — UI Shell + Live APIs ✅ Complete
React web app, all screens built in `src/screens/WatchedItApp.jsx`. APIs (MAL, TMDB, OMDB) wired into LogIt search. `WatchedItApp.jsx` is now the migration reference — do not add features to it.

### Stage 2 — Expo Native Migration ✅ Complete (as of Apr 2026)
All screens and components migrated to React Native + Expo Router. The app runs on device. `WatchedItApp.jsx` is kept read-only as a reference only.

### Stage 2.1 — Log It UX Polish ✅ Complete (as of May 2026)
Keyboard sync, poster zoom, success toast system, title language fix, submission animation, bookmark icon, star rating haptics, PanResponder gesture capture. See spec v1.5 changelog for full detail.

### Stage 2.2 — Stats Screen Redesign ✅ Complete (as of May 2026)
Full StatsScreen rewrite. See spec v1.6 changelog for full detail. Key decisions:
- Time filters: 7 Days / 30 Days / Custom (date range picker) / All Time. 90 Days and category chips removed.
- Hero cards: Option B — centered column layout (number on top, label below).
- Breakdown by Category: 3 mini stat boxes per type + collapsible title list. Deduped from a single section (no more duplicate at bottom).
- Timeline tab now shows all sections (chart + breakdown + genre + insights widget).
- "By Type" toggle on chart: switches between combined amber line and 3 colored type lines; chart header counts switch to per-type breakdown.
- Line chart with dots; tap callout; r=18 transparent hit areas on dots.
- X-axis: max 8 labels via `ceil((n-1)/7)` interval formula.
- `buildTimePoints` extracted as reusable function used for both combined and per-type data.
- `localDateStr()` fixes UTC timezone shift in per-day chart bucketing.
- Currently Watching entries now count in stats if `lastWatchedDate` falls within the filter period.
- DateRangePicker: week-row calendar, continuous range fill, start=amber circle, end=amber circle + outer ring.
- Insights widget: named callout for hardest-rated genre, TODO'd for future variant rotation.

### What's NOT built yet (do these next in order)
1. **Onboarding flow** — cold start problem, empty state for new users
2. **Screen transition polish** — UX pass on nav animations (flagged, tracked for future)
3. **Tone audit** — verify all empty states, error messages, action labels are warm + playful
4. **Play Store prep** — app signing, store listing, screenshots

---

## File Structure

```
/
├── app/                           ← Expo Router — all route files are thin re-exports
│   ├── _layout.jsx                ← Root layout: font loading, GestureHandlerRootView
│   ├── (tabs)/
│   │   ├── _layout.jsx            ← Tab navigator (5 slots, + FAB opens logit modal)
│   │   ├── index.jsx              ← Watch Tower tab
│   │   ├── watchlist.jsx          ← WatchList tab
│   │   ├── search.jsx             ← Search tab
│   │   └── watcher.jsx            ← Watcher/Profile tab
│   ├── logit/
│   │   ├── search.jsx             ← Log It Step 1 (modal)
│   │   └── details.jsx            ← Log It Step 2
│   ├── detail/
│   │   └── [id].jsx               ← Detail view (dynamic route)
│   └── stats.jsx                  ← Statistics screen
├── src/
│   ├── CLAUDE.md                  ← this file
│   ├── constants/
│   │   └── tokens.js              ← Design tokens (T object) — LOCKED
│   ├── screens/                   ← Screen components (logic lives here, app/ re-exports)
│   │   ├── WatchedItApp.jsx       ← MIGRATION REFERENCE — do not add features here
│   │   ├── WatchTower.jsx         ← Home screen — stats, currently watching, recently watched, success toast
│   │   ├── WatchList.jsx          ← List screen
│   │   ├── DetailView.jsx         ← Watch Deets / detail view
│   │   ├── LogItSearch.jsx        ← Log It Step 1 (RN Modal, not a route — controlled by tab layout)
│   │   ├── LogItDetails.jsx       ← Log It Step 2 (stack route)
│   │   ├── SearchScreen.jsx       ← Search tab
│   │   ├── StatsScreen.jsx        ← Statistics screen
│   │   └── WatcherScreen.jsx      ← Watcher / profile screen
│   ├── components/                ← Shared UI components
│   │   ├── Poster.jsx             ← Poster thumbnail with initials fallback
│   │   ├── TypePill.jsx           ← Movie / TV Show / Anime pill
│   │   ├── StarRating.jsx         ← Tap + drag star rating (0.5 steps, haptics)
│   │   ├── FilterSheet.jsx        ← Filter & Sort bottom sheet (@gorhom/bottom-sheet)
│   │   ├── LogSeshSheet.jsx       ← Log a Sesh bottom sheet
│   │   ├── RatingSheet.jsx        ← Mini rating sheet
│   │   ├── MiniCalendar.jsx       ← Date picker calendar
│   │   └── BlockingPopup.jsx      ← Modal popup (movie-watching block, rating required)
│   ├── api/
│   │   ├── index.js               ← unified searchTitles() entry point
│   │   └── mal.js                 ← MAL API (direct fetch, no proxy needed in RN)
│   ├── services/
│   │   ├── tmdb.js                ← TMDB API (Bearer token)
│   │   ├── omdb.js                ← OMDB API
│   │   └── search.js              ← legacy orchestrator (keep for reference)
│   ├── db/
│   │   └── storage.js             ← AsyncStorage CRUD (all functions are async)
│   └── utils/
│       ├── titleUtils.js          ← getPreferredTitle(result, pref) — EN/JA/romanised
│       └── toastBridge.js         ← Module-level singleton: setPendingToast / consumePendingToast
├── assets/                        ← TODO: add icon.png, splash.png, adaptive-icon.png
├── app.json                       ← Expo config (package: com.watchedit.app)
├── babel.config.js                ← babel-preset-expo + reanimated plugin
├── metro.config.js
├── eas.json                       ← EAS Build: preview=APK, production=AAB
├── .env                           ← All keys use EXPO_PUBLIC_ prefix
└── package.json                   ← Expo Router entry, React Native stack

# Deprecated CRA artifacts are archived in `archive/web-shell/`.
# Do not use them for active work; keep them only as Stage 1 reference.
```

### Migration pattern for extracting components

Each screen stub in `src/screens/` follows this pattern:
```jsx
// 1. Find the component in WatchedItApp.jsx
// 2. Copy it into the stub file
// 3. Replace: div→View, p/span→Text, img→Image, CSS objects→StyleSheet.create()
// 4. Replace: navigator.vibrate() → Expo.Haptics.impactAsync()
// 5. Replace: localStorage → AsyncStorage (all storage calls are now async)
// 6. Replace: browser navigation → expo-router router.push() / useLocalSearchParams()
// 7. Import T from '../constants/tokens' instead of defining inline
```

---

## Design System — LOCKED, do not change these

### Colours (in `src/constants/tokens.js`)
```js
T.bgPrimary   = "#292826"   // page background
T.surface     = "#333230"   // cards
T.elevated    = "#3E3C39"   // inputs, chips
T.amber       = "#EF9F27"   // CTAs, ratings, active states
T.amberDeep   = "#E8860A"   // card titles, gradient end
T.amberSoft   = "#FAC775"   // badges, muted accents
T.amberWarm   = "#C8854A"   // TV Show pill
T.textPrimary = "#F5F0E8"   // body text
T.textMuted   = "#9E9B96"   // labels, dates
// Special:
T.paused      = "#8BA3C4"
T.dropped     = "#C47A7A"
```

### Typography (font families registered in `app/_layout.jsx`)
```js
T.fontDisplay     = 'Nunito-ExtraBold'    // 800w — headings, numbers, CTAs
T.fontTitle       = 'Nunito-Bold'          // 700w — card titles
T.fontTitleMedium = 'Nunito-SemiBold'     // 600w
T.fontBody        = 'Nunito-Regular'       // 400w — body
T.fontBodyMedium  = 'Nunito-Medium'       // 500w
T.fontMono        = 'Inconsolata-Regular'  // mono — labels, stats, dates
```

### Rules
- Dark mode only
- Cards: `T.radiusCard` = 16px border radius
- Buttons/pills: `T.radiusButton` = 22px border radius
- No harsh borders — elevation separates surfaces
- Amber sparingly: only ratings, CTAs, active states
- No glows or halos — matte surfaces only

---

## Naming Conventions
| Term | Meaning |
|---|---|
| Log It | The action of logging a watch entry |
| WatchLog | The full diary/history concept |
| WatchList | The list screen |
| Watch Tower | The home screen |
| Watch Sesh / Log a Sesh | A single episode session |
| Watch Deets | The detail/timeline screen for a title |
| Watch Plan | Plan to Watch status |
| Watcher | The profile screen |

---

## Watch Status Model & State Transitions

| Status | Counts in stats? |
|---|---|
| Watched | Yes |
| Currently Watching | No (until finished) |
| Paused | No |
| Dropped | Yes |
| Watch Plan | No |

**State transition rules (enforce these strictly):**
- **Watch Plan** → Watched (movie: via RatingSheet), Watching (TV/Anime: via Log a Sesh or Mark All Watched), Delete. Cannot be Paused or Dropped.
- **Currently Watching** → Watched (via Mark All Watched / Log a Sesh that completes show), Paused, Dropped (rating mandatory)
- **Paused** → Watching (resume), Dropped, Watched
- **Dropped** → Watching (Continue Watching CTA, logs resume date), Watched directly
- **Watched** → Rewatch (new linked entry), Unwatch (delete)
- **Movies** → can only be Watched or Watch Plan. Watching blocked with 🍿 popup.
- **Logging a Sesh** always moves the entry to `status:"watching"` if it was in any other non-complete state.

---

## Navigation (Expo Router)

```
app/_layout.jsx              Root Stack
├── (tabs)                   Bottom tab navigator (app/(tabs)/_layout.jsx)
│   ├── index (Watch Tower)
│   ├── watchlist
│   ├── [+ FAB]             DeviceEventEmitter.emit('openLogIt') — not a route
│   ├── search
│   └── watcher
├── logit/search             Route file exists but LogItSearch is rendered as an RN Modal
│                            from app/(tabs)/_layout.jsx, NOT as a stack route
├── logit/details            Stack — Log It Step 2 (animation: slide_from_bottom)
├── detail/[id]              Stack — Detail view
└── stats                    Stack — Statistics
```

**Log It search modal** is a React Native `<Modal>` rendered inside `app/(tabs)/_layout.jsx`. `logitOpen` state controls it. Open it via:
```js
DeviceEventEmitter.emit('openLogIt');
```
Close it from anywhere (e.g. after submit in LogItDetails) via:
```js
DeviceEventEmitter.emit('dismissLogItSearch');
```

**Navigating to Detail View:**
```js
router.push(`/detail/${entry.id}`);
```

**Navigating to Log It Details from Search:**
```js
// Pass displayTitle separately — keeps r.title (original/Japanese) intact for the alternatives dropdown
router.push({
  pathname: '/logit/details',
  params: { resultJson: JSON.stringify({ ...result, displayTitle: getPreferredTitle(result, titleLang) }) },
});
```

**Edit mode in LogItDetails:**
```js
router.push({ pathname: '/logit/details', params: { entryId: entry.id, isEdit: 'true' } });
```

**Success toast after Log It submit:**
```js
// In LogItDetails — before router.back()
setPendingToast({ title: '🎬 Logged!', body: `${title} logged as Watched` });
DeviceEventEmitter.emit('dismissLogItSearch'); // closes search modal simultaneously
router.back();
// WatchTower reads consumePendingToast() in useFocusEffect and displays it
```

---

## API Stack (Live)

### Keys — stored in `.env` (EXPO_PUBLIC_ prefix)
```
EXPO_PUBLIC_MAL_CLIENT_ID=...
EXPO_PUBLIC_TMDB_TOKEN=...   (Bearer JWT)
EXPO_PUBLIC_OMDB_API_KEY=...
```

### Architecture
- `src/api/index.js` — `searchTitles(query, entries)` — main entry point. Runs MAL + TMDB movies + TMDB TV + OMDB in parallel via `Promise.allSettled`. Returns `{ combined, bySource }`.
- `src/api/mal.js` — MAL search via direct fetch (no proxy — CORS doesn't apply in React Native)
- `src/services/tmdb.js` — TMDB movies + TV (Bearer token). Exports: `searchTMDBMovies`, `searchTMDBTV`, `getTMDBMovieDetails`, `getTMDBTVDetails`
- `src/services/omdb.js` — OMDB search + detail enrichment. Exports: `searchOMDB`, `getOMDBDetails`

---

## Data Layer

### Storage (`src/db/storage.js`)
All functions are **async** (AsyncStorage). Always `await` them.
```js
await getEntries()
await addEntry(entry)
await updateEntry(updated)
await deleteEntry(id)
await getEntry(id)
await getTitleLanguagePref()    // 'en' | 'ja' | 'romanised'
await setTitleLanguagePref(p)
```

### Entry shape
```js
{
  id              // string (Date.now().toString())
  title           // string
  type            // "Movie" | "TV Show" | "Anime"
  lang            // string
  rating          // number | null (0.5–10)
  reaction        // string | undefined
  recommend       // boolean
  bookmark        // boolean
  date            // string (short, e.g. "Apr 10")
  status          // "watched" | "watching" | "watchplan"
  ep              // number | null
  total           // number | null
  ongoing         // boolean
  paused          // boolean
  dropped         // boolean
  rewatch         // boolean
  finishedDate    // string | null
  lastWatchedDate // string | null
  watchTime       // string | null (e.g. "~7h 12m")
  estimated       // boolean
  genre           // string[]
  poster_url      // string | null
  malRating       // number | null
  watch_sessions  // WatchSession[]
  episode_notes   // { [epNumber]: string } | undefined
  watch_start_date // ISO string | null
  watch_end_date  // ISO string | null
  logged_at       // ISO string
}
```

---

## Key UX Decisions Made (don't revisit unless flagged)

- **Log It is 2 steps:** RN Modal for search (controlled by tab layout), full screen stack for details.
- **Filter & Sort:** Single consolidated bottom sheet triggered by one button.
- **Language input:** 10 quick-select chips + free text fallback.
- **Genre tags:** Inline "+ Add Tag" chip.
- **Star rating:** Tap left half = X.5, tap right half = X. Drag for speed. Haptic (`impactAsync(Light)`) on each 0.5-step change.
- **Movie + Watching:** Blocked with 🍿 popup.
- **Rating required popup:** ⭐ blocks submit without rating on Watched status.
- **Currently Watching on home:** Horizontal scroll cards. Paused entries hidden by default.
- **Recently Watched on home:** Last 3 only.
- **Bookmark treatment:** Right-edge gradient border on cards. Icon uses Ionicons `bookmark` / `bookmark-outline`.
- **Episode tracker:** Collapsed by default.
- **Ongoing shows:** "Mark as Finished" CTA always visible.
- **Logging a sesh on Watch Plan / Dropped:** Automatically transitions to Currently Watching.
- **Title language in Log It:** `displayTitle` (preferred language) is passed to LogItDetails as a separate field. `title` (original, e.g. Japanese) is preserved and always appears in the alternatives dropdown unchanged.
- **Poster in Log It Step 2:** Tapping the poster thumbnail opens a full-screen zoom modal. Supports pinch-to-zoom (up to 6×) and drag-to-pan when zoomed. Uses `Gesture.Simultaneous(pinchGesture, panGesture)` inside a `GestureHandlerRootView` within the RN Modal.
- **Keyboard + search sheet:** Both rise simultaneously — input is focused at the start of the sheet's entrance animation, not after it completes.
- **Success toast:** Shown on Watch Tower after Log It submit. 10s auto-dismiss, top-right ✕ button, positioned 8px above tab bar. Passed via `toastBridge` singleton (not navigation params).

---

## Tone & Copy Guidelines
Warm, slightly playful, never condescending:
- "Woah you've gone niche! 🎭 No results found online... add manually to log?"
- "Lol faine, I'll finish it"
- "C'mon, you know what you felt"
- "Nothing watched here. Go fix that."
- "On a roll 🎬 2 days in a row"
- "Remember to touch grass 🌿" (at 4 day streak)
- "We're not judging 👀" (at 14 day streak)
- "Rating later? Your verdict will mean more when you've slept on it."
- "This is yours forever. Future you will thank present you."
- "That's a wrap! Rate it 🎬" (completing an ongoing show)
- "You finished it! Rate it 😄" (completing a finite show)

---

## How to Run

```bash
# Install dependencies (first time or after package.json changes)
npx expo install --fix    # validates and fixes version mismatches
npm install

# Development (Expo Go on device — scan QR)
npm start                 # or: npx expo start

# Android emulator / device
npm run android

# Build APK (for sideloading / testing)
npm run build:apk         # requires EAS account + eas-cli

# Build AAB (for Play Store submission)
npm run build:aab
```

**Assets required before first build:**
- `assets/icon.png` — 1024×1024 PNG, app icon
- `assets/splash.png` — splash screen image
- `assets/adaptive-icon.png` — Android adaptive icon foreground (1024×1024, transparent bg)

---

## Important Notes for Claude Code

- **`WatchedItApp.jsx` is now read-only** — it's the migration source. Extract from it, don't add to it.
- **All storage calls are async** — `await getEntries()`, `await addEntry()`, etc.
- **No localStorage** — use `src/db/storage.js` (AsyncStorage) everywhere.
- **No browser APIs** — no `window`, `document`, `navigator.vibrate`, `localStorage`, `URL` constructor (use string template for URLs in fetch calls, or verify RN URL support).
- **Haptics** — use `expo-haptics` (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`). `selectionAsync` has poor Android support — use `impactAsync(Light)` for fine-grained feedback.
- **Bottom sheets** — use `@gorhom/bottom-sheet`. Must be inside `GestureHandlerRootView` (already set up in `app/_layout.jsx`).
- **Gesture handler inside RN Modal** — `GestureHandlerRootView` must be placed *inside* the RN `<Modal>` component, not just at the root, for gestures to work inside modals.
- **Animated driver conflicts** — never put both a `useNativeDriver: true` animated value and a `useNativeDriver: false` animated value on the same `Animated.View`. Use plain `useState` for layout props like `marginBottom` (no driver at all) alongside native-driver transforms.
- **LogItSearch is a RN Modal, not a stack route** — do not call `router.push('/logit/search')`. Open via `DeviceEventEmitter.emit('openLogIt')`. Close via `DeviceEventEmitter.emit('dismissLogItSearch')`.
- **toastBridge** — use `setPendingToast` / `consumePendingToast` from `src/utils/toastBridge.js` to pass toast data across navigation. WatchTower reads it in `useFocusEffect`. Never pass toast content as a navigation param.
- **displayTitle vs title** — when passing a search result to LogItDetails, always pass `displayTitle: getPreferredTitle(result, lang)` as a separate field. Never overwrite `result.title` — it holds the original (e.g. Japanese) title needed for the alternatives dropdown.
- **Fonts** — always use `T.fontDisplay`, `T.fontTitle`, etc. Never hardcode font family strings.
- **Design tokens** — import `T` from `src/constants/tokens.js`. Do not change colour/font/radius values.
- **Always enforce state transition rules** — see the table above.
- **Hooks rule** — never call useState/useEffect inside .map() or conditionals.
- **Always pass `url={entry.poster_url}` to `<Poster/>`** — omitting it silently falls back to initials.
- **`bySource` vs `combined`** — when a source filter chip is active, use `bySource[source]` not `combined`.
- **Edit mode in LogItDetails** — when `isEdit=true`, submit must call `updateEntry` (not `addEntry`) and must preserve `id`, `watch_sessions`, `episode_notes`.
- **Check the spec** (`src/WatchedIt_Spec_Updated.md`) for product decisions before making assumptions.
- **Run `npx expo install --fix`** after changing package.json to validate dependency versions.
- **No EAS build needed for testing** — app is tested via Expo Go. `npm start` and scan QR.
- **Stats date bucketing** — always use `localDateStr(timestamp)` (local time methods: getFullYear/getMonth/getDate) for per-day chart comparisons. Never use `.toISOString().split('T')[0]` — it shifts dates in non-UTC timezones. When parsing legacy `finishedDate` strings like "Apr 10", append `12:00:00` (noon) to keep the date on the correct local day.
- **Stats data inclusion** — `getEntries()` for stats must include `status === 'watched'`, `e.dropped`, AND `status === 'watching'`. Currently Watching counts if `lastWatchedDate` falls within the filter period (i.e. a session was logged). Do NOT include Watch Plan or Paused entries.
- **`buildTimePoints(entries, filter, customStart, customEnd)`** — reusable function in StatsScreen. Pass a pre-filtered (by type) entry list to get per-type time series. All time-bucket arrays share the same X-axis positions regardless of input entries.
- **StatsScreen `byType` toggle** — when ON, the chart Y-axis uses `typeMaxVal` (max across types), not `maxVal` (combined total). The `effectiveMax` variable switches between them. `py()` depends on `effectiveMax`, so define it after `effectiveMax`.
- **Calendar widget (DateRangePicker)** — uses explicit week rows (not `flexWrap`) to guarantee 7 cells per row. Range fill uses `left`/`right` absolute positioning: full width for mid-range cells, left-half for end cell, right-half for start cell. `DR_CELL = (SCREEN_W - 72) / 7` (20×2 overlay padding + 16×2 sheet padding = 72).
