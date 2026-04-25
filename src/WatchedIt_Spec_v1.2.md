# WatchedIt — Full Product Spec v1.2
*Last updated: April 2026. Stage 1 complete — UI shell built. Moving to Expo (React Native).*

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

**What React Native changes vs our web shell:**
- `div` → `View`, `p` → `Text`, `img` → `Image`
- CSS objects → `StyleSheet.create()`
- Browser navigation → React Navigation library
- `navigator.vibrate` → Expo Haptics (much better on Android)
- Bottom sheets → `@gorhom/bottom-sheet` (native feel)

**What stays identical:**
- All product decisions and spec
- Component logic and state management
- Design tokens and visual language
- Data model
- API integration approach

---

## 2. Naming Conventions

| Term | Meaning |
|---|---|
| Log It | The action of recording a watch entry |
| WatchLog | The diary/history concept — your full record |
| WatchList | The list screen — all entries across all statuses |
| Watch Tower | The home screen |
| Watch Sesh | A single episode-watching session |
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

---

## 5. Screen: Watch Tower (Home)

### Stats Block
- "Last 30 days" badge — amber dot · muted mono label
- "Titles Watched" — large amber 80px number
- Watch time — `~Xh` with est. flag if estimated
- Category pills: Anime · Movie · TV Show with counts
- *"See your stats →"* → Statistics screen

### Currently Watching
- Horizontal scroll, Paused entries hidden by default
- Card: type pill · title (2 lines fixed height) · episode line · last watched
- Episode line: `Ep 18 of 28` or `9 eps watched · Ongoing`
- Tap → Detail View (Currently Watching)

### Recently Watched
- Last 5 Watched entries
- Card: poster · title · type pill · language · date · rating · rewatch ↺ icon
- *"View all →"* → WatchList

---

## 6. Screen: WatchList

### Tabs
All · Watching · Watched · Watch Plan · Bookmarks

### Filters
Category chips: Anime · Movie · TV Show · Rewatched · Dropped
Paused toggle — appears in Watching tab only, hidden by default
Sort: Most Recent (default) · Oldest · Highest Rated · A–Z

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
- Paused / Dropped status tag — top right, rounded on bottom-left
- Bookmark — right edge gradient border (amber fading down)

### Empty states
Each tab has its own personality-led empty state message.

---

## 7. Screen: Log It

### Architecture
- **Step 1** — Bottom sheet: title search only
- **Step 2** — Full screen: all details, status, rating, reaction
- **Success** — Full screen confirmation

### Step 1 — Search
- Single text input, search on submit (not live)
- Sources: **MAL → TMDB → OMDB** in priority order
- Results: source badge · poster · title · year
- Single result already in WatchLog → rewatch callout shown immediately (no tap needed)
- Multiple results with one in log → tap to select, rewatch callout expands inline
- No results → *"Woah you've gone niche! No results found online...add manually to log?"*
- Manual entry → typed title persists to Step 2 with "Manual" tag

### Step 2 — Details
Sticky top bar: back arrow · title + tags (Manual / ↺ Rewatch) · poster thumbnail

Fields in order:
1. Content type — Movie / TV Show / Anime pill selector
2. Language — text input
3. Genre tags — fetched + editable
4. Episodes — number input + Ongoing toggle (TV/Anime only)
5. Episode runtime — 24min / 45min / Custom presets (TV/Anime only)
6. Watch time — derived display: `24 min/ep × 28 eps = 11h 12m est.` (shown below runtime)
7. Watch status — Watched (default) / Watching / Watch Plan
8. Episode picker — appears for Watching + TV/Anime
9. Rating — star rating, tap left half = X.5, tap right half = X, drag for speed, haptic on each step
10. Reaction — free text 500 chars, emoji supported
11. Recommend toggle
12. Bookmark toggle

Sticky bottom: **Log It ✓** amber gradient button

### Blocking popups (centred overlay)
- Movie + Watching → 🍿 *"Finish the movie first!"* · CTA: *"Lol faine, I'll finish it"* · Secondary: *"Actually I'm done"* (flips to Watched)
- Submit without rating → ⭐ *"C'mon, you know what you felt"* · CTA: *"Okay okay, I'll rate it"*

### Inline errors
Validation errors appear directly below the relevant field.

### Inline callouts
Rewatch detection, duplicate warning — expand within the flow, not in a modal.

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

## 8. Screen: Detail View — Watched

### Hero card
Poster · Title (deep orange, 18px 800w) · Type · Language · Watch time · Genre tags
Top actions: Rewatch · Edit · Unwatch (rare — top right)
Unwatch → confirmation bottom sheet

### When I Watched It
Watch date. Rewatch icon if applicable.

### What I Thought
Your rating (amber 48px) · Global ratings per source (coloured source dot + name + rating, side by side) · Reaction text · Watched / Recommended / Bookmarked badges

### Watch Deets
Timeline most recent first, infinite scroll:
📌 Added to Watch Plan · ▶️ Started Watching · 🎬 Watch Sesh · ✅ Finished · 🔁 Rewatch logged

---

## 9. Screen: Detail View — Currently Watching

Same as Watched with differences:

### Hero card additions
Update Watch Sesh · Mark All Watched — prominent CTAs inside hero card

### When I Watched It
Date range: start → last sesh. Last watched date.

### What I Thought
Rating optional (in-progress). `ep avg: X.X` shown as muted reference below.

### Episode Tracker
Progress bar (hidden for Ongoing) · X of Y episodes · % complete
Episode list — three states: ✅ Watched (amber) · ⬜ Up next (amber border) · ⬜ Unwatched
Single tap → mark watched. Long press → multi-select range. Confirm bar slides up.
Episode notes: tap watched episode → 100 char field, emoji supported.

---

## 10. Screen: Detail View — Watch Plan

### Hero card
Poster · title · type · language · watch time (estimated total) · genre tags
Primary CTA: **Mark as Watched** → opens Log It prefilled

### Added On
Created date. "Not counted in stats until watched" note.

### What Others Think
Global ratings from linked sources.

### Watch Deets
📌 Added to Watch Plan — date. Nothing else until upgraded.

---

## 11. Screen: Search

Real-time search across WatchList entries.
Matches: title · genre · language · type.
Same card style as WatchList. No filters needed — search is the filter.

---

## 12. Screen: Statistics

**Entry:** *"See your stats →"* on Watch Tower

### Time filters
Last 7 Days · Last 30 Days · Last 90 Days · All Time · Custom (date range picker)

### View toggle
Summary · Timeline

### Summary view
- Titles watched in period
- Watch time in hours (est. flag if applicable)
- Category breakdown — bar chart (Anime / Movie / TV Show)
- Average rating given
- Longest watch streak

### Timeline view
Granularity: ≤30 days = daily · >30 days = monthly
X axis: dates/months · Y axis: titles or hours (toggle)
Stacked bars by category when All selected.
Horizontal scroll if wide. Empty periods = zero, no gaps.

### Category filter
All · Anime · Movie · TV Show — filters all metrics simultaneously

### Empty state
*"Nothing watched here. Go fix that."*

### Share function (Stage 2)
Shareable stats card — amber on dark, top stats + top rated title. Exportable as image.

---

## 13. Screen: Watcher (Profile)

- Avatar: initials in amber circle
- Name, email
- Edit profile
- Manage tags & categories
- My Recommendations — entries where recommend = true
- Connected accounts (Stage 3) — MAL OAuth
- Import data (Stage 3) — Netflix CSV, MAL history
- Log out

---

## 14. Watch Status Model

| Status | Description | Counts in stats? |
|---|---|---|
| Watched | Completed | Yes |
| Currently Watching | In progress | No (until finished) |
| Paused | Sub-state of Watching — on hold | No |
| Dropped | Abandoned — rating mandatory on drop | Yes |
| Watch Plan | Not started | No |

**Ongoing shows:** No fixed episode total. Shows `X eps watched · Ongoing` instead of progress bar percentage.

**Auto-complete:** Last episode marked → prompts mandatory rating → auto-upgrades to Watched.

---

## 15. Poster Fallback

Two letters: first char of word 1 + first char of word 2. Single-word = first two chars.
Amber gradient background · dark text.
User-editable, max 10 chars. Persists per entry.

---

## 16. Data Model

### Entry object
| Field | Type | Notes |
|---|---|---|
| id | string | |
| parent_entry_id | string / null | Links rewatch to original |
| is_rewatch | boolean | |
| title | string | |
| content_type | enum | Movie / TV Show / Anime |
| language | string | |
| genre_tags | string[] | |
| linked_sources | object[] | {source, url, global_rating} — MAL / TMDB / OMDB |
| poster_url | string / null | |
| poster_fallback_text | string / null | Max 10 chars |
| watch_status | enum | Watched / Watching / Paused / Dropped / Watch Plan |
| created_at | date | |
| watch_start_date | date / null | |
| watch_end_date | date / null | |
| episode_count | number / null | |
| episode_runtime_mins | number / null | |
| is_ongoing | boolean | |
| episodes | object[] | {ep_number, watched, notes} |
| watch_sessions | object[] | {ep_from, ep_to, date} |
| watch_time_mins | number / null | |
| watch_time_estimated | boolean | |
| rating | number / null | 1–10 in 0.5 steps |
| reaction | string / null | 500 chars |
| recommend | boolean | |
| bookmark | boolean | |

### Derived stats (not stored)
- Total watched = count of Watched + Dropped entries
- Total watch time = sum of watch_time_mins
- Category counts = grouped by content_type
- Watch streak = consecutive days with a Watch Sesh or Watched entry

---

## 17. Watch Time Calculation

| Type | Method |
|---|---|
| Movie | Fetched runtime (exact). If unavailable → optional manual input. If skipped → shown as "—" |
| TV Show | Fetched ep runtime × eps watched. Fallback: 45 min default |
| Anime | Fetched ep runtime × eps watched. Fallback: 24 min default |

Est. flag (`~`) shown wherever estimated. Derivation shown in Log It: `X min/ep × Y eps = Zh Wm est.`
User can override per entry via presets or custom input.

---

## 18. Status & History Logic

| Event | Counted in stats? | Date logged? |
|---|---|---|
| Added to Watch Plan | No | Yes — created_at |
| Moved to Watching | No | Yes — watch_start_date |
| Watch Sesh logged | No | Yes — session date |
| Marked Watched | Yes | Yes — watch_end_date |
| Dropped | Yes | Yes — watch_end_date |
| Rewatch logged | Yes (+1) | Yes — new entry |

---

## 19. API Stack

| Data needed | API | Cost | Notes |
|---|---|---|---|
| Anime search + data | MAL official API | Free | Needs client ID registration |
| Movie + TV search + data | TMDB | Free | Needs API key. Covers episodes, runtime, posters, airing status |
| IMDB ratings | OMDB API | Free (1000 req/day) | Unofficial IMDB proxy, widely used |

**Search priority in Log It:** MAL → TMDB → OMDB

**What each API provides:**
- MAL: title, episode count, ep duration, genres, airing status, MAL global rating, poster
- TMDB: title, runtime (movies), episode list, ep runtime, genres, airing status, TMDB rating, poster. Also replaces Rotten Tomatoes.
- OMDB: IMDB rating, runtime, genre — enrichment layer on top of TMDB results

**API key security:** In Stage 1–2, keys used client-side for prototyping. In Stage 3, all API calls routed through Supabase Edge Functions — keys never exposed client-side in production.

---

## 20. Data Import & Sync (Stage 3)

### MAL OAuth
- User connects MAL account from Watcher screen
- One-time import of full MAL watch history into WatchedIt
- Ongoing: new MAL completions surfaced in Review to Log queue
- MAL stats available in Statistics immediately after import

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

## 21. Share Extension (Stage 2)

Native iOS/Android share sheet integration. Dramatically reduces logging friction.

**Current flow (without share):**
Open app → tap Log It → type title → search → select → confirm → fill details = ~8 steps

**With share extension:**
Watching something → hit share → tap WatchedIt → title auto-filled from URL/metadata → TMDB auto-searched → confirm details → rate → done = ~3 steps

**How it works technically:**
- Streaming apps share a URL or title text when user hits share
- WatchedIt share extension receives this payload
- Parses title, searches TMDB automatically
- Opens Log It Step 2 pre-filled
- Platform-agnostic — works from Crunchyroll, Prime, Hotstar, Netflix, anywhere

**Platform support:**
- Android: works via Intent filters — registers WatchedIt as a share target
- iOS: Share Extension target in Xcode

---

## 22. Future Channels (Stage 4)

### Home screen widget
- Glanceable: currently watching + quick log button
- Android: Jetpack Glance / Expo Widgets
- iOS: WidgetKit
- One-tap to open Log It from home screen without opening app

### WatchedIt channel / web detection
- Detects content being watched across streaming platforms
- Sends to Review to Log queue for user sign-off
- Mobile-first — not a browser extension
- Exact mechanism TBD (deep links, share intents, notification hooks)

### Subscription analytics
- Connect streaming platform data (where available) to WatchedIt
- Track content consumed per platform vs subscription cost
- Answer "is my Netflix subscription worth it this month?"
- Data sourced from imports + manual logs

---

## 23. Build Stages

| Stage | Scope |
|---|---|
| **1 — Current** | UI shell complete in React (web). All screens built, dummy data, no backend, no APIs. |
| **2** | Port to React Native + Expo (Android first). Wire MAL + TMDB + OMDB APIs. Share extension. Shareable stats card. |
| **3** | Google Auth + Supabase backend. MAL OAuth import. Netflix CSV import. Review to Log queue. API keys server-side via Edge Functions. |
| **4** | Social features, friends, watch groups. Home screen widget. WatchedIt channel / web detection. Subscription analytics. YouTube Takeout import. iOS polish. |

---

## 24. Spec Change Log

| Version | Changes |
|---|---|
| 1.0 | Initial spec |
| 1.1 | Added rewatch, dropped, paused, ongoing, watch time, stats screen, naming conventions |
| 1.2 | Platform changed to React Native + Expo (Android first). API stack locked (MAL + TMDB + OMDB). Share extension moved to Stage 2. Data import strategy added (MAL OAuth, Netflix CSV, Review to Log queue). Stage 4 channels added (widget, web detection, subscription analytics). Design system fully locked. Product vision statement added. |
