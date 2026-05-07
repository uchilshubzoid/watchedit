# WatchedIt — Full Product Spec v1.5
*Last updated: May 2026. Stage 2 Expo native migration complete. Log It UX polish pass complete — keyboard sync, poster zoom, toast system, title language handling.*

---

## 0. Product Vision

**WatchedIt is your personal content manual.**

Every title you've watched, rated, and remembered — searchable, analysable, and finally yours. Built for the unashamed, high-volume, opinionated consumer of content who wants to own their taste data instead of leaving it locked inside streaming platforms that give you zero analytics.

**The value stack:**
| Layer | What it does |
|---|---|
| **Register** | Never forget what you've watched or what you thought of it |
| **Recall** | Searchable — "what anime did I love in 2024?" answered in seconds |
| **Recommendations** | Know exactly what to tell people when they ask |
| **Insights** | Understand your own taste — genres, languages, how much you watch |
| **Platform analytics** | Are you getting value from your subscriptions? |
| **Social** (Stage 4) | Share taste, discover through people you trust |

**Core philosophy:** Intentional capture. You chose to log it — that makes the rating and reaction meaningful. Tone is warm and slightly playful throughout.

---

## 1. Platform

**React Native + Expo. Android first.**

| Decision | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo | Cross-platform, React logic carries over, Expo handles native complexity |
| Primary platform | Android | Target audience is Android-first |
| Secondary platform | iOS | Polish after Android is solid |
| Distribution | Google Play Store (primary) · Apple App Store (secondary) | |
| Dev workflow | Expo Go for device preview | Scan QR, see changes instantly on physical device — no emulator needed |
| Routing | Expo Router | File-based native navigation with route files in `app/` |
| Local storage | AsyncStorage | Device-local prototype persistence until Supabase in Stage 3 |

**Current native architecture:**
- Expo Router is the app entry point (`"main": "expo-router/entry"`).
- Route files in `app/` are intentionally thin; screen logic lives in `src/screens/`.
- `app/_layout.jsx` owns font loading, splash hiding, `GestureHandlerRootView`, status bar, and stack presentation.
- `app/(tabs)/_layout.jsx` owns the bottom tabs and the central Log It FAB. The Log It search sheet is rendered as a React Native `Modal` from this layout (not a stack route) — `logitOpen` state controls it.
- `DeviceEventEmitter` is used for cross-component communication: `openLogIt` opens the search modal from anywhere; `dismissLogItSearch` causes the search modal to animate out (used by LogItDetails on submit).
- `src/utils/toastBridge.js` is a module-level singleton (`setPendingToast` / `consumePendingToast`) for passing toast data across navigation boundaries (LogItDetails → WatchTower).
- `src/screens/WatchedItApp.jsx` is read-only migration reference. Do not add new product work there.

**What changed vs the original web shell:**
- `div` → `View`, `p` → `Text`, `img` → `Image`
- CSS objects → `StyleSheet.create()`
- Browser navigation → Expo Router (`router.push`, `useLocalSearchParams`)
- `navigator.vibrate` → Expo Haptics (much better on Android)
- Bottom sheets → `@gorhom/bottom-sheet` (native feel)
- `localStorage` / `json-server` → AsyncStorage helper functions in `src/db/storage.js`

**What stays identical:**
- All product decisions and spec
- Component logic and state management
- Design tokens and visual language
- Data model
- API integration approach

---

## 1A. Current Build Status

### Complete
- Stage 1 React web shell is complete and kept only as reference.
- Stage 2 Expo native migration is complete.
- Expo Router route structure is in place.
- Core screens have native implementations in `src/screens/`.
- Shared UI components have native implementations in `src/components/`.
- MAL, TMDB, and OMDB search are wired through the unified search entry point.
- Local persistence is AsyncStorage-based.
- App assets are present in `assets/icon.png`, `assets/splash.png`, and `assets/adaptive-icon.png`.
- Deprecated Create React App files are archived in `archive/web-shell/`.

### Next Product Work
1. Onboarding flow for cold start and empty state.
2. Tone audit across empty states, errors, and action labels.
3. Release polish and Play Store prep.

### Do Not Use For New Work
- `src/screens/WatchedItApp.jsx` — migration reference only.
- `archive/web-shell/` — deprecated Stage 1 CRA shell, historical reference only.

---

## 2. Naming Conventions

| Term | Meaning |
|---|---|
| Log It | The action of recording a watch entry |
| WatchLog | The diary/history concept — your full record |
| WatchList | The list screen — all entries across all statuses |
| Watch Tower | The home screen |
| Watch Sesh / Log a Sesh | A single episode-watching session |
| Watch Deets | The history/timeline section in each detail view |
| Watch Plan | Entries with Plan to Watch status |
| Watcher | The profile screen |

---

## 3. Design System

### Brand Kit — Locked

| Element | Decision |
|---|---|
| Font display | Nunito 800w — headings, numbers, CTAs |
| Font titles | Nunito 600–700w — card titles |
| Font body | Nunito 400–500w — body, metadata |
| Font mono | Inconsolata — labels, stats, dates |
| Top bar CTA | Gradient pill amber→deep orange, tight dark shadow |
| App icon | Dark bg · amber border · Watched white · It amber · dot soft |

### Colours
| Token | Hex | Usage |
|---|---|---|
| BG Primary | #292826 | Page background |
| Surface | #333230 | Cards |
| Elevated | #3E3C39 | Inputs, chips, secondary elements |
| Accent Amber | #EF9F27 | CTAs, ratings, active states |
| Accent Deep Orange | #E8860A | Card titles, gradient end |
| Accent Soft | #FAC775 | Badges, dot, muted warm accents |
| Accent Warm | #C8854A | TV Show type pill |
| Text Primary | #F5F0E8 | Body text |
| Text Muted | #9E9B96 | Labels, dates, secondary info |
| Paused | #8BA3C4 | Paused badge — outside amber family |
| Dropped | #C47A7A | Dropped badge — outside amber family |

### Rules
- Dark mode only — no light mode
- Cards: 16px border radius · Buttons/pills: 22px border radius
- No harsh borders — elevation separates surfaces
- Amber sparingly: ratings, CTAs, active states only
- Matte surfaces — no glows or halos

### Bookmark treatment
Right edge gradient border on WatchList cards. Amber at top-right corner, fades down the right edge, transparent by 80% height.

---

## 4. Navigation

**Top bar:** Sticky. Centered gradient pill — *"WatchedIt •"* — opens Log It.

**Bottom nav (5 tabs):**
Watch Tower · WatchList · **+** (amber gradient circle, elevated, −20px lift) · Search · Watcher

**Expo Router route map:**
```
app/_layout.jsx              Root Stack
├── (tabs)                   Bottom tab navigator
│   ├── index.jsx            Watch Tower
│   ├── watchlist.jsx        WatchList
│   ├── plus.jsx             Placeholder route; FAB opens Log It modal
│   ├── search.jsx           Search
│   └── watcher.jsx          Watcher
├── logit/search.jsx         Log It Step 1 modal route
├── logit/details.jsx        Log It Step 2 stack route
├── detail/[id].jsx          Detail view
└── stats.jsx                Statistics
```

**Navigation calls:**
```js
router.push(`/detail/${entry.id}`);

router.push({
  pathname: '/logit/details',
  params: { resultJson: JSON.stringify(result) },
});

router.push({
  pathname: '/logit/details',
  params: { entryId: entry.id, isEdit: 'true' },
});
```

---

## 5. Screen: Watch Tower (Home)

### Stats Block
- "Last 30 days" badge — amber dot · muted mono label
- "Titles Watched" — large amber 80px number
- Watch time — `~Xh` with est. flag if estimated
- Category pills: Anime · Movie · TV Show with counts
- *"See your stats →"* → Statistics screen

### Unrated entries nudge
Shown between stats block and streak banner when flagged entry count > 0:
```
⭐ X watches without a rating — how did they land?  Rate them →
```
- Taps through to WatchList filtered for Watched + no rating
- Hidden when count = 0

### Streak banner
- Shown when streak ≥ 2 days, dismissible
- Rotates copy by streak length:
  - 2 days: "On a roll 🎬 2 days in a row"
  - 4 days: "4 days running 🔥 Remember to stretch"
  - 7 days: "A whole week! 🏆 Incredible dedication"
  - 14 days: "Two weeks straight 👀 We're not judging"

### Currently Watching
- Horizontal scroll, Paused entries hidden by default
- Card: type pill · title (2 lines fixed height) · episode line · last watched
- Episode line: `Ep 18 of 28` or `9 eps watched · Ongoing`
- Tap → Detail View (Currently Watching)

### Recently Watched
- Last 3 Watched entries
- Card: poster · title · type pill · date · rating · rewatch ↺ icon
- *"View all →"* → WatchList

### Success Toast
Shown after a successful Log It submission. Slides up from the bottom of the screen (8px above the tab bar) when WatchTower regains focus.
- Amber-bordered card, dark surface background, 10s auto-dismiss
- ✕ dismiss button pinned to top-right of the toast card
- Two lines: bold title (e.g. "🎬 Logged!" or "📋 Added to Watch Plan") + muted body (title + status)
- Implemented via `toastBridge.js` singleton — LogItDetails writes the pending toast before navigating back, WatchTower reads and clears it on `useFocusEffect`

---

## 6. Screen: WatchList

### Tabs
All · Watching · Watched · Watch Plan · Bookmarks

### Filters (consolidated bottom sheet)
Single "Filter & Sort" button opens bottom sheet containing:
- Sort: Most Recent (default) · Oldest · Highest Rated · A–Z
- Category: Anime · Movie · TV Show · Rewatched · Dropped
- Language: quick chips for common languages
- Completeness: Unrated (filters for Watched entries with no rating)
- Paused toggle — appears in Watching tab only

### Search
Real-time search within WatchList. Matches: title · genre · language

### Card
- Poster (or fallback avatar)
- Title in deep orange — truncated to one line
- Type pill · language
- Episode line (for Watching entries)
- Date label (Watched/Updated/Added) + date
- Rating — vertically centred right column, 18px amber
- Rewatch ↺ icon in title row if rewatched
- Paused / Dropped status tag — top right
- Bookmark — right edge gradient border (amber fading down)
- "Rate it" amber pill — shown on Watched cards with no rating when Unrated filter is active

### Empty states
Each tab has its own personality-led empty state message.

---

## 7. Screen: Log It

### Architecture
- **Step 1** — Native modal/bottom sheet: title search + quick actions
- **Step 2** — Full screen: collapsed metadata + status + rating + reaction
- **Success** — Full screen confirmation

### Step 1 — Search

Single text input, search on submit (not live). Sources: **MAL → TMDB → OMDB** in priority order.

After search:
- Source filter chips: All · MAL · TMDB · OMDB, each with result count
- Type filter chips: All · Movie · TV Show · Anime
- Search failures from any source do not block other sources
- Small notice appears when the unified search fails entirely
- Result info button opens a temporary preview modal with poster, metadata, source rating, genres, and an auto-close timer that can be paused by holding

**Result card layout:**
```
┌─────────────────────────────────────────┐
│ [Poster] Frieren: Beyond Journey's End  │
│          [MAL] Anime · 2023       ★9.0  │
│                                   ⓘ     │
│                                         │
│  [+ Watch Plan]        [WatchedIt →]    │
└─────────────────────────────────────────┘
```

**Title display:** English title preferred (`alternative_titles.en` from MAL). Falls back to romanised title. Respects user's title language preference from Watcher settings. The preferred display title is passed to Log It Step 2 as `displayTitle` — the original API title (e.g. Japanese) is preserved as `title` and always appears in the alternatives dropdown unchanged.

**`+ Watch Plan` CTA:**
- Instantly creates entry with `status: watchplan`, all available API metadata, `rating: null`, `logged_at: now`
- Card transforms inline to confirmation state — no navigation away from search screen:
```
✓ Added to Watch Plan   View →
```
- "View →" navigates to WatchList filtered to Watch Plan
- If title already in WatchLog → show current status, disable both CTAs with appropriate message ("Already Watched", "Already in Watch Plan" etc.)
- Duplicate detection currently uses normalized title matching in `searchTitles()` enrichment; source IDs should be used when available as the model matures

**`WatchedIt →` CTA:**
- Navigates to Step 2

**Rewatch detection:**
- Title already in log → card shows rewatch callout with `Log Rewatch` and `New Entry`
- Single result already in log → rewatch callout shown immediately, no tap needed
- Multiple results with one in log → tap to select, rewatch callout expands inline

**No results:**
*"Woah you've gone niche! 🎭 No results found online... add manually to log?"*
Manual entry → typed title persists to Step 2 with "Manual" tag

### Step 2 — Details

**Sticky top bar:** back arrow · title + tags (Manual / ↺ Rewatch) · poster thumbnail

#### Section A — Collapsed Metadata Card
Read-only by default. Displays:
```
[Title]
[Type] · [Language] · [X eps] · [Y min/ep] · [~Zh est.]
[Genre] · [Genre] · [Genre]
                                              ✏️ Edit
```
- Tap ✏️ Edit → all fields expand inline (same fields as previous Step 2)
- "Done" collapses fields back
- Title field always editable even in collapsed state (one-off language override)
- If API data incomplete → subtle amber note: *"Some details missing — tap Edit to complete"*

**Editable fields (expanded):**
1. Content type — Movie / TV Show / Anime pill selector
2. Language — 10 quick-select chips + "Other" free text fallback
3. Genre tags — inline "+ Add Tag" chip at end of tag row
4. Episodes — number input + Ongoing toggle (TV/Anime only)
5. Episode runtime — 24min / 45min / Custom presets (TV/Anime only)
6. Watch time — derived display below runtime: `24 min/ep × 28 eps = 11h 12m est.`

#### Section B — Watch Status
Three pills: **Watched** (default) · **Watching** · **Watch Plan**

State rules enforced:
- Movie → Watching pill hidden (only Watched and Watch Plan shown)
- Watch Plan selected → hide Sections C and D, show only Log It button

#### Section C — Episode Selector (Watching + TV/Anime only)
**Hybrid selector — both options always available:**
- `episodes ≤ 50` → visual grid shown by default + number input below it
- `episodes > 50` OR `ongoing: true` → number input only, no grid
- Number input label: *"Watched up to episode:"*
- Both inputs stay in sync — changing one updates the other
- On number input: everything up to that episode auto-marked watched in data model

#### Section D — Watch Date
```
WHEN DID YOU WATCH IT?
[ April 10, 2026 ▾ ]
```
- **Watched status:** Two date fields
  - "When did you start?" — optional, empty by default
  - "When did you finish?" — required, defaults to today
- **Watching status:** One date field
  - "When did you start?" — optional, defaults to today
- **Watch Plan:** Hidden — date captured as `created_at` automatically
- Native `<input type="date">` styled to design system
- Maps to `watch_start_date` and `watch_end_date` in data model
- Stored as ISO string

#### Section E — Rating + Reaction (Watched and Watching)
```
YOUR RATING                        Required
★ ★ ★ ★ ★ ★ ★ ★ ★ ★

"Rating later? Your verdict will mean more
 when you've slept on it."

                 continue without rating →
```
- Star rating: tap left half = X.5, tap right half = X, drag for speed, haptic on each step
- Micro-explanation shown only when rating is empty
- "continue without rating →" — small muted text link, not a button. Deliberate friction.
- On tap: entry logs as Watched with `rating: null`, `flagged: true`. Proceeds to success screen.
- For Watching status: label → "Rating So Far (Optional)". Hide "continue without rating" link. Show "Optional" hint.
- Reaction textarea — 500 chars, emoji supported
- *"This is yours forever. Future you will thank present you."* — shown below reaction when empty

#### Section F — Flags
- Recommend toggle
- Bookmark toggle

**Sticky bottom:** Log It ✓ amber gradient button

### Poster zoom modal
Tapping the poster thumbnail in the sticky header opens a full-screen modal. Supports:
- Pinch to zoom (1× to 6×, springs back to 1× if released below 1.05×)
- Drag to pan when zoomed in
- Close button top-right
- Implemented with `Gesture.Simultaneous(pinchGesture, panGesture)` inside a `GestureHandlerRootView` within the RN Modal

### Submission flow
On successful submit (non-edit):
1. `setPendingToast(...)` writes toast data to `toastBridge`
2. `DeviceEventEmitter.emit('dismissLogItSearch')` — search sheet animates out simultaneously
3. `router.back()` — details screen slides down (animation: `slide_from_bottom` reverse)
4. WatchTower gains focus, reads and displays the pending toast

### Blocking popups
- Movie + Watching → 🍿 *"Finish the movie first!"* · *"Lol faine, I'll finish it"* · *"Actually I'm done"* (flips to Watched)
- Submit without rating on Watched → ⭐ *"C'mon, you know what you felt"* · *"Okay okay, I'll rate it"*

### Inline errors
Validation errors appear directly below the relevant field.

---

## 7A. Rewatch Flow

**Entry points:** Log It search (detected) · Watched detail view CTA

**Flow:**
- Show data pre-populated, previous rating/reaction shown as muted reference
- User adds new rating + reaction OR selects "No change in rating"
- New entry created, linked to original via `parent_entry_id`
- Watch count and time both increment
- Rewatch ↺ icon appears on list card

---

## 7B. Flagged Entries (Unrated Watched)

Entries with `status: "watched"` and `rating: null` are flagged. Derived state — no new field needed.

**Three touch points nudge completion:**

**1. Watch Tower nudge** (between stats and streak banner):
```
⭐ X watches without a rating — how did they land?  Rate them →
```
Navigates to WatchList filtered for Watched + unrated.

**2. Stats screen callout** (below avg rating metric):
```
⚠️ X unrated entries excluded from avg rating   Complete them →
```
Same destination. Unrated entries are excluded from all rating calculations.

**3. WatchList "Rate it" pill** — shown on each flagged card when Unrated filter is active. Opens Mini Rating Sheet.

---

## 7C. Mini Rating Sheet

Reusable bottom sheet component. Sits at ~55% screen height. Background dimmed to `rgba(0,0,0,0.4)` — detail view content visible behind.

```
────────────────  (drag handle)

How did [Title] land?

★ ★ ★ ★ ★ ★ ★ ★ ★ ★
8.5 / 10

Add a reaction? (optional)
┌─────────────────────────────┐
│ Your thoughts...        500 │
└─────────────────────────────┘

        [  Save Rating  ]
```

- Star rating identical to Log It (tap + drag + haptic)
- Reaction optional, 500 chars
- Save → `updateEntry({...entry, rating, reaction})`, closes sheet, refreshes parent
- Dismiss by tapping background or dragging down

**Mounted in two places:**
1. **Detail View** — when `status === "watched" && !rating`. Persistent amber CTA inside "What I Thought" card: *"You haven't rated this yet — how did it land? ★"*
2. **WatchList** — "Rate it" pill on flagged cards when Unrated filter active

---

## 8. Screen: Detail View — Watched

### Hero card
Poster · Title · Type · Language · Watch time · Genre tags
Top actions: Rewatch · Edit · Unwatch
Unwatch → confirmation bottom sheet

### When I Watched It
Date range if both dates captured: `Mar 15, 2026 – Apr 10, 2026`
Single date if only end date: `Apr 10, 2026`

### What I Thought
Your rating (amber 48px) · Global ratings per source · Reaction text · Watched / Recommended / Bookmarked badges
If unrated: amber CTA — *"You haven't rated this yet — how did it land? ★"* → opens Mini Rating Sheet

### Watch Deets
Timeline most recent first:
📌 Added to Watch Plan · ▶️ Started Watching · 🎬 Log a Sesh · ✅ Finished · 🔁 Rewatch logged

---

## 9. Screen: Detail View — Currently Watching

Same as Watched with differences:

### Hero card additions
**Log a Sesh** · **Mark All Watched** — prominent CTAs inside hero card

### When I Watched It
Date range: start → last sesh. Last watched date.

### What I Thought
Rating optional (in-progress).

### Episode Tracker
Progress bar (hidden for Ongoing) · X of Y episodes · % complete
Episode list — three visual states: ✅ Watched (amber) · ⬜ Up next (amber border) · ⬜ Unwatched

---

## 10. Screen: Detail View — Dropped

### Hero card
Red callout showing drop date + *"Changed your mind? Pick it back up."*
**Continue Watching** CTA — opens confirm modal, logs resumed date in Watch Deets as ▶️ Resumed

### Watch Deets
Includes ✕ Dropped entry with date. ▶️ Resumed added when user continues.

---

## 11. Screen: Detail View — Watch Plan

### Hero card
Poster · title · type · language · watch time (estimated total) · genre tags
Primary CTA: **Mark as Watched** → opens Log It Step 2 prefilled

### Added On
Created date. "Not counted in stats until watched" note.

### What Others Think
Global ratings from linked sources.

### Watch Deets
📌 Added to Watch Plan — date. Nothing else until upgraded.

---

## 12. Screen: Search

Real-time search across WatchList entries.
Matches: title · genre · language · type.
Same card style as WatchList.

---

## 13. Screen: Statistics

**Entry:** *"See your stats →"* on Watch Tower

### Time filters
Last 7 Days · Last 30 Days · Last 90 Days · All Time · Custom (date range picker)

### View toggle
Summary · Timeline

### Summary view
- Titles watched in period
- Watch time — toggle between hours and days (`312h` ↔ `13 days`)
- Category breakdown with per-category avg ratings
- Average rating given (excludes unrated entries)
- Longest watch streak
- "Your hardest-rated genre: [Genre] (avg X.X ★)" callout
- Unrated entries callout when flagged count > 0: *"X unrated entries excluded from avg rating — Complete them →"*
- vs Previous Period comparison (same duration, previous period)

### Timeline view
- Dual metric toggle: Titles · Hours
- Compare toggle: shows previous period bars in grey behind current — disabled by default
- Granularity: ≤30 days = daily · >30 days = monthly
- **Always uses `watch_end_date` for attribution** — entry appears on the day it was finished, not the day it was logged
- Entry only appears in a time window if `watch_end_date` falls within it
- Muted note below chart: *"Shows appear on the date you finished them"*
- Horizontal scroll for wide date ranges

### Genre distribution
Radar/spider chart showing genre spread across watched entries.

### Breakdown list
Category breakdown expandable by category → titles → tap goes to detail view.

### Sharing (Future)
*"📤 Share your stats with friends — coming when we build the friends module"*

---

## 14. Screen: Watcher (Profile)

- Avatar: initials in amber circle
- Name, email — inline edit
- Quick stats strip: Watched · Hours · Avg Rating

### My Recommendations
Entries where recommend = true. "View all →" CTA.

### Manage
- Manage Tags & Categories — view all genre tags, add/remove. Primary entry point for tag management (secondary entry point is inline in Log It).
- App Preferences

### Title Language Preference
```
TITLE LANGUAGE
[ English ]  [ Romanised ]  [ Japanese ]
```
- Stored in AsyncStorage via `getTitleLanguagePref()` / `setTitleLanguagePref()`
- Storage key: `watchedit_title_language_pref`
- Default: English
- Applies to all MAL-sourced title display throughout the app
- `getPreferredTitle(malResult, pref)` utility:
  - English → `alternative_titles.en` || `title`
  - Japanese → `alternative_titles.ja` || `title`
  - Romanised → `title`

### Data & Connections (Stage 3 — locked)
- Connect MyAnimeList — import anime history + sync
- Import Netflix History — upload CSV
- Review to Log Queue — review auto-detected watches
- Export My Data — download full WatchLog as JSON or CSV

### Log Out
Confirmation bottom sheet: *"Log out?"* · Stay / Log Out

---

## 15. Watch Status Model

| Status | Description | Counts in stats? |
|---|---|---|
| Watched | Completed | Yes |
| Currently Watching | In progress | No (until finished) |
| Paused | Sub-state of Watching — on hold | No |
| Dropped | Abandoned — rating mandatory on drop | Yes |
| Watch Plan | Not started | No |

### State transition rules
| From | Allowed transitions |
|---|---|
| Watch Plan | → Watched · → Watching (TV/Anime only) · → Delete |
| Currently Watching | → Watched · → Paused · → Dropped (rating mandatory) |
| Paused | → Watching (resume, logs resume date) · → Dropped · → Watched |
| Dropped | → Watching (Continue Watching CTA, logs resume date) · → Watched |
| Watched | → Rewatch (new linked entry) · → Unwatch (delete, confirmation required) |

**Movies:** Watch Plan → Watched only. Watching blocked with 🍿 popup. No episode tracking.

**Ongoing shows:** No fixed episode total. Shows `X eps watched · Ongoing`. No progress bar.

**Auto-complete:** Last episode marked → mandatory rating prompt → auto-upgrades to Watched.

---

## 16. Poster Fallback

Two letters: first char of word 1 + first char of word 2. Single-word = first two chars.
Amber gradient background · dark text. User-editable, max 10 chars. Persists per entry.

---

## 17. Data Model

### Current persisted Entry object
The current Expo build stores entries in AsyncStorage under `watchedit_entries`. Field names still reflect the migrated Stage 1 shape; do not silently rename them without a migration.

```js
{
  id,                  // string, usually Date.now().toString()
  title,               // string
  type,                // "Movie" | "TV Show" | "Anime"
  lang,                // string
  rating,              // number | null, 0.5–10
  reaction,            // string | null
  recommend,           // boolean
  bookmark,            // boolean
  date,                // short display date, e.g. "Apr 10"
  status,              // "watched" | "watching" | "watchplan"
  ep,                  // current watched episode number | null
  total,               // total episode count | null
  ongoing,             // boolean
  paused,              // boolean
  dropped,             // boolean
  rewatch,             // boolean
  finishedDate,        // display date | null
  lastWatchedDate,     // display date | null
  watchTime,           // string | null, e.g. "~7h 12m"
  estimated,           // boolean
  genre,               // string[]
  poster_url,          // string | null
  malRating,           // number | null
  watch_sessions,      // WatchSession[]
  episode_notes,       // { [epNumber]: string } | undefined
  watch_start_date,    // ISO string | null
  watch_end_date,      // ISO string | null
  logged_at,           // ISO string
  malId,               // number | null, when available
  tmdbId,              // number | null, when available
  imdbID,              // string | null, when available
}
```

### Target canonical Entry object
This remains the preferred longer-term shape for a Supabase-backed Stage 3 migration. Until then, map carefully between current names (`type`, `status`, `genre`, `total`, `ongoing`, `watchTime`) and canonical names (`content_type`, `watch_status`, `genre_tags`, `episode_count`, `is_ongoing`, `watch_time_mins`).

| Field | Type | Notes |
|---|---|---|
| id | string | `Date.now().toString()` in local DB |
| parent_entry_id | string / null | Links rewatch to original |
| is_rewatch | boolean | |
| title | string | User's preferred display title — may differ from API title |
| content_type | enum | Movie / TV Show / Anime |
| language | string | |
| genre_tags | string[] | |
| linked_sources | object[] | {source, url, global_rating} — MAL / TMDB / OMDB |
| mal_id | number / null | MAL entry ID — used for duplicate detection |
| tmdb_id | number / null | TMDB entry ID |
| poster_url | string / null | |
| poster_fallback_text | string / null | Max 10 chars |
| watch_status | enum | Watched / Watching / Paused / Dropped / Watch Plan |
| logged_at | date | System field — when entry was created in WatchedIt. Never editable. |
| created_at | date | Same as logged_at on first creation |
| watch_start_date | date / null | User-entered. Displayed in detail view. |
| watch_end_date | date / null | User-entered for Watched. Used for stats attribution. |
| episode_count | number / null | |
| episode_runtime_mins | number / null | |
| is_ongoing | boolean | |
| episodes | object[] | {ep_number, watched, notes} |
| watch_sessions | object[] | {ep_from, ep_to, date} |
| watch_time_mins | number / null | |
| watch_time_estimated | boolean | |
| rating | number / null | 1–10 in 0.5 steps. Null = not yet rated. |
| reaction | string / null | 500 chars |
| recommend | boolean | |
| bookmark | boolean | |

### Derived states (not stored)
- Flagged = `status === "watched" && rating === null`
- Total watched = count of Watched + Dropped entries
- Total watch time = current build parses/sums `watchTime`; canonical model should use `watch_time_mins`
- Category counts = grouped by `type` in the current build; canonical model should use `content_type`
- Watch streak = consecutive days with a Watch Sesh or Watched entry
- Avg rating = mean of all rated Watched entries (excludes flagged)

---

## 18. Watch Time Calculation

| Type | Method |
|---|---|
| Movie | Fetched runtime (exact). If unavailable → optional manual input. If skipped → shown as "—" |
| TV Show | Fetched ep runtime × eps watched. Fallback: 45 min default |
| Anime | Fetched ep runtime × eps watched. Fallback: 24 min default |

Est. flag (`~`) shown wherever estimated. Derivation shown in Log It: `X min/ep × Y eps = Zh Wm est.`
User can override per entry via presets or custom input.

---

## 19. Stats Date & Attribution Model

### Date fields
| Field | Set by | Editable? | Purpose |
|---|---|---|---|
| `logged_at` | System (`Date.now()`) | Never | Audit trail — when user opened the app to log |
| `watch_start_date` | User (optional) | Yes | Display in detail view — "started watching" |
| `watch_end_date` | User (defaults to today) | Yes | Stats attribution — when show was finished |

### Stats timeline attribution
- **Always uses `watch_end_date`** — entry appears on the day it was finished, not logged
- Entry only appears in a time window if `watch_end_date` falls within that window
- `watch_start_date` is display-only — shown as date range in detail view, never used in stats calculations
- Watch time is attributed entirely to `watch_end_date` — no spreading across date range

### Rationale
Retroactive entries for multi-episode shows cannot be accurately spread across a date range from memory. Attributing to completion date is the most honest single data point available. The MAL OAuth import in Stage 3 will provide more granular historical data where available.

### Currently Watching sessions
Watch Sesh entries each have their own date — attributed to the session date, not completion date. This provides accurate granular data for active watching.

### Watch Plan entries
Not counted in stats at all. Current build uses `logged_at`/`date`; canonical model may add `created_at` during the Stage 3 data migration.

---

## 20. Status & History Logic

| Event | Counted in stats? | Date logged? |
|---|---|---|
| Added to Watch Plan (quick) | No | Yes — `logged_at` |
| Moved to Watching | No | Yes — `watch_start_date` |
| Log a Sesh | No | Yes — session date |
| Marked Watched | Yes | Yes — `watch_end_date` (user-entered, defaults to today) |
| Dropped | Yes | Yes — `watch_end_date` |
| Rewatch logged | Yes (+1) | Yes — new entry with own `watch_end_date` |
| Resumed from Dropped | No | Yes — resume date logged in Watch Deets |

---

## 21. API Stack

| Data needed | API | Cost | Notes |
|---|---|---|---|
| Anime search + data | MAL official API | Free | Client ID registration. Web app type. |
| Movie + TV search + data | TMDB | Free | API key required |
| IMDB ratings | OMDB API | Free (1000 req/day) | Unofficial IMDB proxy |

**Search priority in Log It:** MAL → TMDB → OMDB

**Unified search entry point:**
- `src/api/index.js` exports `searchTitles(query, entries)`.
- Runs MAL, TMDB movies, TMDB TV, and OMDB in parallel via `Promise.allSettled`.
- Returns `{ combined, bySource }`.
- `combined` is deduplicated by case-insensitive title, with source priority MAL → TMDB → OMDB, then relevance-sorted.
- `bySource` preserves per-source result lists for source filter chips.
- Result cards should use `bySource[source]` when a source chip is active, not `combined`.

**MAL field mapping:**
| MAL field | Maps to | Notes |
|---|---|---|
| `title` | `title` (romanised fallback) | |
| `alternative_titles.en` | Preferred English title | Used when pref = "en" |
| `alternative_titles.ja` | Japanese title | Used when pref = "ja" |
| `mean` | `global_rating` / `malRating` | Null if insufficient ratings |
| `num_episodes` | `episode_count` / `total` | 0 = unknown/ongoing → store as null |
| `average_episode_duration` | `episode_runtime_mins` / `epRuntime` | In seconds → divide by 60 |
| `status` | `is_ongoing` / `ongoing` | `currently_airing` → true |
| `main_picture.medium` | `poster_url` | |
| `genres[].name` | `genre_tags` / `genre` | |
| `start_season.year` | `year` | |

**API key security:** Stage 2 keys are client-side via `EXPO_PUBLIC_` env vars for prototyping. Stage 3 routes all API calls through Supabase Edge Functions so keys are not exposed in production.

---

## 22. Local Persistence (Stage 2)

The current native prototype uses AsyncStorage, not `json-server`.

**Storage helper:** `src/db/storage.js`

```js
await getEntries();
await addEntry(entry);
await updateEntry(updated);
await deleteEntry(id);
await getEntry(id);
await clearEntries();
await getTitleLanguagePref();
await setTitleLanguagePref(pref);
```

**AsyncStorage keys:**
- `watchedit_entries` — array of persisted entries
- `watchedit_title_language_pref` — `"en"` | `"ja"` | `"romanised"`; default `"en"`

All storage calls are async. Always `await` them.

---

## 23. Data Import & Sync (Stage 3)

### MAL OAuth
- User connects MAL account from Watcher screen
- One-time import of full MAL watch history into WatchedIt
- Ongoing: new MAL completions surfaced in Review to Log queue
- MAL provides actual completion dates — improves stats accuracy for imported history

### Netflix CSV import
- Netflix → Account Settings → Download watch history (CSV)
- User uploads CSV to WatchedIt
- Titles matched against TMDB, unmatched flagged for manual review
- Batch surfaced in Review to Log queue

### Review to Log queue
- Inbox of auto-detected or imported watches awaiting user review
- Each item: title · type · date watched · global rating for reference
- Actions: Log it (add rating/reaction → confirmed) · Skip · Snooze
- Lives in Watcher screen with badge count
- Nothing auto-logs without user sign-off — intentional capture preserved

### YouTube Takeout (Stage 4)
- Google Takeout exports YouTube watch history as JSON
- Parse and match movie/show content against TMDB
- Surface in Review to Log queue

---

## 24. Share Extension (Backlog)

Native iOS/Android share sheet integration.

**With share extension:**
Watching something → hit share → tap WatchedIt → title auto-filled → TMDB auto-searched → Log It Step 2 pre-filled → rate → done = ~3 steps

**Platform support:**
- Android: Intent filters — registers WatchedIt as share target
- iOS: Share Extension target in Xcode

---

## 25. Future Channels (Stage 4)

### Home screen widget
Glanceable: currently watching + quick log button.
Android: Jetpack Glance / Expo Widgets · iOS: WidgetKit

### WatchedIt channel / web detection
Detects content being watched across streaming platforms. Sends to Review to Log queue. Mobile-first.

### Subscription analytics
Track content consumed per platform vs subscription cost. "Is my Netflix worth it this month?"

---

## 26. Build Stages

| Stage | Scope | Status |
|---|---|---|
| **1** | React web UI shell. All screens. Dummy data. No backend, no APIs. | ✅ Complete |
| **2** | React Native + Expo migration. Android-first app shell. Expo Router. AsyncStorage persistence. MAL + TMDB + OMDB search. Revised Log It flow. Core screens/components migrated from web reference. | ✅ Complete |
| **2.1** | Onboarding flow, tone audit, Log It Step 1→2 animation pass, release polish, Play Store prep. | 🔄 Next |
| **3** | Google Auth + Supabase. MAL OAuth import. Netflix CSV import. Review to Log queue. API keys server-side. Export module. | 🔲 |
| **4** | Social/friends. Share extension. Shareable stats card. Home screen widget. WatchedIt channel. Subscription analytics. YouTube Takeout. iOS polish. | 🔲 |

---

## 27. Spec Change Log

| Version | Changes |
|---|---|
| 1.0 | Initial spec |
| 1.1 | Added rewatch, dropped, paused, ongoing, watch time, stats screen, naming conventions |
| 1.2 | Platform → React Native + Expo. API stack locked (MAL + TMDB + OMDB). Share extension Stage 2. Data import strategy. Stage 4 channels. Design system locked. Product vision added. |
| 1.3 | Revised Log It flow: two CTAs on search cards (+ Watch Plan instant add, WatchedIt →), collapsed metadata card with inline edit, hybrid episode selector, watch date fields (start + end), "continue without rating" secondary path. Flagged entries system (unrated watched). Mini Rating Sheet component. Title language preference in Watcher (EN/JP/Romanised). MAL field mapping table. Stats date attribution model (always watch_end_date, no spreading). json-server local DB documented. State transition rules table. Recently Watched reduced to 3. Watch Tower unrated nudge. "Log a Sesh" rename. |
| 1.4 | Updated project status to Stage 2 native migration complete. Documented Expo Router route map, AsyncStorage persistence, current `searchTitles()` return shape, current persisted entry shape, and moved share extension/shareable stats out of completed Stage 2 scope. |
| 1.5 | Log It UX polish pass. LogItSearch renders as RN Modal (not stack route) from tab layout; `logitOpen` state + `DeviceEventEmitter` control open/close. Keyboard lifts the sheet via plain `useState` `kbHeight` (no Animated driver conflict); keyboard and sheet now rise simultaneously. Poster zoom modal: pinch + pan gestures via `react-native-gesture-handler` inside `GestureHandlerRootView`. Bookmark flag uses Ionicons mono/dual-tone icon. Star rating haptics use `impactAsync(Light)` for Android reliability; PanResponder captures gesture before parent ScrollView. Title language: `displayTitle` passed separately so original title (e.g. Japanese) is preserved in the alternatives dropdown. Submit flow: `toastBridge` singleton passes toast data to WatchTower across navigation; `dismissLogItSearch` event closes search modal concurrently with `router.back()`; `presentation: 'modal'` removed from `logit/details` so back gesture slides the screen down correctly. Watch Tower success toast: 10s auto-dismiss, ✕ dismiss button at top-right, positioned 8px above tab bar. |
