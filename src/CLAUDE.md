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

### What's NOT built yet (do these next in order)
1. **Onboarding flow** — cold start problem, empty state for new users
2. **Tone audit** — verify all empty states, error messages, action labels are warm + playful
3. **Animation pass** — Log It Step 1→2 transition needs slide/expand animation
4. **Assets** — add `assets/icon.png` (1024×1024), `assets/splash.png`, `assets/adaptive-icon.png`
5. **Play Store prep** — app signing, store listing, screenshots

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
│   │   ├── WatchTower.jsx         ← stub — migrate from WatchedItApp.jsx
│   │   ├── WatchList.jsx          ← stub
│   │   ├── DetailView.jsx         ← stub
│   │   ├── LogItSearch.jsx        ← stub
│   │   ├── LogItDetails.jsx       ← stub
│   │   ├── SearchScreen.jsx       ← stub
│   │   ├── StatsScreen.jsx        ← stub
│   │   └── WatcherScreen.jsx      ← stub
│   ├── components/                ← Shared UI components (extracted from WatchedItApp.jsx)
│   │   ├── Poster.jsx             ← stub
│   │   ├── TypePill.jsx           ← stub
│   │   ├── StarRating.jsx         ← stub
│   │   ├── FilterSheet.jsx        ← stub (@gorhom/bottom-sheet)
│   │   ├── LogSeshSheet.jsx       ← stub (@gorhom/bottom-sheet)
│   │   ├── RatingSheet.jsx        ← stub (@gorhom/bottom-sheet)
│   │   ├── MiniCalendar.jsx       ← stub
│   │   └── BlockingPopup.jsx      ← stub
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
│       └── titleUtils.js
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
├── (tabs)                   Bottom tab navigator
│   ├── index (Watch Tower)
│   ├── watchlist
│   ├── [+ FAB]             Opens /logit/search as modal — not a real tab route
│   ├── search
│   └── watcher
├── logit/search             Modal (slide from bottom) — Log It Step 1
├── logit/details            Stack — Log It Step 2
├── detail/[id]              Stack — Detail view
└── stats                    Stack — Statistics
```

**Navigating to Detail View:**
```js
router.push(`/detail/${entry.id}`);
```

**Navigating to Log It Details from Search:**
```js
router.push({ pathname: '/logit/details', params: { resultJson: JSON.stringify(result) } });
```

**Edit mode in LogItDetails:**
```js
router.push({ pathname: '/logit/details', params: { entryId: entry.id, isEdit: 'true' } });
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

- **Log It is 2 steps:** Modal screen for search, full screen for details.
- **Filter & Sort:** Single consolidated bottom sheet triggered by one button.
- **Language input:** 10 quick-select chips + free text fallback.
- **Genre tags:** Inline "+ Add Tag" chip.
- **Star rating:** Tap left half = X.5, tap right half = X. Drag for speed. Haptic on each step.
- **Movie + Watching:** Blocked with 🍿 popup.
- **Rating required popup:** ⭐ blocks submit without rating on Watched status.
- **Currently Watching on home:** Horizontal scroll cards. Paused entries hidden by default.
- **Recently Watched on home:** Last 3 only.
- **Bookmark treatment:** Right-edge gradient border on cards.
- **Episode tracker:** Collapsed by default.
- **Ongoing shows:** "Mark as Finished" CTA always visible.
- **Logging a sesh on Watch Plan / Dropped:** Automatically transitions to Currently Watching.

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
- **Haptics** — use `expo-haptics` (`await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`) not `navigator.vibrate`.
- **Bottom sheets** — use `@gorhom/bottom-sheet`. Must be inside `GestureHandlerRootView` (already set up in `app/_layout.jsx`).
- **Fonts** — always use `T.fontDisplay`, `T.fontTitle`, etc. Never hardcode font family strings.
- **Design tokens** — import `T` from `src/constants/tokens.js`. Do not change colour/font/radius values.
- **Always enforce state transition rules** — see the table above.
- **Hooks rule** — never call useState/useEffect inside .map() or conditionals.
- **Always pass `url={entry.poster_url}` to `<Poster/>`** — omitting it silently falls back to initials.
- **`bySource` vs `combined`** — when a source filter chip is active, use `bySource[source]` not `combined`.
- **Edit mode in LogItDetails** — when `isEdit=true`, submit must call `updateEntry` (not `addEntry`) and must preserve `id`, `watch_sessions`, `episode_notes`.
- **Check the spec** (`WatchedIt_Spec_v1.3.md`) for product decisions before making assumptions.
- **Run `npx expo install --fix`** after changing package.json to validate dependency versions.
