# WatchedIt — Full Product Spec v2.15
*Last updated: Jun 2026. Stage 2 Expo native migration complete. Log It UX polish complete. Stats Screen full redesign complete. Onboarding flow complete. WatchTower empty state complete. UX polish pass complete. Stats/WatchTower card polish, InsightsWidget, episode tracker fix, ratingSource fix. Active days, sub-copy readability pass, tap target pass, Recommendations screen, WatcherScreen name persist, LogIt start date for Watched. WatchList filter enhancements (Rating slider, Watch Date, Platform), LogIt platform field, DetailView platform display, Watcher screen overhaul, Manage Tags & Categories screen, custom categories system. EAS build config, final app assets, Play Store account setup. API keys in EAS preview env, eas.json git-ignored, Play Store submission imminent. Fredoka font system (fontFun token), WatchList date bug fix, TypePill on WatchList cards, ongoing shows null fix, WatchTower "View all" CTA on Currently Watching, splash resizeMode contain, WatchList swipe navigation + animation, LogIt sheet bottom padding, FilterSheet font/spacing/toggle polish. Search screen web mode (dual-mode search: WatchLog + web API), nav icon refresh (castle/script/telescope). API timeouts, Episodes card, Log It polish, icon system. WatchList selection mode. Single title share. DetailView hero action icons. Multi-title HTML export. JSON/CSV export. WatchedIt backup import. WatcherScreen Data & Connections live. 4-screen onboarding redesign (about screen, drive-success screen, 4 progress dots). Google Drive sync UI + real Google OAuth wired (native Google Sign-In, drive.appdata scope).*

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
1. Screen transition polish and UX pass.
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
| Font body | Nunito 400–500w — body, metadata, text inputs |
| Font mono | Inconsolata — labels, stats, dates |
| Font fun | Fredoka 400w — subtexts, labels, secondary copy, hints |
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

**Tab bar icons (MaterialCommunityIcons unless noted):**
| Tab | Icon | State |
|---|---|---|
| Watch Tower | `castle` | color: amber (focused) / muted (unfocused) |
| Watch List | `script-text` / `script-text-outline` | filled when focused |
| Search | `telescope` | color: amber (focused) / muted (unfocused) |
| Watcher | `person` / `person-outline` (Ionicons) | filled when focused |

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

## 4A. Onboarding Flow

Shown on first launch (when `watchedit_onboarding_done` is not set). A 4-screen stack in `app/onboarding/`. The root layout performs a **two-phase bootstrap**: fonts load → AsyncStorage check → navigate if needed → hide splash. This keeps the splash visible through the redirect so there is no flash of the wrong screen.

Progress dots (4 total) shown at top of each screen.

### Screen 1 — Watcher Name (`app/onboarding/index.jsx`)
```
BEFORE WE BEGIN —

        Every WatchLog
        needs a name.

WATCHER NAME
┌────────────────────────────────────────────────┐
│  e.g. Alex, Shubh, MovieNerd...               │
└────────────────────────────────────────────────┘

              [ Yep, that's me → ]
```
- TextInput auto-focused on mount (120ms delay)
- Amber border when focused, amber CTA disabled until at least 1 char
- On submit: saves `watchedit_watcher_name`, routes to `/onboarding/about`

### Screen 2 — About WatchedIt (`app/onboarding/about.jsx`)
```
← (back)     ●  ○  ○  ○   (dot 1 done, dot 2 active)

THANKS FOR DOWNLOADING!

  WatchedIt is your personal log for every show, film,
  and anime you've watched.

┌─────────────────────────────────────┐
│  ⊕  Log It                         │
│     TMDB  MyAnimeList  OMDB         │
│     Add any title... [pills]        │
├─────────────────────────────────────┤
│  ≡  Review Stats                   │
│     See your genre obsessions...    │
├─────────────────────────────────────┤
│  ◇  Remember It                    │
│     No more "wait, did I watch..."  │
└─────────────────────────────────────┘

   [ Let's set up my WatchLog → ]
```
- 3 feature cards with Ionicons + title + body text + source pills on Log It card
- `WatchedIt` in sub-copy rendered in amber (`subBrand` style — brand first mention)
- CTA routes to `/onboarding/auth`

### Screen 3 — Auth Choice (`app/onboarding/auth.jsx`)
```
← (back)     ●  ●  ○  ○

        Where should your WatchLog live?

┌─────────────────────────────────────────────┐
│ ☁  Google Drive              RECOMMENDED   │  ← amber border
│    Backed up automatically. Safe across     │
│    all your devices.                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│    Phone only                               │  ← dimmed
│    Stays on this device. Works offline.     │
└─────────────────────────────────────────────┘
```
- Google Drive card: amber border + "Recommended" amber pill badge
- Phone Only card: dimmed opacity when Drive auth is in progress
- Tapping Drive: `driveLoading = true`, calls `signInWithGoogle()` (native Google Sign-In helper)
- Loading state: spinner replaces Drive icon + "Connecting…" copy inside the card
- On OAuth success: saves `watchedit_auth_mode: 'google'`, `watchedit_drive_account`, `watchedit_drive_token`, `watchedit_last_sync`; navigates to `/onboarding/drive-success` with `email` param
- On OAuth failure/cancel: `driveLoading = false`, inline error text shown below Drive card
- Tapping Phone Only: saves `watchedit_auth_mode: 'guest'`, routes to `/onboarding/guest`

### Screen 4a — Guest Callout (`app/onboarding/guest.jsx`)
```
← (back)     ●  ●  ●  ●  (dots complete)

Hey Shubh,
your WatchLog stays on this device.

┌─────────────────────────────────────────────┐
│ ⚠  If you uninstall the app, your WatchLog │
│    goes with it. There's no recovery.       │  ← T.dropped red tint
└─────────────────────────────────────────────┘

✓  Everything works right now.
↺  You can link Drive later from Watcher.

           [ Got it, let's go → ]

    ← Actually, let me connect Drive instead
```
- Name read from AsyncStorage (no inline editing)
- Red warning box: `T.dropped` tint + `warning-outline` Ionicon
- Two info rows: `checkmark-circle-outline` and `sync-outline` Ionicons
- Ghost back link calls `router.back()` (returns to auth screen)
- CTA sets `watchedit_onboarding_done: 'true'`, `router.replace('/(tabs)')`

### Screen 4b — Drive Success (`app/onboarding/drive-success.jsx`)
```
             ●  ●  ●  ●  (no back button)

     ✓ Google Drive linked

     ┌─ ☁ your.email@gmail.com ─┐

     Your WatchLog will back up automatically.
     You can manage this from the Watcher screen.

     Wrong account?  ← taps to re-auth

            [ Let's go → ]
```
- `email` read from `useLocalSearchParams()`; shown in Drive pill
- "Wrong account?" clears Drive AsyncStorage keys, signs out the native Google session, then opens the account picker again
- Final CTA saves all Drive keys + sets `watchedit_onboarding_done: 'true'`, `router.replace('/(tabs)')`

### AsyncStorage keys set by onboarding
| Key | Value | Set by |
|---|---|---|
| `watchedit_watcher_name` | string | Screen 1 on continue |
| `watchedit_auth_mode` | `'guest'` or `'google'` | Screen 3 (Guest CTA or Drive OAuth success) |
| `watchedit_onboarding_done` | `'true'` | Screen 4a (guest) or Screen 4b (drive-success) CTA |
| `watchedit_drive_account` | email string | Screen 3 on Drive OAuth success + Screen 4b |
| `watchedit_drive_token` | access token string | Screen 3 on Drive OAuth success + Screen 4b |
| `watchedit_last_sync` | ISO date string | Screen 3 on Drive OAuth success + Screen 4b |

---

## 5. Screen: Watch Tower (Home)

### Stats Block
- "Last 30 days" badge — amber dot · muted mono label
- "Titles Watched" — large amber 80px number. Includes all `watched` entries, `dropped` entries, and `watching` entries whose `lastWatchedDate` falls within the period (i.e. a Watch Sesh was logged in that window). Falls back to "All time" label and counts when no entries qualify for the last 30 days.
- Attribution priority for date filtering: `watch_end_date` → `finishedDate` / `lastWatchedDate` → `date`. `logged_at` is never used for stats attribution.
- Watch time — `~Xh` with est. flag if estimated. Sums `watchTime` across the same title pool.
- Category pills: Anime · Movie · TV Show with counts derived from the same pool
- *"See your stats →"* → Statistics screen

### Unrated entries nudge
Shown between stats block and streak banner when flagged entry count > 0:
```
⭐ X watches without a rating — how did they land?  Rate them →
```
- Taps through to WatchList filtered for Watched + no rating
- Hidden when count = 0

### Active days banner
- Shown when `activeDays > 0`, not dismissible
- Displays count of unique calendar days with logged content in the active time window (last 30 days when recent entries exist, all time otherwise)
- Copy: "📅 X active days · [last 30 days / all time] · days you logged content"
- Computed via `getActivityDate(e)` across the stats pool — same attribution rules as the stats block
- Streaks (consecutive-day calculation) are deferred to a future enhancement

### Currently Watching
- Horizontal scroll, Paused entries hidden by default
- Card: type pill · title (2 lines fixed height) · episode line · last watched
- Episode line: `Ep 18 of 28` or `9 eps watched · Ongoing`
- Tap → Detail View (Currently Watching)

### Recently Watched
- Last 3 Watched entries
- Card: poster · title · type pill · date · rating · rewatch ↺ icon
- *"View all →"* → WatchList

### Empty state — Welcome Card
Shown when `entries.length === 0`. The stats card is hidden. Replaced by:

**Welcome card** (amber-tinted, `rgba(239,159,39,0.06)` bg + `rgba(239,159,39,0.2)` border):
- 🎬 emoji
- Headline: "Your WatchLog awaits."
- Sub: "Log everything you watch — movies, anime, TV shows. Rate it, react to it, make it yours."
- Primary CTA: "Log your first watch →" — amber gradient, emits `openLogIt`
- Secondary CTA: "Save to Watch Plan" — outline, emits `openLogIt` (user selects status in Step 2)
- Ghost link: "How does this work? →" — opens GuidedCarousel modal

**Hint strip** (below welcome card):
📋 "Not done watching something? Watch Plan saves it for later."

### GuidedCarousel
Full-screen RN Modal opened from the welcome card ghost link. 3 slides:
1. **Log It** — real WatchedIt logo pill + real amber FAB (entry point UI), plus a mocked search results card with 3 rows and source label. Title: "Search, Rate, Logged."
2. **WatchLog** — WatchList mockup with "All" tab chip active and 3 mixed-status entries (Watched/Watching/Watch Plan) with color-coded status badges. Title: "Your Watch List remembers all."
3. **Stats** — stats card with large amber number, period pill, category pills, and *"See your stats →"* as muted underlined text (matches real WatchTower `statsLink` style). Title: "Know your Watch Stats."

Controls: **swipe-only** navigation (horizontal ScrollView, `scrollEnabled`, `onMomentumScrollEnd` tracks page). No Next button. "Let's log something →" CTA only on last slide (closes modal, emits `openLogIt`). "swipe to explore →" mono hint on non-last slides. Dot indicators (active dot 20px wide). ✕ close button top-right. Resets to slide 0 on open.

### Success Toast
Shown after a successful Log It submission. Slides up from the bottom of the screen (8px above the tab bar) when WatchTower regains focus.
- Amber-bordered card, dark surface background, 10s auto-dismiss
- ✕ dismiss button pinned to top-right of the toast card
- Two or three lines: bold title + muted body + optional muted mono `sub` line
- Standard toast: title = "🎬 Logged!" or "📋 Added to Watch Plan", body = entry title + status
- **First-log toast** (when `isFirstLog: true`): title = "🎬 WatchLog started!", body = entry title + status, sub = "Entry #1. Many more await."
- Implemented via `toastBridge.js` singleton — LogItDetails writes the pending toast before navigating back, WatchTower reads and clears it on `useFocusEffect`

---

## 6. Screen: WatchList

### Tabs
All · Watching · Watched · Watch Plan · Bookmarks

### Filters (consolidated bottom sheet)
Single "Filter & Sort" button opens bottom sheet containing:
- **Sort:** Most Recent (default) · Oldest · Highest Rated · A–Z
- **Category:** Anime · Movie · TV Show · Rewatched · Dropped
- **Rating:** Two-sided slider, 0–10, integer steps. Built from scratch with `PanResponder` + `stateRef` pattern (no external library). Amber fill between thumbs. Reset link clears range. Active pill shows `★ 3–8`.
- **Watch Date:** Filter by watch end date (Watched and Currently Watching entries only; Watch Plan / Bookmark entries pass through unfiltered). Start/end date pickers use inline `MiniCalendar` toggled by tapping From/To fields. Preset chips: Last 7 days · Last 30 days · Clear. Active pill shows `May 1 – May 30`. Min prop on MiniCalendar blocks selecting end date earlier than start date.
- **Platform:** Where the title was watched. Chips: Netflix · Crunchyroll · Amazon Prime · Hotstar · Apple TV · Theater · Others. "Others" maps to any custom-named platform (i.e. `watch_platform` is truthy and not in the known list). Single-select.
- **Language:** quick chips for common languages
- **Genre:** tag filter
- **Paused toggle** — appears in Watching tab only

### WatchTower → WatchList navigation
Tapping a content type segment (Anime / Movie / TV Show) or its label on Watch Tower navigates to WatchList pre-filtered for that type and the last 30 days. Implemented via `router.push` with `params: { type, datePreset: 'last30' }`. WatchList's `useFocusEffect` reads `datePreset` on every focus — `'last30'` computes and applies the ISO date range; any other value clears it.

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

### Tab strip
Rendered as a horizontal `ScrollView` (not `FlatList`) with `flexShrink: 0` to prevent Android height-measurement gaps between the tab row and the filter chips line below it.

### Empty states
Each tab has its own personality-led empty state message with a flat/mono Ionicons icon:
- All: `file-tray-outline`
- Watching: `play-circle-outline`
- Watched: `close-circle-outline` (cross, not checkmark)
- Watch Plan: `calendar-outline`
- Bookmarks: `bookmarks-outline`

### Bookmark icon
Rendered as `Ionicons bookmark` (filled, amber) / `bookmark-outline` (muted, 35% opacity) — not an emoji.

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
Manual entry → typed title persists to Step 2 with "Manual" tag.
When zero results are returned, the **type filter chips (All / Movie / TV Show / Anime) are hidden** — only the gone-niche callout is shown. Chips reappear as soon as any results exist.

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
1. Content type — pill selector showing all categories (default: Anime / TV Show / Movie; custom categories included). Uses a wrapping chip layout (`flexWrap: 'wrap'`) to handle 3–5 categories without overflow.
2. Language — 10 quick-select chips + "Other" free text fallback. **Optional** — submission is not blocked if language is left empty.
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
[ Started (optional)  ▾ ]   ← shows "not set" in muted italic when empty
[ Finished            ▾ ]   ← defaults to today, required
```
- **Watched status:** Two date pickers rendered in sequence
  - "Started (optional)" — `WatchDatePicker` with `optional` prop; shows "not set" (muted italic) when empty; only saves to `watch_start_date` when user selects a date
  - "Finished" — required, defaults to today; saves to `watch_end_date`
- **Watching status:** One date field
  - "When did you start?" — optional, defaults to today; saves to `watch_start_date`
- **Watch Plan:** Hidden — date captured as `created_at` automatically
- Implemented using the `WatchDatePicker` component with an inline calendar modal (month navigator, day grid, "Today" quick-set button)
- Maps to `watch_start_date` and `watch_end_date` in data model; both stored as ISO strings

#### Section E — Rating + Reaction (Watched and Watching)
```
YOUR RATING                        Required
★ ★ ★ ★ ★ ★ ★ ★ ★ ★

"Rating later? Your verdict will mean more
 when you've slept on it."
```
- Star rating: tap left half = X.5, tap right half = X, drag for speed, haptic on each step
- Micro-explanation shown only when rating is empty
- **Rating is mandatory for Watched status.** Submitting without a rating shows the ⭐ BlockingPopup ("C'mon, you know what you felt"). There is no escape hatch — the popup's only CTA is "Okay okay, I'll rate it." This is intentional: the core value of WatchedIt is rated, intentional logs.
- For Watching status: label → "Rating So Far (Optional)". Rating block is shown but not required.
- Reaction textarea — 500 chars, emoji supported
- *"This is yours forever. Future you will thank present you."* — shown below reaction when empty

#### Section E.5 — Where Did You Watch It? (between Watch Date and Rating)
**Optional.** Platform chips: Netflix · Crunchyroll · Amazon Prime · Hotstar · Apple TV · Theater · Others. Selecting "Others" reveals a free-text input for a custom name. Tapping an active chip deselects it (clears the field). Saved as `watch_platform` on the entry. Editable via the Edit flow in LogItDetails.

- Known platform selected → saves chip label as `watch_platform`
- "Others" selected + custom text entered → saves custom text as `watch_platform`
- "Others" selected + custom text empty → saves `null`
- Nothing selected → saves `null`

Only shown when status is not Watch Plan (`!isPlan`).

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
1. `getEntries()` called before `addEntry()` — captures pre-add count to detect first-ever log
2. `addEntry(...)` saves the entry
3. `setPendingToast(...)` writes toast data to `toastBridge`:
   - First log (`existing.length === 0`): `{ title: '🎬 WatchLog started!', body: '…', sub: 'Entry #1. Many more await.', isFirstLog: true }`
   - Standard: `{ title: '🎬 Logged!' / '📋 Added to Watch Plan', body: '…' }`
4. `DeviceEventEmitter.emit('dismissLogItSearch')` — search sheet animates out simultaneously
5. `router.back()` — details screen slides down (animation: `slide_from_bottom` reverse)
6. WatchTower gains focus, reads and displays the pending toast

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

### Where I Watched It
Shown as a one-line card between the episode tracker and Watch Log sections (only when `entry.watch_platform` is set). Format:
```
WHERE I WATCHED IT          Netflix
```
Label in muted mono uppercase · value in primary font.

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

Two modes toggled by an inline CTA below the search bar.

### WatchLog mode (default)
Real-time search across WatchList entries. Matches: title · genre · language · type. Same card style as WatchList. Tap → Detail View.

Toggle CTA: `"Searching your WatchLog · Search the web instead →"`

### Web mode
Searches MAL → TMDB → OMDB using the same `searchTitles()` infrastructure as Log It Step 1. Auto-triggers if a query is already typed when the user switches modes.

Toggle CTA: `"← Searching the web · switch to WatchLog"`

**Controls (same as Log It Step 1):**
- Source toggles: MAL · TMDB · OMDB (only active after a search runs)
- Type filter chips: All · Movie · TV Show · Anime (shown only when results exist; wrapped in `<View>` to constrain height in the flex column layout)
- Info button (ⓘ): opens `SearchPreviewModal` (auto-close timer, hold to pause, expand poster) — identical to Log It

**Result ordering — two sections:**

1. **IN YOUR WATCHLOG** — API results whose title matches an entry already in the user's WatchLog (`r.inLog === true`). Rendered as exact WatchList cards: left color status bar, date line, TypePill + progress line, rating, bookmark toggle, "Rate it ★" nudge for unrated Watched entries. Sorted by Most Recent Activity (same as WatchList All tab). Tap → Detail View.

2. **WEB RESULTS** (or **MORE FROM THE WEB** when in-log results also exist) — API results not in the WatchLog. Rendered as LogIt result cards: `+ Watch Plan` and `WatchedIt →` CTAs plus ⓘ preview button. Same card layout and behavior as Log It Step 1.

**`WatchedIt →` CTA:** Navigates to Log It Step 2 (`/logit/details`) with the same params as Log It. On submit, `router.back()` returns to Search screen. Search screen reads `consumePendingToast()` in `useFocusEffect` and shows the success toast here (not on WatchTower).

**`+ Watch Plan` CTA:** Instant-add identical to Log It. Card transforms inline to `✓ Added to Watch Plan  View →`.

**No results:** Shows the niche callout ("Woah you've gone niche! 🎭") with "Add Manually" button — same as Log It.

**Toast:** Amber-bordered slide-up toast, identical to WatchTower. 10s auto-dismiss, ✕ dismiss button. Reads from `toastBridge` singleton on `useFocusEffect`. Shown here instead of WatchTower when the user logs via the Search screen's web mode.

**Search bar icon:** `Ionicons search-outline` (replaces emoji 🔍).

---

## 13. Screen: Statistics

**Entry:** *"See your stats →"* on Watch Tower

### Loading & empty state
On screen focus, a `statsLoading` state is set to `true` and the chart area shows *"hang on, getting your stats…"* (same height as the chart, 140px, so the card does not jump). When entries are empty after load, an empty state shows *"couldn't load your stats right now"* with a *"try again →"* button that calls `loadStats()` directly (same function used by `useFocusEffect`).

### Time filters
Last 7 Days · Last 30 Days · All Time · Custom (date range picker)

### View toggle
Summary · Timeline

### Summary view
Four stat cards (2×2 grid):
- Titles watched in period
- Days watched (total watch hours ÷ 24, rounded)
- Average rating given (excludes unrated entries)
- **Active days** — count of unique calendar days with logged content in the selected period. Computed via `parseActivityDate(e)` → `localDateStr()` on the filtered entry pool.

Below stat cards:
- Unrated entries nudge (when flagged count > 0): *"X title(s) still need a rating — They're in your history, but not your average. Rate them →"* — shown above the Category Breakdown.
- Breakdown by Category section
- Genre Distribution radar chart
- InsightsWidget cycling card

### Timeline view
- Dual metric toggle: Titles · Hours
- **By Type toggle:** switches chart between single combined amber line and 3 colored type lines (Anime/Movie/TV Show)
- Granularity: ≤30 days = daily · >30 days = monthly
- Previous Period comparison: **removed** — not built, not planned for current scope
- **Always uses `watch_end_date` for attribution** — entry appears on the day it was finished, not the day it was logged
- Entry only appears in a time window if `watch_end_date` falls within it
- Muted note below chart: *"Shows appear on the date you finished them"*
- Horizontal scroll for wide date ranges; auto-scrolls to most recent data on load via `onContentSizeChange → scrollToEnd`
- **Zoom toggle:** inline hint row below chart — left side shows *"← scroll for earlier data"*, right side is an underlined *"show all →"* CTA. Tapping compresses all points to fit screen width (no scroll) using the existing max-8-label spacing; CTA switches to *"← zoom in"* to restore. Only shown when chart is wider than the screen. Chart ScrollView is keyed on zoom state to force a clean remount on toggle.
- **All Time** granularity: monthly, spans all years the user has entries (not restricted to current year). Prior-year months labelled `Jan'25` etc.
- The header count and chart bar sum are always consistent: the 7-day/30-day period filter uses start-of-day on the earliest day (not an exact millisecond cutoff) so every entry in the count lands in exactly one chart bar

### Genre distribution
Radar/spider chart showing genre spread across watched entries.

### Breakdown list
Category breakdown expandable by category → titles → tap goes to detail view.

### Sharing (Future)
*"📤 Share your stats with friends — coming when we build the friends module"*

---

## 14. Screen: Watcher (Profile)

### Profile header
Avatar (52px amber circle with initials) and name displayed **side by side, centered as a unit** on screen. A small pencil icon button (26px circle) sits inline with the name — tapping it opens the name edit inline. Auth badge ("Guest" or "Google") is shown below the avatar+name row, also centered.

Name edit: TextInput replaces the name row. `returnKeyType="done"` + `onSubmitEditing` allows saving via keyboard submit. Save CTA also works directly without dismissing keyboard first. Saved to `watchedit_watcher_name` AsyncStorage key. Name loaded from AsyncStorage on `useFocusEffect`.

Auth badge sourced from `watchedit_auth_mode` AsyncStorage key: `'guest'` → "Guest" pill; `'google'` → "Google Drive" pill with faint green tint. `isDriveLinked = authMode === 'drive' || authMode === 'google'`.

### Quick stats strip
Watched · Hours · Avg Rating

### My Recommendations
A CTA row (always visible) navigating to the dedicated Recommendations screen (`app/recommendations.jsx`). Shows count of recommended titles in the sub-label.

**Recommendations screen** (`src/screens/RecommendationsScreen.jsx`):
- Full-screen stack route with BackButton + `useFadeBack` transition
- Header: "My Recommendations" title + amber count badge
- Hint: "Tap 👍 to remove from this list"
- FlatList of all entries where `e.recommend === true`
- Card layout matches WatchList style: color-coded status bar left edge, `<Poster>` (size 42), title (amberDeep), TypePill + language, reaction snippet in italic
- Right column: rating number + amber filled thumbs-up icon
- Tapping anywhere on the card (except the thumbs-up) → `router.push('/detail/${e.id}')`
- Tapping the thumbs-up icon → calls `updateEntry({ ...entry, recommend: false })` and removes the card immediately (optimistic local update)
- Empty state: thumbs-up-outline icon + "No recommendations yet." + explanatory sub copy
- `useFocusEffect` reloads entries on focus to stay in sync with DetailView edits

### Manage
- **Manage Tags & Categories** — navigates to `/manage-tags` (see Section 14B). Icon has amber-tint background matching Recommendations CTA style.
- ~~App Preferences~~ — removed (no alternate styles currently)
- **Preferred Title Language** — inline in the Manage card: English / Romanised / Japanese pill selector. Stored via `getTitleLanguagePref()` / `setTitleLanguagePref()`. Default: English.

### Google Drive Sync
Shown in the Data & Connections section. Two states:

**Guest state (not linked):**
- "Link Google Drive" row — `cloud-outline` icon, label + sub-copy ("Back up your WatchLog automatically"). Tapping triggers inline native Google Sign-In without navigating to onboarding. Info icon on right opens an InfoPopup ("Why link Google Drive?").
- On OAuth success: saves `watchedit_auth_mode: 'google'`, `watchedit_drive_account`, `watchedit_drive_token`, `watchedit_last_sync`; row fades in (Animated opacity 0→1) to the connected state.

**Connected state:**
- Green `cloud-done-outline` icon + email address + amber "✓ Synced" badge on first line
- Last synced time: `formatLastSync(iso)` → "Today" / "Yesterday" / "X days ago"
- **Sync Now** button (3 states):
  - `idle`: `refresh-outline` icon + "Sync now" label
  - `syncing`: `ActivityIndicator` + "Syncing…" label
  - `done`: `checkmark-circle-outline` green icon + "Synced!" label → auto-reverts to `idle` after 2.5s
- **Unlink** button: `cloud-offline-outline` icon + "Unlink" label → opens confirm InfoPopup (secondary danger style). On confirm: clears `watchedit_auth_mode`, `watchedit_drive_account`, `watchedit_drive_token`, `watchedit_last_sync` from AsyncStorage.

*Note: Sync Now is currently a stub (2s simulated delay). Real Drive API (write/read `watchedit_entries.json` to appdata folder) is planned for Stage 3.*

### Data & Connections
Rows for export/import (all functional as of Stage 2.13):
- **Export as JSON** — full WatchLog entries as `watchedit-export-YYYYMMDD.json`
- **Export as CSV** — 16-column CSV as `watchedit-export-YYYYMMDD.csv`
- **Import from WatchedIt backup** — JSON file picker; Merge or Replace all

Removed: Connect MyAnimeList, Import Netflix History, Stage 3 label, Clear All Data button.

### Log Out
Confirmation modal: *"Log out?"* — Your WatchLog stays safe.

---

## 14B. Screen: Manage Tags & Categories

Route: `app/manage-tags.jsx` → `src/screens/ManageTagsScreen.jsx`. Stack route (slide_from_right). BackButton in header.

Two tabs: **Categories** | **Genre Tags**

### Categories tab
Displays all categories (default: Anime / TV Show / Movie; plus any custom ones). Each row shows:
- Category name
- Title count pill (count of entries where `entry.type === category`)
- Pencil icon → inline rename (TextInput replaces name row; confirm / cancel buttons)
- Trash icon → delete

**Rules:**
- **Delete blocked if any titles use the category.** Error banner shown: *"Can't delete 'X' — N title(s) are using it. Rename it instead, or reassign those titles first."* The error is informational — no separate confirmation step.
- **Max 5 categories.** "Add Category" button hidden when at 5; replaced with "Maximum of 5 categories reached" muted text.
- Renaming updates `entry.type` across all affected entries via `saveEntries()`.
- Adding/deleting persists the category list to AsyncStorage.

### Genre Tags tab
Displays all unique genre tags across all entries, sorted descending by title count. Each row shows:
- Genre name
- Title count pill
- Trash icon → delete

**Delete flow:**
- If the genre is used by any titles: `ConfirmModal` warns *"This tag is on N title(s). Removing it will strip the tag from all of them."*
- If unused: `ConfirmModal` shows a simple confirmation.
- On confirm: strips the genre from all `entry.genre` arrays via `saveEntries()`.

### Empty state (Genre Tags)
When no genres exist: pricetags-outline icon + "No genre tags yet" + "Add genre tags when logging a title".

### Categories storage
- AsyncStorage key: `watchedit_categories` (JSON array of strings)
- Default: `['Anime', 'TV Show', 'Movie']`
- Read/write via `getCategories()` / `saveCategories()` in `src/db/storage.js`
- `DEFAULT_CATEGORIES` exported from storage as a named constant

---

## 14A. Screen Transitions

### Back navigation fade
Screens with a back button use the `useFadeBack` hook (`src/hooks/useFadeBack.js`). When the back button is tapped:
1. The screen's root `Animated.View` opacity fades from 1 → 0 over 380ms (`useNativeDriver: true`)
2. After a 60ms head-start on the fade, `router.back()` fires — the native stack slide-in of the previous screen begins
3. Combined effect: current screen content visibly fades out while the previous screen slides in from the left, giving the impression that the previous screen slides in on top

Affected screens: **StatsScreen**, **DetailView (Watch Deets)**, **onboarding/auth**

### BackButton component
`src/components/BackButton.jsx` — standard back button used across all screens that require one. Renders `Ionicons chevron-back` at size 30. Accepts an optional `onPress` override; defaults to `router.back()`. Screens using the fade transition pass `goBack` from `useFadeBack` as `onPress`.

### InfoPopup component
`src/components/InfoPopup.jsx` — reusable in-app modal replacing native `Alert.alert`. Renders a dark surface card with amber border, title, message, and an amber gradient CTA button. Used for the Google sign-in coming-soon notice on the auth screen. Props: `visible`, `title`, `message`, `cta` (default `'Got it'`), `onClose`.

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
  watch_platform,      // string | null — platform name (e.g. "Netflix", "Crunchyroll", custom text)
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
- **`logged_at` is never used for stats attribution** — it is an audit field only (when the user opened the app to log). Using it would misplace retroactively-logged entries.
- Date resolution priority in code: `watch_end_date` → `finishedDate` / `lastWatchedDate` (for watching entries) → `date`

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
| Moved to Watching | **Yes — if a session was logged in the filter period** | Yes — `watch_start_date` |
| Log a Sesh | Yes (attributed to `lastWatchedDate`) | Yes — session date updates `lastWatchedDate` |
| Marked Watched | Yes | Yes — `watch_end_date` (user-entered, defaults to today) |
| Dropped | Yes | Yes — `watch_end_date` |
| Rewatch logged | Yes (+1) | Yes — new entry with own `watch_end_date` |
| Resumed from Dropped | No | Yes — resume date logged in Watch Deets |

**Currently Watching stat inclusion rule:** A `status === 'watching'` entry is counted in the stats for a given time period if its `lastWatchedDate` falls within that period. `lastWatchedDate` is updated each time a Watch Sesh is logged, so this effectively gates on whether the user actively watched during the period. The title appears once per period (not once per session), attributed to the most recent session date in that period.

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
await getCategories();          // returns string[] — default ['Anime', 'TV Show', 'Movie']
await saveCategories(cats);     // persists category list
```

**AsyncStorage keys:**
- `watchedit_entries` — array of persisted entries
- `watchedit_title_language_pref` — `"en"` | `"ja"` | `"romanised"`; default `"en"`
- `watchedit_watcher_name` — user's display name (set in onboarding Screen 1)
- `watchedit_auth_mode` — `"guest"` | `"google"` (set in onboarding Screen 3 / Screen 4b)
- `watchedit_onboarding_done` — `"true"` when onboarding complete (set in Screen 4a or 4b)
- `watchedit_categories` — JSON array of category name strings; default `['Anime', 'TV Show', 'Movie']`; max 5
- `watchedit_drive_account` — Google account email (string; set when Drive linked via OAuth)
- `watchedit_drive_token` — OAuth access token (string; set when Drive linked; cleared on Unlink)
- `watchedit_last_sync` — ISO date string of last successful sync (set on link + each Sync Now)

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

## 6A. WatchList Selection Mode

Long pressing any title card on WatchList enters selection mode. The long-pressed card becomes the first selected item. If the user deselects it (tap to toggle) and zero cards remain selected, selection mode exits automatically — no manual cancel needed.

### What changes in selection mode
- Search bar dims (`opacity: 0.35`) and becomes non-interactive (`pointerEvents: none`)
- Type filter chips dim and become non-interactive
- Filter & Sort button dims and becomes non-interactive — the amber filter count badge stays visible and unchanged
- Horizontal swipe-to-tab gesture is disabled
- A **selection action bar** appears between the count line and the first card: selected count (left) · "Select all" text button · amber Share button · "Cancel" text button

### Card treatment
Cards do not change layout. Selected cards get an amber background tint (`rgba(239,159,39,0.18)`). Left status bar stays its original type/status colour (unchanged). Unselected cards are visually unchanged. Tapping a card toggles selection. Bookmark button is absorbed — no actions except selection toggle while in selection mode. "Rate it" nudge hidden while in selection mode.

### Long press + tap conflict fix
A `justLongPressed` ref on `WatchCard` is set to `true` when `onLongPress` fires. The subsequent `onPress` (triggered by finger-lift after long press) checks the ref, skips all action, and resets it. Prevents the card from being immediately deselected on the frame after selection mode is entered.

### Select all
Selects every card currently visible — respects active tab, filters, and search. Not all entries in storage.

### Share button
- 1 card selected → single title share flow (`shareEntry`)
- 2+ cards selected → multi-title HTML export (see Section 6B, in progress)
- Disabled (opacity 0.4) when 0 cards selected

### Cancel
Clears all selections and exits selection mode.

---

## 6B. Single Title Share

Triggered from two places:
1. **Share icon** on the DetailView hero action row
2. **Selection mode Share button** on WatchList with exactly 1 title selected

### Share utility
`src/utils/shareEntry.js` exports `shareEntry(entry)`. Calls `Share.share({ message })` with a formatted text string. Image sharing is not implemented — Android's `Share` API ignores the `url` field; image sharing requires `expo-sharing` which is out of scope for now.

### Text format
```
*[Title]*
[Type] · [Year] · [Episode info] · [Platform]
★ [Rating] / 10   — or —   — not rated yet
"[First 120 chars of reaction]..."

Thought you'd like this one 👀
— logged on WatchedIt
```

**Episode info line logic:**
- Movie → omit episode line
- Watched, finite show → `[total] episodes · [rt] min/ep`
- Watching, known total → `[ep] of [total] episodes · [rt] min/ep`
- Ongoing + watching → `Ongoing · [ep] eps watched so far`
- Episode count unknown → omit episode segment

Year, platform, and reaction each omitted when not set. Unrated Watched entries show `— not rated yet` instead of the star line.

### DetailView hero action row
`ActionBtn` is now icon-only — no text labels. Three icons (four when `isWatched`): Rewatch (`refresh-outline`, only for watched) · Share (`share-outline`) · Edit (`create-outline`) · Unwatch/Remove (`trash-outline`, danger). Icons size 18, buttons 40×40 square.

---

## 6C. Multi-Title HTML Export

Triggered when 2+ titles are selected via WatchList selection mode and Share is tapped.

### File
`src/utils/exportHtml.js` — `exportEntriesHtml(entries, filterContext)`. Uses `expo-file-system` (new `File`/`Paths` API) and `expo-sharing`.

**Filename:** `watchedit-list-YYYYMMDD-HHmmss.html`

### Poster handling
All posters fetched in parallel via `Promise.allSettled`. Each is downloaded via `File.downloadFileAsync` at w92 size then read as base64 via `.base64()` and embedded inline as a `data:image/jpeg;base64,...` URI. Any failure silently falls back to an amber initials block (same two-letter logic as the app).

### HTML structure
- **Header:** WatchedIt logo pill (amber-tinted) · watcher name (loaded from `watchedit_watcher_name`) · page title (tab display label + type chip if active, e.g. "Watched · Anime") · entry count · active filter pills
- **Entry rows:** poster/initials fallback · title · type · platform · date · episode line · reaction snippet (≤100 chars, italic) · status badge (colour-coded) · rating (amber, prominent)
- **Footer:** "generated by WatchedIt · [name]'s watchlog · [month year]"
- **Embedded data:** `<script type="application/json" id="watchedit-data">` block containing the full entry array for all selected titles — enables future import

**Active filter pills:** type chips · language · genre tags · rating range (when narrowed) · date range · platform · unrated toggle · paused toggle (watching tab only). Type chip also shown per-entry in the HTML.

**Visual style:** Dark bg (#1e1c19 page · #292826 cards · #1a1814 footer). Amber (#EF9F27) for ratings and accents. Muted (#9E9B96) for metadata. Mobile-optimised, max-width 600px.

**Entry order:** matches current screen sort order.

---

## 6D. Data Export & Import (Watcher Screen)

Data & Connections section in WatcherScreen — all three rows are now functional (no "Soon" pills).

### Export as JSON
`exportJSON(entries)` in `src/utils/exportData.js`. Filename: `watchedit-export-YYYYMMDD.json`. Full AsyncStorage entries array, no transformation. Shared via `expo-sharing`.

### Export as CSV
`exportCSV(entries)` in `src/utils/exportData.js`. Filename: `watchedit-export-YYYYMMDD.csv`. Columns in order: Title · Content Type · Status · My Rating · Source Rating · Source Name · Watch Platform · Genre (comma-separated, quoted) · Language · Date Logged · Start Date · Finish Date · Episodes Watched · Total Episodes · Per Episode Runtime (mins) · Total Watch Time. Dates in DD/MM/YYYY. Blank cell (not "null") for unset fields. Episode columns blank for movies. Cells containing commas wrapped in double quotes.

### Import from WatchedIt backup
Opens native file picker (`expo-document-picker`, filtered to `application/json`). Picked file read via `fetch(uri).then(r => r.text())`.

**Validation:** must be a JSON array where every item has `id` and `title`. Failure shows an `InfoPopup` ("Unrecognised file").

**Confirm popup** (`InfoPopup` with two actions):
- **Merge** (amber, primary) — adds imported entries, skips any whose `id` already exists
- **Replace all** (danger tint, secondary) — clears current entries and imports

Success shows an inline toast with count of entries imported/added. Errors show an error-tinted toast.

### InfoPopup two-button variant
`InfoPopup` now accepts optional `secondaryCta`, `onSecondary`, and `secondaryDanger` props. When `secondaryCta` is provided, a second button is rendered above the primary amber CTA. `secondaryDanger` applies a red-tint background and `T.dropped` text colour.

### Watcher screen inline toast
`Animated` slide-up toast (bottom of screen, 4s auto-dismiss). Amber border normally; red-tint border on error. Implemented via `Animated.Value` + `translateY` interpolation with `useNativeDriver: true`.

---

## 26. Build Stages

| Stage | Scope | Status |
|---|---|---|
| **1** | React web UI shell. All screens. Dummy data. No backend, no APIs. | ✅ Complete |
| **2** | React Native + Expo migration. Android-first app shell. Expo Router. AsyncStorage persistence. MAL + TMDB + OMDB search. Revised Log It flow. Core screens/components migrated from web reference. | ✅ Complete |
| **2.1** | Onboarding flow (3-screen stack, two-phase bootstrap, welcome card, GuidedCarousel, first-log toast). Screen transition polish. | ✅ Complete |
| **2.8** | EAS build config. Final app icons + splash. Play Store developer account created (verification in progress). APK and AAB build profiles configured. | ✅ Complete |
| **2.10** | Search screen web mode. Dual-mode search: WatchLog (existing) + web API (MAL/TMDB/OMDB). In-log results shown as WatchList cards at top; new results shown as LogIt cards. Toast shown on Search screen after submit. Nav icon refresh: Watch Tower → `castle`, WatchList → `script-text`, Search → `telescope` (all MaterialCommunityIcons). | ✅ Complete |
| **2.11** | API timeouts. Episodes card in Log It. Log It UX polish. Icon system. WatchTower spacing fix. | ✅ Complete |
| **2.12** | WatchList selection mode. Single title share. DetailView hero action icons (icon-only, Share added). Watch Plan → Watching start date fix. | ✅ Complete |
| **2.13** | Multi-title HTML export (WatchList selection mode, 2+ titles). JSON export. CSV export. WatchedIt backup import. InfoPopup two-button variant. WatcherScreen inline toast. Tab bar height drop. WatcherScreen section label/sub font size increase. | ✅ Complete |
| **2.14** | 4-screen onboarding redesign. Screen 1 polish (eyebrow, larger headline, new CTA copy). Screen 2 NEW: About WatchedIt (3 feature cards, brand amber). Screen 3 rewrite: two-option card picker (Google Drive / Phone Only). Screen 4a guest rewrite (warning box, Ionicons rows, ghost back link). Screen 4b NEW: Drive-success confirmation (email, wrong account re-auth). Progress dots updated to 4. `about.jsx` + `drive-success.jsx` added. Replay onboarding dev button in WatcherScreen. | ✅ Complete |
| **2.15** | Google Drive sync UI + real Google OAuth. `useGoogleAuth` shared helper (native Google Sign-In, `drive.appdata` scope). WatcherScreen Drive section: guest Link row + connected state (email, synced badge, last sync time, 3-state Sync Now, Unlink). Real OAuth wired in `auth.jsx`, `drive-success.jsx`, `WatcherScreen`. `watchedit_drive_account`, `watchedit_drive_token`, `watchedit_last_sync` AsyncStorage keys. EAS build env vars for Google OAuth. Sync Now stubbed (real Drive API in Stage 3). | ✅ Complete |
| **3** | Google Drive actual sync (write/read appdata). Supabase. MAL OAuth import. Netflix CSV import. Review to Log queue. API keys server-side. Play Store listing live. | 🔲 |
| **4** | Social/friends. Share extension. Shareable stats card. Home screen widget. WatchedIt channel. Subscription analytics. YouTube Takeout. iOS polish. | 🔲 |

---

## 27. Spec Change Log

| Version | Changes |
|---|---|
| 2.15 | **Google Drive sync UI + real Google OAuth.** `src/hooks/useGoogleAuth.js` is now a shared helper built on `@react-native-google-signin/google-signin`. It configures scopes `email`, `profile`, and `drive.appdata`, and exports `signInWithGoogle()`, `signOutGoogle()`, and `getGoogleAuthErrorMessage()`. **WatcherScreen Drive section (guest state):** "Link Google Drive" row with `cloud-outline` icon; info icon opens `driveInfoPopup`; `handleLinkDrive()` calls `signInWithGoogle()` inline (no navigation). On OAuth success: saves `watchedit_auth_mode: 'google'`, `watchedit_drive_account`, `watchedit_drive_token`, `watchedit_last_sync`; row fades in via `driveRowAnim` (`Animated.timing` 0→1). **WatcherScreen Drive section (connected state):** green `cloud-done-outline` + email + amber "✓ Synced" badge; `formatLastSync(iso)` → "Today"/"Yesterday"/"X days ago"; Sync Now 3-state (`idle`→`syncing`→`done`, `ActivityIndicator` during sync, green checkmark + "Synced!" on done, 2.5s auto-revert); Unlink (`cloud-offline-outline`) opens confirm InfoPopup with `secondaryDanger`; `handleDriveUnlink()` clears all 3 Drive keys and signs out the native Google session. **`isDriveLinked`:** `authMode === 'drive' || authMode === 'google'`. **Auth badge:** "Google Drive" when linked. **OAuth in `auth.jsx`:** `driveLoading` state prevents double-tap; error text shown inline below Drive card. **OAuth in `drive-success.jsx`:** "Wrong account?" signs out and reopens the native account picker. **New AsyncStorage keys:** `watchedit_drive_account`, `watchedit_drive_token`, `watchedit_last_sync`. **Build/config note:** `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` must be present in `eas.json` because the app reads it at runtime. The Android OAuth client (package name + SHA-1) must still exist in Google Cloud Console, but its client ID is no longer consumed as a runtime env var. **Android note:** the previous `expo-auth-session` custom-scheme flow was removed after Google rejected it with `Error 400: invalid_request`. OAuth must be tested via a native Android build / APK install. |
| 2.14 | **4-screen onboarding redesign.** **Screen 1 (`index.jsx`) updates:** `"BEFORE WE BEGIN —"` mono eyebrow added above headline; headline font 26→30px, lineHeight 38; CTA copy "That's me →" → "Yep, that's me →"; routes to `/onboarding/about` (was `/onboarding/auth`); `total={4}` dots. **Screen 2 (`about.jsx`) NEW:** "THANKS FOR DOWNLOADING!" mono eyebrow; sub copy with `WatchedIt` in amber (`subBrand` style); 3 feature cards — Log It (with TMDB / MyAnimeList / OMDB source pills), Review Stats, Remember It — each with Ionicon + title + body text; CTA "Let's set up my WatchLog →" routes to `/onboarding/auth`. **Screen 3 (`auth.jsx`) full rewrite:** two-option card picker replaces old Google button + Guest button layout; Google Drive card has amber border + "Recommended" pill badge; Phone Only card dims while Drive auth is in progress; real OAuth via the shared Google auth helper; `driveLoading` state shows spinner + "Connecting…" in the Drive card; on success saves auth keys and navigates to `/onboarding/drive-success` with `email` param; on failure shows inline error text below Drive card; Phone Only saves `watchedit_auth_mode: 'guest'` and routes to `/onboarding/guest`. **Screen 4a (`guest.jsx`) rewrite:** name-aware headline (from AsyncStorage, no inline edit); red warning box (`T.dropped` tint + `warning-outline` Ionicon); two Ionicons info rows (`checkmark-circle-outline`, `sync-outline`); ghost back link "← Actually, let me connect Drive instead" calls `router.back()`; CTA sets `watchedit_onboarding_done: 'true'` and `router.replace('/(tabs)')`. **Screen 4b (`drive-success.jsx`) NEW:** `email` from `useLocalSearchParams()`; Drive link pill shows real email; "Wrong account?" clears Drive keys, signs out, and reopens the native account picker; final CTA saves all Drive keys + sets `watchedit_onboarding_done: 'true'` + `router.replace('/(tabs)')`. **`onboarding/_layout.jsx`:** added `<Stack.Screen name="about" />` and `<Stack.Screen name="drive-success" />`. **Progress dots:** `total={4}` across all screens. **WatcherScreen:** "Replay onboarding" dev button clears `watchedit_onboarding_done` and routes to `/onboarding`. |
| 2.13 | **Multi-title HTML export + JSON/CSV export + WatchedIt import + UI polish.** **Multi-title HTML export:** `exportEntriesHtml()` in `src/utils/exportData.js` [sic — `src/utils/exportHtml.js`]. Uses new `expo-file-system` `File`/`Paths` API (legacy `writeAsStringAsync` is deprecated in v55). Posters fetched in parallel via `File.downloadFileAsync` → `.base64()`, embedded as data URIs; failures silently fall back to amber initials block. Dark-themed HTML with logo pill header, per-entry rows (poster, title, meta, episode line, reaction snippet, status badge, rating), embedded JSON data block, footer. Active filter pills in header. Entry order matches current sort. Filename `watchedit-list-YYYYMMDD-HHmmss.html`. **JSON export:** `exportJSON()` — full entries array, no transformation, shared via `expo-sharing`. Filename `watchedit-export-YYYYMMDD.json`. **CSV export:** `exportCSV()` — 16 columns, dates DD/MM/YYYY, blank for unset, episode columns blank for movies, cells with commas quoted. Filename `watchedit-export-YYYYMMDD.csv`. **Import:** `expo-document-picker` (JSON filter). File read via `fetch(uri).then(r => r.text())`. Validates array with `id` + `title` on every item. Invalid → `InfoPopup` error. Valid → `InfoPopup` confirm with Merge (skips duplicate ids) or Replace all (clears then imports). Success/error shown via inline toast. **InfoPopup two-button variant:** optional `secondaryCta`, `onSecondary`, `secondaryDanger` props — renders a second muted/danger button above the primary amber CTA. **WatcherScreen inline toast:** `Animated` slide-up at screen bottom, 4s auto-dismiss, amber border (error: red tint), `useNativeDriver: true`. **WatcherScreen section/sub font sizes:** `sectionLabel` 10 → 13px; `manageSub` 11 → 13px. **Tab bar height:** `tabBarH` 56 → 54px; `paddingBottom` fallback 8 → 6px. **expo-document-picker** installed and added to `app.json` plugins. | 2.12 | **WatchList selection mode + single title share + DetailView icon refresh + Watch Plan start date fix.** **Selection mode:** Long press any WatchList card (400ms `delayLongPress`) enters selection mode; long-pressed card is first selected. A `justLongPressed` ref on `WatchCard` absorbs the `onPress` fired on finger-lift so the card isn't immediately deselected. In selection mode: search bar, type chips, and filter button dim to `opacity: 0.35` with `pointerEvents: none`; filter badge count unchanged; horizontal swipe-to-tab gesture disabled. Selection action bar appears between count row and list — "X selected" · "Select all" · amber Share button · "Cancel". Selected cards get `rgba(239,159,39,0.18)` amber tint; left status bar stays original type colour. Tapping toggles selection; deselecting last card auto-exits. "Select all" selects all `results` (current filtered/searched view). Cancel exits and clears. **Share:** `src/utils/shareEntry.js` — `shareEntry(entry)` builds formatted text (title, type · year · episode info · platform, rating or "not rated yet", reaction snippet ≤120 chars, blank line, "Thought you'd like this one 👀", "— logged on WatchedIt") and calls `Share.share({ message })`. Android text-only — `url` field is ignored by Android's ShareModule (only `EXTRA_TEXT` is set). Image sharing deferred. **DetailView action row:** `ActionBtn` converted to icon-only (size 18, 40×40 square, no label text). Share (`share-outline`) added between Rewatch and Edit. Rewatch only shown for `isWatched`. Styles `actionBtnText` and `actionBtnTextDanger` removed. **WatchList episode count font:** `progressText` `fontSize` raised from 11 → 13px. **Watch Plan → Watching start date fix:** `watchingStart` (Watching Since display) and `watchingDeetsStartDate` (Watch Deets timeline "Started Watching") now fall back to `firstSesh?.date_display` before `entry.date`. Previously both fell back to `entry.date` — the Watch Plan add date — causing a title transitioned from Watch Plan via Log a Sesh to show the wrong start date. | 2.11 | **API timeouts + Episodes card + Log It polish + icon system + spacing fix.** **API timeouts:** 8s `AbortController` timeout added to `tmdbFetch` (covers all TMDB calls), `omdbFetch`, and `searchMAL`'s fetch — prevents LogIt search hanging indefinitely on slow/blocked networks. **Episodes card (LogItDetails):** New card rendered between Watch Status and Watch Date for all TV/Anime non-plan entries (both Watched and Watching). Shows two rows — "Total episodes" (value + ✎ Edit toggle → inline panel with number input + "Still ongoing?" Switch) and "Episode runtime" (value + ✎ Edit toggle → inline panel with 24min/45min/Custom presets + custom text input). Below a divider: derived watch-time line — Watched reads "estimated watch time ~Xh Ym", Watching reads "watched so far ~Xh Ym" (updates live as fields change). Watching-only: second divider + "Watched Up To" section containing the episode grid selector (≤50 eps, non-ongoing) or manual number input. Episodes and runtime fields removed from the collapsed metadata card (no longer duplicated there); old standalone Episode Progress card removed. Metadata card header line (episode count / runtime / est. time) hidden for TV entries since the new card covers it; movies still show their runtime summary. **Log It UX polish:** "Not finding it?" slim bar added to LogItSearch above results (shows when results are present, not in single-rewatch mode) — muted label on left, amber "Add manually →" CTA on right, triggers same manual-add flow as the zero-results state. Inline edit panels for episode/runtime use a transparent container (no nested elevated box) so height matches the rest of the form; `textInputCompact` style introduced (`paddingVertical: 12, fontSize: 13`) matching the WatchDatePicker trigger height. `placeholderTextColor={T.textMuted}` added to all episode-related inputs. **Icon system:** All remaining emoji icons replaced with Ionicons. Edit buttons (✏️ Edit / Done ✓) in LogItDetails now use `create-outline` / `checkmark` icons alongside the label text; `editBtn` style updated to `flexDirection: row, alignItems: center, gap: 4`. Search bar emoji (🔍) in LogItSearch and WatchList replaced with `Ionicons search-outline size={16} color={T.textMuted}`; dead `searchIcon` styles removed; Ionicons import added to LogItSearch. **WatchTower spacing fix:** `marginBottom: 12` removed from the `sectionTitle` Text style — it was inside a `flexDirection: row` container (`recentHeader`) causing the row height to vary with custom font metrics on Android (Nunito-ExtraBold), making the gap between section titles and cards shift between renders. Gap is now purely controlled by `recentHeader`'s own `marginBottom: 12`. **Tab label:** Watch Tower tab label shortened from "Watch Tower" to "Tower" to fit the narrower medieval castle icon without truncation. **`package.json` scripts:** `android`/`ios` scripts changed from `expo start --android/--ios` to `expo run:android/ios` for direct device/emulator launch. |
| 2.10 | **Search screen web mode + nav icon refresh.** **Search web mode:** `SearchScreen` now has two modes toggled by an inline CTA below the search bar. WatchLog mode (default): live search across entries — unchanged. Web mode: calls `searchTitles()` (MAL + TMDB + OMDB) on submit; auto-triggers when switching modes with an existing query. Results split into two sections: (1) `IN YOUR WATCHLOG` — matched entries rendered as WatchList cards (left status bar, date line, TypePill, rating, bookmark, Rate it nudge), sorted by Most Recent Activity, tap → DetailView; (2) `WEB RESULTS` / `MORE FROM THE WEB` — unmatched API results rendered as LogIt result cards with `+ Watch Plan`, `WatchedIt →`, and ⓘ preview modal (same `SearchPreviewModal` as LogItSearch). `WatchedIt →` navigates to `/logit/details`; on submit `router.back()` returns to SearchScreen which reads `consumePendingToast()` and shows the toast here. Toast system identical to WatchTower (10s auto-dismiss, ✕ button, amber border). Filter chip ScrollView wrapped in `<View>` (same pattern as LogItSearch) to prevent Android flex-column height expansion. Section labels bumped from mono 11px → `T.fontTitle` 13px. **Search bar icon:** emoji 🔍 replaced with `Ionicons search-outline`. **Nav icon refresh:** Watch Tower `home` → `castle` (MaterialCommunityIcons); WatchList `list` → `script-text` / `script-text-outline` (MaterialCommunityIcons, filled/outline on focus); Search `search` → `telescope` (MaterialCommunityIcons). Watcher unchanged (`person` / `person-outline`, Ionicons). |
| 2.6 | **Font system expansion + UX bug fixes.** **Fredoka font (`fontFun`):** `@expo-google-fonts/fredoka` installed; `Fredoka_400Regular` registered in `app/_layout.jsx` as `'Fredoka-Regular'`; new token `T.fontFun` added to `tokens.js`. Used for subtexts, hints, labels, and secondary copy across all screens. Nunito retained for titles/numbers/CTAs; Inconsolata retained for dates/mono. Text inputs and date pickers retain Nunito (`fontBody`). **WatchList date fix:** title cards now surface `finishedDate` for watched entries and `lastWatchedDate` for watching/dropped/paused — `e.date` (the log/add date) is never shown on cards. **TypePill on WatchList cards:** content-type display replaced from plain text to `<TypePill>` chip inline with the progress line (`cardSubRow`, `flexDirection: 'row'`, `gap: 6`). **Ongoing shows null fix:** `progressLine()` now renders `"X eps watched"` when `e.total` is falsy (not `"X of null eps watched"`); only shows denominator when both ep and total are set. **WatchTower "View all →" CTA:** Currently Watching section header now has a pressable that navigates to `/(tabs)/watchlist` with `params: { tab: 'watching' }`, consistent with the Recently Watched pattern. **Splash resizeMode fix:** `app.json` `splash.resizeMode` changed from `"cover"` to `"contain"` so the text-only centered image displays without cropping. **WatchList swipe navigation:** `PanResponder` on the FlatList wrapper enables left/right swipe to advance tabs (threshold: `|dx| > 50`, gate: `|dx| > 12 && |dx| > |dy| * 2`); stale closure solved with `tabRef.current = tab` and `animateSwitchRef.current` function refs updated every render. **WatchList swipe animation:** crossfade + slide on tab switch; exit: 140ms slide ±40px + fade to 0; enter: 180ms slide from ∓40px + fade to 1; `useNativeDriver: true`. **LogIt sheet padding:** `sheet.paddingBottom` raised to 15px. **FilterSheet polish:** `navSectionLabel.fontSize` and `paneTitle.fontSize` raised 9→11px; `navItem.marginBottom` raised 2→5px; `navLabelActive` no longer overrides `fontFamily` (was switching to Nunito-SemiBold on select — now color-only); unrated toggle wrapped in `View` with `borderWidth: 1.5` amber outline (`rgba(239,159,39,0.55)`) when toggle is off. |
| 2.5 | **Build config hardened.** `eas.json` `preview` profile: `env` block added with `EXPO_PUBLIC_TMDB_TOKEN`, `EXPO_PUBLIC_OMDB_API_KEY`, `EXPO_PUBLIC_MAL_CLIENT_ID` — keys bundled into APK at EAS build time. `eas.json` added to `.gitignore` and untracked from git (`git rm --cached`) — file is local-only, never pushed to GitHub. `app.json` splash `resizeMode` confirmed as `"cover"` (fills full screen). Play Store developer account verification in progress; first AAB submission imminent. |
| 2.4 | **EAS build + asset polish.** `app.json` updated with EAS `projectId` (`a44fa3d4-d847-4c8a-9d18-76121b05b701`), `owner` (`uchilshubzoids-organization`), and EAS-generated slug. Final `icon.png`, `adaptive-icon.png`, and `splash.png` replaced with branded assets. Build profiles confirmed: `preview` → APK (sideload/testing), `production` → AAB (Play Store). Play Store developer account created; verification in progress. **WatchTower hero card:** watch time block vertically centered against the big number (`top: 0, bottom: 0, justifyContent: center` on absolute block); watch time number color dimmed to `T.textMuted` to match the "watch time" sub-label. |
| 2.3 | **WatchList filter enhancements + platform field + Manage Tags & Categories + Watcher overhaul.** **Rating filter:** two-sided slider (0–10, integer steps) built with PanResponder + stateRef pattern; amber fill between thumbs; Reset link; active pill shows `★ 3–8`. **Watch Date filter:** start/end date pickers using inline MiniCalendar (min prop added to block end before start); Last 7/30 days presets; applies only to Watched + Watching entries. **Platform filter:** single-select chips (Netflix / Crunchyroll / Amazon Prime / Hotstar / Apple TV / Theater / Others); "Others" matches any custom-named platform. **WatchTower → WatchList deep link:** tapping a content type segment on Watch Tower navigates to WatchList with `datePreset: 'last30'` and the matching type pre-selected; `useFocusEffect` in WatchList syncs all params on every focus. **FilterSheet height fix:** `navItem.paddingVertical` 8→5, `marginBottom` 4→2, `navSectionLabel.marginBottom` 10→6; body `minHeight` 300→320; `paddingBottom` 52→44; `maxHeight: '96%'` — ensures 7 filter categories + Paused all fit without scroll. **MiniCalendar `min` prop:** added `minDate`, `isPast()` guard, `prevMonth()` navigation block, and disabled prev-chevron at min month. **Platform field in Log It:** new "Where Did You Watch It?" section between Watch Date and Rating (Section E.5); optional; chips for 7 platforms; "Others" reveals free-text input; saved as `watch_platform`; shown and editable in the details edit flow. **"WHERE I WATCHED IT" in DetailView:** one-line card row between episode tracker and Watch Log; muted mono label + primary value; only shown when `watch_platform` is set. **Active days banner:** WatchTower `activeDays` computation and JSX banner commented out pending scope decision. **Watcher screen overhaul:** profile header now shows avatar + name side by side centered on screen, with pencil edit icon inline; auth badge ("Guest" / "Google") below; keyboard submit (`returnKeyType="done"` + `onSubmitEditing`) on name input so Save works without dismissing keyboard. App Preferences section removed. Data & Connections trimmed to Export (disabled/soon) + Import from Other Source (disabled/soon); MAL connect, Netflix import, Clear All Data all removed. "Manage Tags & Categories" row wired to `/manage-tags` with amber-tint icon. **Manage Tags & Categories screen:** new `app/manage-tags.jsx` + `src/screens/ManageTagsScreen.jsx`; two tabs (Categories / Genre Tags); category rename (inline edit), add (max 5), delete (blocked with error banner if titles use it — suggests rename instead); genre delete with ConfirmModal warning (strips tag from all entries). **Custom categories system:** `getCategories()` / `saveCategories()` / `DEFAULT_CATEGORIES` added to `src/db/storage.js`; key `watchedit_categories`; LogItDetails loads categories in `init()` and uses them for the content type selector (wrapping chip layout handles 3–5 categories); API-suggested type validated against loaded categories on new entries. | 2.2 | **UX pass + Recommendations screen.** **Active days:** WatchTower streak banner replaced with "active days" count (unique calendar days with logged content in last 30d / all time window); StatsScreen "Day Streak" stat card replaced with "Active Days" computed per selected time filter. **Sub-copy readability:** TypePill 10→11px (paddingVertical 2→3); WatchTower hintStripSub 10→12px, watchTimeLabel/recentDate/watchDate 11→12px; welcomeGhost opacity removed; WatchList tabText 13→14px, cardSub 11→12px, bookmarkBtn hitSlop enlarged to {top:14,bottom:14,left:14,right:14} + padding:8; StatsScreen SVG axis labels 9→11px, chartScrollHint/chartZoomCta 9→11px, catMiniSub 10→11px; DetailView noteBtn padding 2→8 + hitSlop=8, noteBtnText 11→12px, epNotes 11→12px, epUpNext 10→11px, editThoughtsText 11→13px; LogItSearch metaSub 11→12px, infoBtn hitSlop 8→10; LogItDetails metaLine1 lifted to T.textPrimary + 12→13px, metaLine2/Muted 12→13px, genreChipText 11→13px (paddingVertical 6→9), langChipText 12→13px (paddingVertical 8→10), reactionNudge 11→12px. **Stats card tap fix:** headline Pressable on WatchTower now routes to `/stats` (was `/(tabs)/watchlist`) to eliminate dual-destination confusion. **WatcherScreen fixes:** name edit now persists to `watchedit_watcher_name` AsyncStorage key via `handleSave`; name loaded from AsyncStorage in `useFocusEffect`. Dev "Reset onboarding" button removed. **Recommendations screen:** new full-screen stack route `app/recommendations.jsx` → `RecommendationsScreen`; WatcherScreen "My Recommendations" section replaced with a CTA row; screen shows all `recommend: true` entries with poster/title/type/rating/reaction; tapping the card → DetailView; tapping 👍 icon removes the recommendation via `updateEntry` with optimistic local update. **LogIt start date for Watched:** Section D now shows two `WatchDatePicker` rows for Watched status — "Started (optional)" (shows "not set" when empty, saves only if user picks a date) + "Finished" (required, defaults to today); `watch_start_date` saved for Watched new entries when set. **Spec corrections:** rating is mandatory for Watched status (no escape hatch — confirmed intentional); unrated callout in Stats appears above Category Breakdown (not below avg rating card); previous period comparison removed from spec (not built, not in scope); active days replaces streak in Stats Summary. | 2.1 | **WatchTower stats card polish.** Time period chip replaced with inline text row: "titles watched" (15px Nunito-Medium, T.textPrimary) + " · last 30 days / all time" (11px Inconsolata, T.textMuted) on one centered line; `period`, `dot`, `periodText` styles removed. Bar label second line consolidated from two separate Text elements into one: "9 titles · 63 eps" for Anime/TV, "4 titles" for Movie; singular/plural applied (`1 title` vs `N titles`). **Currently Watching card resize.** Width 300→284px, height 180→138px, poster size 100→79 (height ≈ 110px, 2:3 ratio), vertical card padding 16→14px, episode line font 14→13px, ep+date wrapped in a View so `justifyContent: space-between` treats them as a bottom pair, `marginTop: 2` on last-watched line, watchTitle confirmed T.textPrimary (not amber). **StatsScreen InsightsWidget.** Replaced static hardest-genre callout with a cycling single card under "YOUR INSIGHTS" heading. 9 computed variants: hardest-rated genre, highest-rated genre, most-watched genre, hidden gem (personal >> community rating), niche taste, peak binge month, completion rate, peak season, type loyalty — each skipped if fewer than 3 entries qualify. Card layout: 48×48 amber-tint icon block (32px Ionicon) + headline (14px Nunito-Bold) + body (13px Nunito-Regular, max 2 lines). Footer divider + "X / N" page indicator left, "another one →" / "back to first ↻" right. NEW badge (amber pill top-right) shown for insights whose source entries were logged after last-viewed timestamp; AsyncStorage key `watchedit_insights_last_viewed` (`{ timestamp }`); timestamp updated on widget mount so subsequent visits don't re-flag. Insights sorted: NEW first (by freshAt desc) then seen (by freshAt desc). Widget rendered in both Summary and Timeline tabs after Genre Distribution. `hardestCard` and its dead styles removed. **Episode tracker bug fix.** Outer render condition changed from `(epTotal > 0 \|\| entry.ongoing)` to `(epTotal > 0 \|\| entry.ongoing \|\| epCurrent > 0)` — tracker now shows for any TV/Anime entry where episodes have been logged regardless of whether total is set. Progress text shows "X eps watched" when total is unknown (`epTotal === 0`) to avoid "X of 0 episodes". Percent and progress bar guarded with `epTotal > 0` to prevent NaN. **ratingSource fix.** `LogItDetails` now saves `ratingSource: show?.source \|\| null` alongside `malRating` on every new entry. DetailView reads `entry.ratingSource` (falling back to `'MAL'` for old entries) to display the correct source label — MAL → "MyAnimeList", TMDB → "TMDB", OMDB → "IMDB". Source dot colors updated: MAL blue (#6B9BDF), TMDB teal (#01B4E4), OMDB/IMDB yellow (#F5C518). |
| 2.0 | **DetailView UX polish + bug fixes.** **Font size pass:** heroTitle 18→20px (lineHeight 24→26); heroStatusText, heroLang, heroTime, genreChipText 11→12px; droppedBannerTitle 12→13px; droppedBannerSub 11→12px; timelineDate 11→12px; sectionLabel 11→13px. **Icon audit:** FilterSheet category nav icons converted from emoji to Ionicons (swap-vertical-outline, pricetag-outline, earth-outline, film-outline, pause-circle-outline); LogSeshSheet calendar emoji → Ionicons calendar-outline. **Watch Tower refresh fix:** `DeviceEventEmitter.emit('entryUpdated')` fired from DetailView `handleUpdate`; WatchTower listens in `useEffect` to force data reload when returning from detail (fixes `useFocusEffect` not re-firing after root-stack pop). **Episode tracker:** now renders for `isWatched` entries (not just watching/dropped); auto-fixes watched entries where `ep = 0` but `total > 0` (sets `ep = total`, computes estimated watchTime). Episode list expanded into a capped `ScrollView` (maxHeight ≈ 10 items); auto-scrolls to next episode on expand for currently-watching; stays at top for watched/plan. **Star rating visibility:** `logStarWrap` background changed from `T.elevated` to `T.bgPrimary` so empty stars are visible against the completion box. Reaction textarea background unified to match. **What I Thought card:** edit button is context-aware — shows `star-outline` / "Rate Now" when unrated, `create-outline` / "Edit" when rated; inline rate CTA removed for unrated watching entries; Watch Plan entries show motivational nudge copy instead of Edit button. **Status pill:** "Yet to Watch" → "Watch Plan". **Watch Deets watermark:** font changed to PlayfairDisplay-BlackItalic (decorative editorial accent, legible but subtle). **RatingSheet keyboard:** `KeyboardAvoidingView` removed; uses `Keyboard.addListener` + plain `useState(kbHeight)` + `marginBottom` on the sheet to avoid native-driver animation conflict with Modal slide. **Watch date range fix:** "currently watching" date display now uses `entry.date` (when the title was added) as the range start, not `firstSesh?.date_display` (first logged session date); fixes the bug where logging a first sesh on day N caused only day N to show instead of "day 1 → day N"; DEETS_WATCHING "Started Watching" timeline entry also corrected to use `entry.date`. |
| 1.0 | Initial spec |
| 1.1 | Added rewatch, dropped, paused, ongoing, watch time, stats screen, naming conventions |
| 1.2 | Platform → React Native + Expo. API stack locked (MAL + TMDB + OMDB). Share extension Stage 2. Data import strategy. Stage 4 channels. Design system locked. Product vision added. |
| 1.3 | Revised Log It flow: two CTAs on search cards (+ Watch Plan instant add, WatchedIt →), collapsed metadata card with inline edit, hybrid episode selector, watch date fields (start + end), "continue without rating" secondary path. Flagged entries system (unrated watched). Mini Rating Sheet component. Title language preference in Watcher (EN/JP/Romanised). MAL field mapping table. Stats date attribution model (always watch_end_date, no spreading). json-server local DB documented. State transition rules table. Recently Watched reduced to 3. Watch Tower unrated nudge. "Log a Sesh" rename. |
| 1.4 | Updated project status to Stage 2 native migration complete. Documented Expo Router route map, AsyncStorage persistence, current `searchTitles()` return shape, current persisted entry shape, and moved share extension/shareable stats out of completed Stage 2 scope. |
| 1.5 | Log It UX polish pass. LogItSearch renders as RN Modal (not stack route) from tab layout; `logitOpen` state + `DeviceEventEmitter` control open/close. Keyboard lifts the sheet via plain `useState` `kbHeight` (no Animated driver conflict); keyboard and sheet now rise simultaneously. Poster zoom modal: pinch + pan gestures via `react-native-gesture-handler` inside `GestureHandlerRootView`. Bookmark flag uses Ionicons mono/dual-tone icon. Star rating haptics use `impactAsync(Light)` for Android reliability; PanResponder captures gesture before parent ScrollView. Title language: `displayTitle` passed separately so original title (e.g. Japanese) is preserved in the alternatives dropdown. Submit flow: `toastBridge` singleton passes toast data to WatchTower across navigation; `dismissLogItSearch` event closes search modal concurrently with `router.back()`; `presentation: 'modal'` removed from `logit/details` so back gesture slides the screen down correctly. Watch Tower success toast: 10s auto-dismiss, ✕ dismiss button at top-right, positioned 8px above tab bar. |
| 1.9 | **UX polish pass.** Screen back-transition: `useFadeBack` hook fades current screen out over 380ms while previous screen slides in (StatsScreen, DetailView, onboarding/auth). `BackButton` standardised as a shared component (chevron-back size 30). `InfoPopup` component replaces `Alert.alert` for Google coming-soon notice on auth screen; Google button now uses `AntDesign "google"` icon with amber-tinted styling. Onboarding `paddingTop` raised to 82px; Watcher Name label font size 14px; placeholder uses Indian-flavored names. **GuidedCarousel** rewritten: swipe-only navigation (no Next button), real UI mockups for all 3 slides (logo pill + FAB entry points, WatchList tab mockup, stats card with muted underlined stats link), CTA only on last slide. **WatchList** tab row switched from FlatList to ScrollView to fix Android height gap; empty states use Ionicons per tab (Watched uses close-circle-outline); bookmark icon uses Ionicons mono/dual-tone. FilterSheet maxHeight raised to 94%. **LogIt**: language field is now optional (no validation gate); type filter chips hidden when search returns no results. **Stats screen**: `statsLoading` state with friendly loading placeholder; `loadStats()` for retry CTA; zoom toggle on timeline chart (compresses to screen width, max 8 labels, keyed ScrollView for clean remount); auto-scroll to most recent data on load. Tab bar height reduced by 7px. Fade animation from onboarding to tabs set to 700ms. | 1.8 | **Onboarding flow.** Three-screen stack in `app/onboarding/` (Name → Auth → Guest). Two-phase bootstrap in root layout: fonts load → AsyncStorage check → navigate → hide splash (no flash). Section 4A added. AsyncStorage keys for onboarding documented. **WatchTower empty state redesign.** Stats card hidden when WatchLog is empty. Replaced with amber welcome card (two CTAs + ghost link) and hint strip. GuidedCarousel modal (3 slides with mini screen mockups, dot indicators, controlled-scroll horizontal paging). Section 5 updated with welcome card spec and GuidedCarousel spec. **First-log toast.** LogItDetails detects first-ever entry via pre-add `getEntries()` check; fires special toast with sub line. Toast rendering updated to support optional `sub` field. Submission flow in Section 7 updated. |
| 1.7 | Data attribution fixes. **Watch Tower stats block:** title count now includes watched + dropped + watching-with-session entries (was watched-only); date attribution uses `watch_end_date` → `finishedDate`/`lastWatchedDate` → `date` chain (was `logged_at`); category pills and watch time derived from same corrected pool; Recently Watched list sorted by activity date. **StatsScreen:** `filterByPeriod` 7/30-day cutoff now uses start-of-day so header count and chart bar sum are always equal; `buildTimePoints` All Time now spans all years (was current-year-only); `totalEps` in category breakdown now uses `e.ep` (episodes actually watched) for watching entries, not `e.total` (full series count). Spec sections 5, 13, 19 updated to reflect these rules. |
| 1.6 | Stats Screen full redesign. **Time filters:** 7 Days / 30 Days / Custom (date range picker with calendar modal, chip shows "May 4 – Jul 18") / All Time. 90 Days removed. Category filter chips removed. **Hero cards (Option B):** 2×2 grid, number centered in amber, label centered below in muted text. **Breakdown by Category:** renamed section; each type gets a card with 3 mini stat boxes (Titles + eps sub-callout, Watch Time, Avg Rating) and an expandable title list (collapsed by default). Old duplicate bottom breakdown removed. **Section order in Summary:** hero cards → nudge → Breakdown by Category → Genre Distribution → Insights widget. **Timeline tab:** now shows all sections (line chart + Breakdown by Category + Genre Distribution + Insights widget). **Line chart:** replaces bar chart; area fill + line + tap-callout dots (r=18 transparent hit area behind each dot). **"By Type" toggle:** pill button right of the metric toggle; switches chart between single combined line and 3 colored lines (Anime=amber, Movie=amberSoft, TV Show=amberWarm); chart header number changes to per-type breakdown when active. **X-axis labels:** max 8 via `ceil((n-1)/7)` interval; first label left-anchored, last label right-anchored (never clips). **DateRangePicker:** week-row calendar grid, continuous range fill bar with correct left/right half logic for endpoints, amber circle for start, amber circle + outer ring for end. **Data fix:** `localDateStr()` uses local time methods to avoid UTC timezone shift in chart bucketing. **Stats inclusion:** `status === 'watching'` entries now count in stats if `lastWatchedDate` falls within the filter period (i.e. a Watch Sesh was logged in that period). **`buildTimePoints` extracted** as a reusable function for both combined and per-type chart data. **Insights widget** named for the hardest-genre callout; TODO comment marks it for future variant rotation. |
