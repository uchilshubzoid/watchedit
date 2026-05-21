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

### Stage 2.2 — Data Attribution Fixes ✅ Complete (as of May 2026)
See spec v1.7 changelog for full detail. Fixes applied to WatchTower and StatsScreen:
- **WatchTower hero card**: stats pool now includes `watched + dropped + watching` (was watched-only). Date filtering uses `getActivityDate(e)` — `watch_end_date` → `finishedDate`/`lastWatchedDate` → `date` — never `logged_at`. Category pills and watch time come from the same pool. Recently Watched list sorted by activity date.
- **StatsScreen `filterByPeriod`**: 7/30-day cutoff is now start-of-day (not exact millisecond), so chart bar sum always equals the header count.
- **StatsScreen `buildTimePoints` All Time**: now spans all entry years, not current year only. Prior-year months labelled `Jan'25` etc.
- **StatsScreen `totalEps`**: watching entries now contribute `e.ep` (episodes watched) not `e.total` (full series count) to the category breakdown eps callout.

### Stage 2.3 — Onboarding Flow + WatchTower Empty State ✅ Complete (as of May 2026)
Three-screen onboarding built in `app/onboarding/`. Two-phase bootstrap in root layout prevents any flash of the wrong screen. WatchTower empty state replaced with a proper welcome card. Key decisions:
- **Screen 1 (index):** Watcher Name input — auto-focused, amber border on focus, disabled CTA until name entered. Saves to `watchedit_watcher_name`. Routes to Screen 2. Placeholder: `"e.g. Matt, Mathai, Mithai, Machi…"`.
- **Screen 2 (auth):** Auth choice — confirmation chip shows entered name. Google button stubbed — shows `InfoPopup` ("Coming soon — Google sign-in coming in Stage 3") instead of `Alert.alert`. Uses `AntDesign "google"` icon with amber-tinted button style. Guest button saves `watchedit_auth_mode: 'guest'` and routes to Screen 3. Back button uses `useFadeBack`.
- **Screen 3 (guest):** Guest callout — inline name edit (amber TextInput + pencil icon), info card with 3 rows, amber gradient CTA. On confirm: sets `watchedit_onboarding_done: 'true'` and replaces to `/(tabs)`.
- **Bootstrap:** Root layout checks `watchedit_onboarding_done` after fonts load. Redirects to `/onboarding` if not done. Hides splash only after the check + navigate, preventing any flash.
- **WatchTower empty state:** Stats card hidden when `entries.length === 0`. Replaced with amber-tinted welcome card (🎬 emoji, headline, two CTAs, "How does this work? →" ghost link) + hint strip below it.
- **GuidedCarousel:** Full-screen RN Modal with 3 slides. Swipe-only navigation (horizontal ScrollView, `scrollEnabled`, `onMomentumScrollEnd` tracks page). No Next button — "Let's log something →" only on last slide. Slide 1: real logo pill + real FAB + search results card. Slide 2: WatchList mockup. Slide 3: stats card with muted underlined statsLink. Opens from welcome card ghost link.
- **First-log toast:** LogItDetails checks `getEntries()` before `addEntry()`. If empty, fires `{ title: '🎬 WatchLog started!', body: '…', sub: 'Entry #1. Many more await.', isFirstLog: true }`. WatchTower toast renders `sub` line if present.

### Stage 2.4 — UX Polish Pass ✅ Complete (as of May 2026)
- **Back transition:** `useFadeBack` hook (`src/hooks/useFadeBack.js`) fades screen opacity 1→0 over 380ms, calling `router.back()` after 60ms. Wired into StatsScreen, DetailView, onboarding/auth. Each screen wraps its root SafeAreaView in `<Animated.View style={{ flex: 1, opacity }}>` and passes `goBack` to `<BackButton onPress={goBack} />`.
- **BackButton component** (`src/components/BackButton.jsx`): standard `Ionicons chevron-back` size 30. Optional `onPress` prop — defaults to `router.back()`.
- **InfoPopup component** (`src/components/InfoPopup.jsx`): reusable in-app modal, replaces `Alert.alert`. Amber gradient CTA, dark surface + amber border card. Props: `visible`, `title`, `message`, `cta`, `onClose`.
- **WatchList tab row:** replaced horizontal FlatList with horizontal ScrollView + `flexShrink: 0` to fix Android height-measurement gap below tabs.
- **WatchList empty states:** per-tab Ionicons icons (`file-tray-outline`, `play-circle-outline`, `close-circle-outline`, `calendar-outline`, `bookmarks-outline`). Bookmark uses `Ionicons bookmark` / `bookmark-outline`.
- **FilterSheet:** `maxHeight` raised to `'94%'`.
- **LogItSearch:** type filter chips hidden when `bySourceFiltered.length === 0`.
- **LogItDetails:** language field non-mandatory — removed validation gate, shows `hint="Optional"`.
- **StatsScreen:** `statsLoading` state with loading placeholder + retry empty state. `loadStats()` extracted for direct retry. Chart zoom toggle (keyed ScrollView, `isScrollable` guard). Auto-scroll to most recent via `onContentSizeChange`.
- **Tab bar:** height reduced from 63 to 56px.
- **Dev:** "Reset onboarding" button on WatcherScreen for re-testing.

### Stage 2.5 — DetailView Polish + Bug Fixes ✅ Complete (as of May 2026)
See spec v2.0 changelog for full detail. Key decisions:
- **WatchTower refresh:** `DeviceEventEmitter.emit('entryUpdated')` fired from DetailView `handleUpdate`; WatchTower listens in a `useEffect` (belt-and-suspenders alongside `useFocusEffect` which doesn't re-fire after root-stack pop).
- **Episode tracker for watched entries:** condition extended to `isWatched` — all episodes show as checked. Auto-fix on load: watched entries with `ep === 0` and `total > 0` have `ep` set to `total` and `watchTime` estimated.
- **Episode list scrollable window:** capped at `maxHeight: 474` (~10 items); `ScrollView` with `nestedScrollEnabled`; auto-scrolls to next episode on expand for currently-watching (puts next ep ~3rd from top); watched/plan stay at top (y=0).
- **RatingSheet keyboard:** `KeyboardAvoidingView` removed entirely; plain `useState(kbHeight)` + `Keyboard.addListener` + inline `marginBottom` on the sheet. This avoids native-driver conflict with the Modal slide animation (per CLAUDE.md Animated driver rule).
- **Watch date range for currently watching:** `watchingStart = entry.date` (title add date, not first session date); `watchingSameDay` compares against `endDate` (last session). Fixes bug where logging one sesh on day N would show only day N instead of "day 1 → day N". `DEETS_WATCHING` "Started Watching" timeline item also uses `entry.date`.
- **What I Thought card:** edit button context-aware — `star-outline` / "Rate Now" when unrated, `create-outline` / "Edit" when rated; Watch Plan entries show motivational nudge, no Edit button.
- **Watch Deets watermark:** PlayfairDisplay-BlackItalic (installed via `@expo-google-fonts/playfair-display`; registered in `app/_layout.jsx`).
- **Icon audit:** all icons across FilterSheet, LogSeshSheet converted to Ionicons mono/dual-tone.
- **Font sizes:** section labels 11→13px; heroTitle 18→20px; heroStatusText/heroLang/heroTime/genreChipText 11→12px; droppedBanner 12→13/12px; timelineDate 11→12px.

### Stage 2.6 — UX Pass + Recommendations Screen ✅ Complete (as of May 2026)
- **Active days:** WatchTower streak banner → active days count; StatsScreen "Day Streak" → "Active Days" (computed per selected filter window). See spec v2.2.
- **Sub-copy readability + tap targets:** global lift of sub-11px text to 12px+; bookmark hitSlop enlarged; noteBtn pad+hitSlop; TypePill 10→11px. See spec v2.2 changelog.
- **Recommendations screen:** `app/recommendations.jsx` + `RecommendationsScreen`. WatcherScreen has a CTA row; full-screen list with deselect (👍 taps `updateEntry({ recommend: false })`).
- **WatcherScreen name persist:** `handleSave` now calls `AsyncStorage.setItem('watchedit_watcher_name', ...)`. Name loaded from AsyncStorage in `useFocusEffect`. Dev reset-onboarding button removed.
- **LogIt start date for Watched:** Section D shows two `WatchDatePicker` rows for Watched status. "Started (optional)" with `optional` prop (shows "not set" muted italic when empty). `watch_start_date` saved when set.

### Stage 2.7 — WatchList Filters + Platform + Manage Tags + Watcher Overhaul ✅ Complete (as of May 2026)
See spec v2.3 changelog for full detail. Key decisions:
- **Rating filter:** Two-sided slider (0–10) built from scratch with two `PanResponder` instances + `stateRef` pattern (always has fresh value/onChange without recreating responders). Track width measured via `onLayout`. Amber fill between thumbs. "Reset ✕" link when range is narrowed.
- **Watch Date filter:** Inline `MiniCalendar` toggled by tapping From/To fields (`calTarget` state: `null | 'start' | 'end'`). `MiniCalendar` gained a `min` prop — added `minDate`, `isPast()` guard, `prevMonth()` navigation block, and disabled prev chevron at min month. Preset chips apply `last7` / `last30` date ranges. `key={dateRange.start}` / `key={dateRange.end}` force MiniCalendar to remount when presets change.
- **Platform filter:** Single-select chip grid. "Others" maps to entries where `watch_platform` is truthy and NOT in `KNOWN_PLATFORMS`. All filter state (`ratingRange`, `dateRange`, `platform`) added to WatchList.
- **FilterSheet height:** `navItem.paddingVertical` 8→5, `marginBottom` 4→2 (items ~32dp each); `navSectionLabel.marginBottom` 10→6; body `minHeight` 300→320; sheet `paddingBottom` 52→44; `maxHeight: '96%'`. Math: 8 items × 32dp + 18dp label = 274dp, fits in 320dp body.
- **WatchTower deep link:** Type segment bar and label `onPress` pass `params: { type, datePreset: 'last30' }`. WatchList `useFocusEffect` syncs on every focus — `'last30'` computes ISO range; any other value clears it.
- **Platform field in Log It (`watch_platform`):** Between Watch Date and Rating in LogItDetails. `PLATFORMS = ['Netflix', 'Crunchyroll', 'Amazon Prime', 'Hotstar', 'Apple TV', 'Theater', 'Others']`. "Others" reveals `TextInput`. Chip deselects on re-tap. Saved: known platform → name; Others + custom text → custom text; empty → `null`. Editable in edit mode. Load logic: if stored value not in `KNOWN_PLATFORMS` → set chip to "Others", populate `customPlatform`.
- **DetailView platform display:** `whereRow` card between episode tracker and Watch Log. Only shown when `entry.watch_platform` is truthy. Muted mono label "WHERE I WATCHED IT" + primary font value.
- **Active days banner:** `activeDays` computation and JSX banner in WatchTower commented out (pending scope decision).
- **WatcherScreen overhaul:** Profile header — avatar (52px) + name + pencil edit icon in a horizontal `profileIdentity` row; row centered via `alignSelf: 'center'` inside a column `profileSection`. Auth badge ("Guest" / "Google") below the row, also centered. Name TextInput: `returnKeyType="done"` + `onSubmitEditing={handleSave}` — no keyboard dismiss needed. App Preferences section removed. Data & Connections: Export + Import from Other Source only (both "Soon" pill). "Manage Tags & Categories" → `router.push('/manage-tags')` with amber-tint icon (`rgba(239,159,39,0.12)`).
- **ManageTagsScreen:** `app/manage-tags.jsx` + `src/screens/ManageTagsScreen.jsx`. Two tabs (Categories / Genre Tags). Category rename updates all `entry.type` fields via `saveEntries`. Delete blocked with error banner if titles use it ("rename instead" framing). Max 5 enforced on add. Genre delete uses `ConfirmModal` with count-aware copy; on confirm strips genre from all `entry.genre` arrays.
- **Categories system in storage.js:** `getCategories()`, `saveCategories()`, `DEFAULT_CATEGORIES = ['Anime', 'TV Show', 'Movie']` exported. Key: `watchedit_categories`. LogItDetails loads categories in `init()` alongside other entry data; content type selector uses `typeChips` / `typeChip` style (flexWrap: 'wrap') instead of `flex: 1` segmented buttons to handle 3–5 items. `cats.includes(ct) ? ct : firstCat` fallback for API-suggested type on new entries.
- **WatchTower hero card watch time:** `watchTimeBlock` uses `top: 0, bottom: 0, justifyContent: 'center'` (absolute) to vertically center the watch time against the big amber number. `watchTimeNum` color changed from `T.textPrimary` to `T.textMuted` to match the sub-label.

### Stage 2.8 — EAS Build Config + App Assets ✅ Complete (as of May 2026)
- **EAS project linked:** `app.json` updated with `extra.eas.projectId`, `owner: "uchilshubzoids-organization"`, and EAS-generated slug. Project registered on Expo Application Services.
- **App icons updated:** `assets/icon.png` (1024×1024, Play Store / Expo Go), `assets/adaptive-icon.png` (1024×1024 foreground, transparent bg, Android adaptive), `assets/splash.png` — all replaced with final branded assets.
- **Splash screen:** `resizeMode: "cover"` in `app.json` — fills full screen on device.
- **API keys in build:** `eas.json` `preview` profile has an `env` block with `EXPO_PUBLIC_TMDB_TOKEN`, `EXPO_PUBLIC_OMDB_API_KEY`, `EXPO_PUBLIC_MAL_CLIENT_ID` — keys are bundled into the APK at build time.
- **`eas.json` is git-ignored:** added to `.gitignore` and untracked via `git rm --cached`. File lives locally and is read by EAS CLI at build time but never pushed to GitHub. Production profile env keys to be added before Play Store AAB build.
- **Build commands:**
  - APK (sideload / device testing): `eas build --platform android --profile preview`
  - AAB (Play Store submission): `eas build --platform android --profile production`
- **Play Store:** Developer account created; verification in progress. Package name: `com.watchedit.app`. First submission pending account approval.

### Stage 2.9 — Font System Expansion + UX Bug Fixes ✅ Complete (as of May 2026)
- **Fredoka font system:** Added `Fredoka_400Regular` from `@expo-google-fonts/fredoka`. Registered as `'Fredoka-Regular'` in `app/_layout.jsx`. New design token `T.fontFun = 'Fredoka-Regular'` added to `src/constants/tokens.js`. Used for subtexts, labels, and secondary copy across all screens (not titles, CTAs, or numbers — those stay Nunito; not dates/mono — those stay Inconsolata). Varela Round was trialled for numbers then rolled back; all number styles remain Nunito.
- **WatchList date bug fix:** `dateLine()` helper in WatchList now shows `finishedDate` for watched entries (not `e.date` which is the log date). Ongoing/watching shows `lastWatchedDate`; dropped/paused show `lastWatchedDate`. `e.date` (logged date) is never surfaced on title cards.
- **TypePill on WatchList cards:** Each WatchList title card now shows a `<TypePill>` chip instead of plain text for content type. Progress line sits inline next to the pill in a `cardSubRow` flex row with `gap: 6`.
- **Ongoing shows null fix:** `progressLine()` in WatchList now handles `null` total — renders `"X eps watched"` (not `"X of null eps watched"`) when `e.total` is falsy and the show is not marked `ongoing`. Ongoing shows render `"X eps · Ongoing"`.
- **WatchTower "View all →" CTA:** Currently Watching section header now shows a "View all →" pressable that routes to `/(tabs)/watchlist` with `params: { tab: 'watching' }`, matching the existing "Recently Watched" pattern.
- **Splash screen resizeMode fix:** `app.json` `splash.resizeMode` changed from `"cover"` to `"contain"` — centers the text-only splash image correctly instead of filling/cropping it.
- **WatchList swipe navigation:** `PanResponder` added to WatchList for horizontal swipe between tabs. Threshold: `|dx| > 50` to trigger, with `onMoveShouldSetPanResponder` gating at `|dx| > 12 && |dx| > |dy| * 2` (strongly horizontal). Stale closure avoided via `tabRef.current = tab` updated every render; `animateSwitchRef.current` function ref also updated every render.
- **WatchList swipe animation:** Tab switches animate with crossfade + slide. Exit: content slides to `±40px` and fades to `opacity 0` over 140ms. Enter: content enters from `∓40px` and fades to `opacity 1` over 180ms. Uses `Animated.Value` (slideAnim, fadeAnim) with `useNativeDriver: true`. FlatList wrapped in `<Animated.View>` that holds the pan handlers.
- **LogIt bottom sheet padding:** `sheet` style in LogItSearch has `paddingBottom: 15` for breathing room at the bottom of the sheet.
- **FilterSheet polish:**
  - `navSectionLabel.fontSize` and `paneTitle.fontSize` raised from 9 → 11.
  - `navItem.marginBottom` raised from 2 → 5 for breathing room between categories.
  - `navLabelActive` no longer sets `fontFamily: T.fontTitleMedium` — only sets `color: T.amber`. This fixes font switching (Fredoka → Nunito-SemiBold) on select/deselect.
  - Unrated toggle wrapped in a `View` with conditional amber outline: `borderWidth: 1.5, borderColor: 'transparent'` normally; `borderColor: 'rgba(239,159,39,0.55)'` when toggle is off (`!unrated`).

### Stage 2.10 — Search Web Mode + Nav Icon Refresh ✅ Complete (as of May 2026)
- **Search screen dual-mode:** `SearchScreen` now has two modes toggled by an inline CTA (`"Searching your WatchLog · Search the web instead →"` / `"← Searching the web · switch to WatchLog"`). WatchLog mode (default) is unchanged — live search across entries. Web mode calls `searchTitles()` on submit and auto-triggers when switching modes with an existing query typed.
- **Web mode result layout:** Results split into two ordered sections: (1) `IN YOUR WATCHLOG` — API results matched against entries by normalized title, rendered as exact WatchList cards (left status bar, `typeAccentColor`, date line, TypePill, rating, bookmark toggle, Rate it nudge), sorted by Most Recent Activity, tap → DetailView; (2) `WEB RESULTS` / `MORE FROM THE WEB` — unmatched results as LogIt result cards with `+ Watch Plan`, `WatchedIt →`, and ⓘ preview. Section label font: `T.fontTitle` 13px.
- **Filter chips fix:** Type filter chip ScrollView wrapped in `<View style={styles.filterBlock}><ScrollView>` (same pattern as LogItSearch). Direct `style=` on the ScrollView caused Android flex-column height expansion — the View wrapper constrains it.
- **Toast on Search screen:** `useFocusEffect` reads `consumePendingToast()` and shows the amber slide-up toast here when user submits via `WatchedIt →` from web mode. Toast system identical to WatchTower (10s auto-dismiss, ✕, `useNativeDriver: true`).
- **`WatchedIt →` from Search:** Calls `router.push('/logit/details', { params: { resultJson } })`. `router.back()` after submit returns to SearchScreen; `dismissLogItSearch` event is a no-op since the modal isn't open.
- **Search bar icon:** `Ionicons search-outline` replaces the 🔍 emoji.
- **Nav icon refresh (`app/(tabs)/_layout.jsx`):** `MaterialCommunityIcons` imported alongside Ionicons. Watch Tower: `castle`; WatchList: `script-text` / `script-text-outline` (filled/outline on focus); Search: `telescope`. Watcher unchanged (`person` / `person-outline`, Ionicons). `TabIcon` helper still used for Watcher; Watch Tower / WatchList / Search use inline `MaterialCommunityIcons` with explicit `color` prop.

### What's NOT built yet (do these next in order)
1. **Play Store submission** — account verified; add env keys to `production` profile in `eas.json`, then submit AAB + store listing

---

## File Structure

```
/
├── app/                           ← Expo Router — all route files are thin re-exports
│   ├── _layout.jsx                ← Root layout: font loading, two-phase bootstrap, GestureHandlerRootView
│   ├── (tabs)/
│   │   ├── _layout.jsx            ← Tab navigator (5 slots, + FAB opens logit modal)
│   │   ├── index.jsx              ← Watch Tower tab
│   │   ├── watchlist.jsx          ← WatchList tab
│   │   ├── search.jsx             ← Search tab
│   │   └── watcher.jsx            ← Watcher/Profile tab
│   ├── onboarding/
│   │   ├── _layout.jsx            ← Onboarding stack (slide_from_right, 280ms)
│   │   ├── index.jsx              ← Screen 1: Watcher Name input
│   │   ├── auth.jsx               ← Screen 2: Auth choice (Google / Guest)
│   │   └── guest.jsx              ← Screen 3: Guest mode callout + inline name edit
│   ├── logit/
│   │   ├── search.jsx             ← Log It Step 1 (modal)
│   │   └── details.jsx            ← Log It Step 2
│   ├── detail/
│   │   └── [id].jsx               ← Detail view (dynamic route)
│   ├── manage-tags.jsx            ← Manage Tags & Categories screen
│   └── stats.jsx                  ← Statistics screen
├── src/
│   ├── CLAUDE.md                  ← this file
│   ├── constants/
│   │   └── tokens.js              ← Design tokens (T object) — LOCKED
│   ├── screens/                   ← Screen components (logic lives here, app/ re-exports)
│   │   ├── WatchedItApp.jsx       ← MIGRATION REFERENCE — do not add features here
│   │   ├── WatchTower.jsx         ← Home screen — welcome card (empty), stats, toast, GuidedCarousel
│   │   ├── WatchList.jsx          ← List screen
│   │   ├── DetailView.jsx         ← Watch Deets / detail view
│   │   ├── LogItSearch.jsx        ← Log It Step 1 (RN Modal, not a route — controlled by tab layout)
│   │   ├── LogItDetails.jsx       ← Log It Step 2 (stack route) — first-log detection
│   │   ├── SearchScreen.jsx       ← Search tab
│   │   ├── StatsScreen.jsx        ← Statistics screen
│   │   ├── WatcherScreen.jsx      ← Watcher / profile screen
│   │   ├── ManageTagsScreen.jsx   ← Manage Tags & Categories (Categories + Genre Tags tabs)
│   │   └── RecommendationsScreen.jsx ← Recommendations list
│   ├── components/                ← Shared UI components
│   │   ├── Poster.jsx             ← Poster thumbnail with initials fallback
│   │   ├── TypePill.jsx           ← Movie / TV Show / Anime pill
│   │   ├── StarRating.jsx         ← Tap + drag star rating (0.5 steps, haptics)
│   │   ├── FilterSheet.jsx        ← Filter & Sort bottom sheet (@gorhom/bottom-sheet)
│   │   ├── LogSeshSheet.jsx       ← Log a Sesh bottom sheet
│   │   ├── RatingSheet.jsx        ← Mini rating sheet
│   │   ├── MiniCalendar.jsx       ← Date picker calendar
│   │   ├── BlockingPopup.jsx      ← Modal popup (movie-watching block, rating required)
│   │   ├── BackButton.jsx         ← Standard back button (chevron-back size 30, accepts onPress)
│   │   ├── InfoPopup.jsx          ← In-app info modal replacing Alert.alert
│   │   └── GuidedCarousel.jsx     ← 3-slide onboarding carousel modal (swipe-only navigation)
│   ├── hooks/
│   │   └── useFadeBack.js         ← Fade-out back transition hook (opacity + router.back)
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
T.fontBody        = 'Nunito-Regular'       // 400w — body, text inputs, date pickers
T.fontBodyMedium  = 'Nunito-Medium'       // 500w
T.fontMono        = 'Inconsolata-Regular'  // mono — labels, stats, dates
T.fontFun         = 'Fredoka-Regular'      // 400w — subtexts, labels, secondary copy
```

**`fontFun` usage rule:** Use `T.fontFun` (Fredoka) for non-interactive secondary copy — descriptions, sub-labels, hints, empty state copy, toast body text. Keep `T.fontBody` / `T.fontBodyMedium` for text inputs, date pickers, and any multi-line editable areas. Keep `T.fontMono` for dates and technical mono labels. Keep Nunito for titles, numbers, and CTAs.

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
├── onboarding               Onboarding stack (animation: none from root)
│   ├── index                Screen 1 — Watcher Name
│   ├── auth                 Screen 2 — Auth choice
│   └── guest                Screen 3 — Guest callout
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

**Onboarding bootstrap (two-phase, in `app/_layout.jsx`):**
```js
// Phase 1: once fonts load, check if onboarding was completed
useEffect(() => {
  if (!fontsLoaded) return;
  AsyncStorage.getItem('watchedit_onboarding_done').then(done => {
    setReady(done ? 'tabs' : 'onboarding');
  });
}, [fontsLoaded]);
// Phase 2: navigate, then hide splash — prevents any flash of wrong screen
useEffect(() => {
  if (!ready) return;
  if (ready === 'onboarding') router.replace('/onboarding');
  SplashScreen.hideAsync();
}, [ready]);
```
AsyncStorage keys used by onboarding:
- `watchedit_watcher_name` — user's display name (string)
- `watchedit_auth_mode` — `'guest'` | future: `'google'`
- `watchedit_onboarding_done` — `'true'` when complete (set in Screen 3)

**Success toast after Log It submit:**
```js
// In LogItDetails — before router.back() on new entry:
// check if this is the first-ever log
const existing = await getEntries();
const isFirstLog = existing.length === 0;
await addEntry({ ... });
setPendingToast(isFirstLog ? {
  title: '🎬 WatchLog started!',
  body: `${title} · ${statusLabel}`,
  sub: 'Entry #1. Many more await.',
  isFirstLog: true,
} : {
  title: isPlan ? '📋 Added to Watch Plan' : '🎬 Logged!',
  body: isPlan ? `${title} is on your plan` : `${title} logged as ${statusLabel}`,
});
DeviceEventEmitter.emit('dismissLogItSearch'); // closes search modal simultaneously
router.back();
// WatchTower reads consumePendingToast() in useFocusEffect and displays it
// toast.sub is rendered as a third line if present (fontMono, 10px, dimmed)
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
  ratingSource    // string | null  — "MAL" | "TMDB" | "OMDB" — source of the global rating
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
- **Success toast:** Shown on Watch Tower after Log It submit. 10s auto-dismiss, top-right ✕ button, positioned 8px above tab bar. Passed via `toastBridge` singleton (not navigation params). Supports optional `sub` field (third line, fontMono 10px dimmed). `isFirstLog: true` triggers special first-entry copy.
- **Onboarding flow:** 3-screen stack in `app/onboarding/`. Gated by `watchedit_onboarding_done` AsyncStorage key. Two-phase bootstrap in root layout ensures splash stays visible during the check. Onboarding completion sets the key and `router.replace('/(tabs)')`.
- **WatchTower empty state:** Stats card hidden when `entries.length === 0`. Welcome card shown instead: amber-tinted, 🎬 emoji, two CTAs (Log It + Watch Plan, both emit `openLogIt`), ghost link opens GuidedCarousel.
- **GuidedCarousel:** `src/components/GuidedCarousel.jsx`. Full-screen RN Modal, 3 slides, mini screen mockups, horizontal ScrollView with `scrollEnabled={false}` (manually controlled via `scrollTo`). Resets to slide 0 on `visible` change. Last slide CTA closes modal and emits `openLogIt`.

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
- **Stats data inclusion** — stats pool must include `status === 'watched'`, `e.dropped`, AND `status === 'watching'` (including paused — the date filter naturally excludes paused entries with no recent session). Do NOT include Watch Plan entries. `logged_at` is NEVER used for stats attribution — it is an audit field only.
- **Stats date attribution priority** — `watch_end_date` (ISO string, parsed with `T12:00:00`) → `finishedDate` / `lastWatchedDate` (display string, parsed with `${str}, YYYY 12:00:00`) → `date`. This applies to both WatchTower and StatsScreen. The helper in WatchTower is `getActivityDate(e)`; in StatsScreen it is `parseActivityDate(e)` — keep them in sync.
- **WatchTower stats pool** — use `entries.filter(e => e.status === 'watched' || e.dropped || e.status === 'watching')` then filter that pool by `getActivityDate(e) > thirtyAgo`. The UI-only subsets (`watched` for Recently Watched, `watching` for Currently Watching section) are separate from the stats pool.
- **`buildTimePoints(entries, filter, customStart, customEnd)`** — reusable function in StatsScreen. Pass a pre-filtered (by type) entry list to get per-type time series. All time-bucket arrays share the same X-axis positions regardless of input entries. All Time mode now spans all entry years.
- **StatsScreen `byType` toggle** — when ON, the chart Y-axis uses `typeMaxVal` (max across types), not `maxVal` (combined total). The `effectiveMax` variable switches between them. `py()` depends on `effectiveMax`, so define it after `effectiveMax`.
- **Calendar widget (DateRangePicker)** — uses explicit week rows (not `flexWrap`) to guarantee 7 cells per row. Range fill uses `left`/`right` absolute positioning: full width for mid-range cells, left-half for end cell, right-half for start cell. `DR_CELL = (SCREEN_W - 72) / 7` (20×2 overlay padding + 16×2 sheet padding = 72).
- **Onboarding routing** — never call `router.push('/onboarding')` from inside the app. The bootstrap in `app/_layout.jsx` handles the initial redirect. Onboarding is a one-way flow: `index → auth → guest → /(tabs)`. Back-navigation is supported on auth screen only.
- **`watchedit_onboarding_done`** — the single key that gates onboarding. Do not check `watchedit_watcher_name` or `watchedit_auth_mode` for routing decisions — they can be set independently. Only `watchedit_onboarding_done === 'true'` means onboarding is complete.
- **First-log detection** — in LogItDetails `handleSubmit`, call `getEntries()` BEFORE `addEntry()` to get the pre-add count. `existing.length === 0` means this is the first entry. Do not call `getEntries()` after `addEntry()` for this check.
- **WatchTower stats card** — conditionally rendered as `{entries.length > 0 && <View style={styles.card}>...</View>}`. The welcome card and hint strip replace it when the log is empty. Do not show both.
- **GuidedCarousel scroll** — uses `scrollEnabled={true}` on the ScrollView; page tracking via `onMomentumScrollEnd` → `Math.round(contentOffset.x / SW)`. Navigation is swipe-only — there is no Next button. Do not revert to imperative `scrollTo` calls; the swipe + `onMomentumScrollEnd` approach is the correct pattern.
- **Back transition** — screens with a BackButton that should fade on exit use the `useFadeBack` hook. The screen's root view must be `<Animated.View style={{ flex: 1, opacity }}>` wrapping the SafeAreaView. Pass `goBack` as `onPress` to BackButton. The 60ms `setTimeout` before `router.back()` gives the fade a visible head-start before the native slide animation begins. Do not remove the delay — without it the fade and slide start simultaneously and the fade is imperceptible.
- **InfoPopup vs Alert.alert** — use `InfoPopup` for any in-app informational message. Do not use `Alert.alert` — it breaks the design language and is not styled.
- **WatchList tabs** — must be rendered as a horizontal `ScrollView` with `flexShrink: 0, flexGrow: 0` on the tab row style. Do NOT use a horizontal `FlatList` — it mis-measures its own height in a flex-column SafeAreaView on Android, creating a gap below the tabs.
- **LogItDetails language** — language is optional. Do not add a validation gate that blocks submit when language is empty. The field shows `hint="Optional"`.
- **LogItSearch type chips** — chips are only rendered when `(bySourceFiltered?.length ?? 0) > 0`. When results are zero, only the gone-niche callout renders.
- **StatsScreen loading** — `statsLoading` boolean gates the chart render. Use `loadStats()` (not direct `setEntries`) anywhere you need to trigger a re-fetch (e.g., retry button). `loadStats` always calls `setStatsLoading(true)` first and resolves via `.catch()`.
- **StatsScreen zoom** — `isScrollable = n * 36 > SCREEN_W - 64`. When `zoomedOut`, `svgWidth = SCREEN_W - 64` (fixed). Chart ScrollView must have `key={zoomedOut ? 'chart-z' : 'chart-s'}` to force remount on zoom toggle — without it the SVG can render blank due to react-native-svg width reconciliation issues.
- **`entryUpdated` event** — `DeviceEventEmitter.emit('entryUpdated')` must be fired from `handleUpdate` in DetailView after every entry save. WatchTower listens via `useEffect` (not just `useFocusEffect`) because `useFocusEffect` does not re-fire when returning from a root-stack screen pushed on top of a tab. Both listeners must coexist.
- **Watch date range (currently watching)** — "Watching Since" section uses `watchingStart = entry.date` (when the title was added) as the range start, NOT `firstSesh?.date_display`. Using the first session date causes a single-session entry to show only that session's date instead of the full range. `DEETS_WATCHING` "Started Watching" timeline item must also use `entry.date`.
- **Episode tracker condition** — render for `(isWatching || isDropped || isWatched) && !isMovie && (epTotal > 0 || entry.ongoing || epCurrent > 0)`. The third clause `epCurrent > 0` is critical — it ensures the tracker shows even when the episode total is unknown, as long as at least one episode has been logged. When `epTotal === 0`, show "X eps watched" (not "X of 0 episodes") and hide the progress bar and percentage.
- **Episode list scroll** — the expanded episode list is a `ScrollView` with `maxHeight: 474` and `nestedScrollEnabled`. On expand, auto-scroll: for `isWatching`, compute `y = Math.max(0, (entry.ep - 2) * 48)` to put the next episode near the top; for all other statuses, stay at y=0. Use a 80ms `setTimeout` before `scrollTo` so the layout is ready.
- **PlayfairDisplay-BlackItalic** — registered in `app/_layout.jsx` as `'PlayfairDisplay-BlackItalic'`. Installed via `@expo-google-fonts/playfair-display`. Used only for the Watch Deets watermark (decorative background text). Do not use it for any readable content.
- **`ratingSource` field** — every new entry saved by LogItDetails must include `ratingSource: show?.source || null` alongside `malRating`. DetailView reads `entry.ratingSource` to display the correct source label and colour; falls back to `'MAL'` for legacy entries. Mapping: MAL → "MyAnimeList" (blue #6B9BDF), TMDB → "TMDB" (teal #01B4E4), OMDB → "IMDB" (yellow #F5C518). Never hardcode the source as 'MAL' in DetailView.
- **WatchTower stats card time label** — the period chip (amber dot + pill background) has been replaced with plain inline text on the same line as "titles watched": `<Text>"titles watched"</Text><Text>" · last 30 days"</Text>` inside a `<Text>` wrapper with `textAlign: 'center'`. Styles `period`, `dot`, `periodText` no longer exist — do not recreate them.
- **WatchTower Currently Watching cards** — width 284px, height 138px, poster `size={79}` (height ≈ 110px). Episode line and last-watched line are wrapped in a `<View>` so `justifyContent: 'space-between'` on the content column treats them as one bottom unit. `watchDate` has `marginTop: 2`. `watchTitle` must use `T.textPrimary` — never amber (amber is reserved for CTAs and ratings).
- **InsightsWidget (StatsScreen)** — `computeInsights(entries)` is a pure function returning up to 9 insight objects `{ id, icon, iconColor, headline, body, freshAt }`. Minimum 3 qualifying entries required per insight or it is skipped. AsyncStorage key `watchedit_insights_last_viewed` stores `{ timestamp }` — read on mount to decide NEW badges, then immediately overwritten with `Date.now()` so the next session sees current data as non-new. Sorted: insights whose `freshAt > prevTimestamp` (NEW) come first, then the rest, both groups descending by `freshAt`. Widget is rendered after `<GenreInsights />` in both Summary and Timeline tabs. The old `hardestCard` JSX and styles are removed — do not recreate them.
- **WatcherScreen name persistence** — `handleSave` must call `AsyncStorage.setItem('watchedit_watcher_name', tempName)` before updating state. `useFocusEffect` loads the name from AsyncStorage on every focus so display stays in sync. Dev "Reset onboarding" button has been removed — do not re-add it.
- **Recommendations screen** — `app/recommendations.jsx` re-exports `RecommendationsScreen`. WatcherScreen has a CTA row (always visible) that routes to `/recommendations`. The screen shows all `e.recommend === true` entries as WatchList-style cards with `<Poster>`. Deselecting taps `updateEntry({ ...entry, recommend: false })` and immediately removes the card from local state (optimistic update). Do not embed recommendations inline in WatcherScreen.
- **LogIt Watch Date for Watched entries** — the date card shows two `WatchDatePicker` components when `watchStatus === 'watched'`: "Started (optional)" with `optional={true}` prop (renders "not set" in muted italic when `watchStartDate` is empty, only saves if user interacts) and "Finished" (always shows, defaults to today). The `WatchDatePicker` component accepts an `optional` prop that changes the display text to "not set" when `value` is empty and applies `dpStyles.triggerDateUnset` style. For new Watched entries, submit saves `watch_start_date: watchStartDate || null`.
- **Rating is mandatory for Watched status** — submitting without a rating shows the BlockingPopup ("C'mon, you know what you felt"). There is no "continue without rating" escape hatch. This is intentional — intentional, rated logs are the core value of the app. Do not add a secondary bypass path.
- **`watch_platform` field** — optional string on entries. Known platform → saves chip label directly. "Others" + custom text → saves custom text. "Others" + empty → `null`. Load logic in edit mode: if stored value is truthy and not in `KNOWN_PLATFORMS`, set chip to 'Others' and populate `customPlatform`. Displayed in DetailView as "WHERE I WATCHED IT" one-line card (muted mono label + primary value); only rendered when `entry.watch_platform` is truthy.
- **Categories system** — `getCategories()`, `saveCategories()`, and `DEFAULT_CATEGORIES = ['Anime', 'TV Show', 'Movie']` are exported from `src/db/storage.js`. AsyncStorage key: `watchedit_categories`. Max 5 categories. LogItDetails loads categories in `init()` and stores in `categories` state; the content type selector uses `typeChips` / `typeChip` styles (flexWrap: 'wrap') instead of equal-width `segBtn` to handle 3–5 categories without cramping. For new entries from search results, API-suggested type is validated against loaded categories (`cats.includes(ct) ? ct : firstCat`). For edit mode, `entry.type` is used as-is — preserves any saved category name including custom ones.
- **ManageTagsScreen** — `app/manage-tags.jsx` re-exports `ManageTagsScreen`. Uses `getCategories` / `saveCategories` / `DEFAULT_CATEGORIES` from storage (not local copies). Category rename calls `saveEntries(updatedEntries)` to update all matching `entry.type` fields atomically. Delete is blocked with an error banner (not a modal) if any entries use that category — error copy frames it as "rename instead." Genre delete uses `ConfirmModal` with count-aware body copy; on confirm strips the genre from all `entry.genre` arrays via `saveEntries`. Both tabs share the same `entries` state loaded in a single `useFocusEffect`.
- **WatcherScreen profile layout** — `profileSection` is a column with `alignItems: 'center'`. Within it, `profileIdentity` is a horizontal row (`flexDirection: 'row'`, `alignSelf: 'center'`) containing the avatar, name text, and pencil icon — it hugs its content and is centered as a unit. Auth badge sits below with `alignSelf: 'center'`. In edit mode, `editRow` has `width: '100%'` so the TextInput and buttons expand to fill the card width. Name TextInput has `returnKeyType="done"` and `onSubmitEditing={handleSave}` — both keyboard submit and the Save CTA call `handleSave` directly without needing to dismiss the keyboard first.
- **FilterSheet categories note** — FilterSheet still uses the hardcoded `CATEGORIES` array for its left nav (Sort, Category, Rating, Watch Date, Platform, Language, Genre). This is a UI navigation list, not the user-configurable content categories. Do not conflate the two. The user-configurable categories (from `getCategories()`) are used only in LogItDetails and ManageTagsScreen.
- **`fontFun` vs `fontBody`** — use `T.fontFun` (Fredoka) for secondary copy, subtexts, labels, hints, and empty state text. Never use it on text inputs, date pickers, or multi-line editable TextInput areas — those must stay `T.fontBody` (Nunito-Regular) to avoid visual weight mismatches in editable fields.
- **WatchList `tabRef` pattern** — `PanResponder` is created once in a `useRef` so its callbacks capture stale state. Solve with `tabRef.current = tab` (updated every render) and `animateSwitchRef.current = fn` (function ref updated every render). Pan handlers read `tabRef.current` and call `animateSwitchRef.current(...)` — never the raw state variable directly.
- **WatchList swipe vs scroll coexistence** — `onMoveShouldSetPanResponder` returns `true` only when `Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2`. This ensures vertical scroll goes to FlatList and horizontal swipe goes to the PanResponder. Do not relax this threshold — it will break vertical scroll.
- **FilterSheet unrated toggle outline** — the native `Switch` component cannot conditionally show a border. Wrap it in a `View` with `borderWidth: 1.5, borderColor: 'transparent'` by default and `borderColor: 'rgba(239,159,39,0.55)'` when `!unrated`. Do not attempt to style the Switch itself.
- **WatchList `dateLine`** — `e.date` (the log/add date) must never appear on title cards. `dateLine()` uses: `finishedDate` for watched, `lastWatchedDate` for watching/paused/dropped. If neither is set, return empty string.
- **WatchList `progressLine`** — for entries where `e.total` is null/falsy and `!e.ongoing`, render `"${e.ep} eps watched"` (no denominator). Only render `"X of Y eps watched"` when both `e.ep` and `e.total` are truthy.
- **SearchScreen web mode** — two modes toggled by inline CTA. WatchLog mode: live filter over `entries` state (unchanged). Web mode: calls `searchTitles(query, entries)` on submit; results split into `inLogEntries` (WatchList cards, tap → DetailView) and `newApiResults` (LogIt cards with CTAs). `inLogEntries` derived by mapping `r.inLog === true` results → `entries.find(e => e.title.toLowerCase() === r.title.toLowerCase())`. Sorted by `parseActivityDate` descending.
- **SearchScreen horizontal filter chips** — the type filter chip ScrollView MUST be wrapped in `<View style={styles.filterBlock}><ScrollView horizontal ...>`, NOT `<ScrollView style={styles.filterBlock}>`. In a flex column SafeAreaView, putting `style` directly on a horizontal ScrollView causes it to expand to fill all available vertical space on Android. The View wrapper constrains height to the chip content. This is the same pattern used in LogItSearch.
- **Toast on SearchScreen** — `useFocusEffect` reads `consumePendingToast()` and shows the toast on the Search screen when the user submits via `WatchedIt →` from web mode. `router.back()` from LogItDetails returns to SearchScreen (not WatchTower) in this flow, so the toast appears here. `dismissLogItSearch` event emitted by LogItDetails is a no-op since the Log It modal is not open.
- **Nav icons** — `MaterialCommunityIcons` is now imported in `app/(tabs)/_layout.jsx` alongside Ionicons. Watch Tower uses `castle`, WatchList uses `script-text`/`script-text-outline`, Search uses `telescope`. Watcher stays on Ionicons `person`/`person-outline`. The `TabIcon` helper only works with Ionicons (relies on `${name}-outline` pattern); for MaterialCommunityIcons tabs, write inline JSX with explicit `color` and `name` props.
