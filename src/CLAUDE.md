# WatchedIt — Project Memory for Claude Code
*This file gives Claude Code full context on the WatchedIt project. Read this before doing anything.*

---

## What is WatchedIt

WatchedIt is a personal content manual — a mobile app for logging, searching, and analysing everything you've watched. Target user: unashamed, high-volume, opinionated consumer of content who wants to own their taste data instead of leaving it locked in streaming platforms.

**One liner:** Every title you've watched, rated, and remembered — searchable, analysable, and finally yours.

**Core philosophy:** Intentional capture. You chose to log it — that makes the rating and reaction meaningful. Tone throughout is warm and slightly playful.

---

## Current Build Status

### Stage 1 — UI Shell (IN PROGRESS)
React web app (local), built in VSCode. All screens designed and built with dummy data. No backend, no auth, no live APIs yet.

### Screens — all in `WatchedIt_App.jsx`
| Screen | Status | Notes |
|---|---|---|
| Watch Tower (Home) | ✅ Complete | Stats block, streak banner, currently watching, recently watched |
| WatchList | ✅ Complete | Tabs, consolidated filter/sort sheet, search |
| Log It | ✅ Complete | 2-step flow, search → details, all branching states |
| Detail Views | ✅ Complete | Watched, Currently Watching, Dropped, Watch Plan states |
| Search | ✅ Complete | Real-time search across WatchLog |
| Statistics | ✅ Complete | Summary + Timeline, radar chart, breakdown list |
| Watcher (Profile) | ✅ Complete | Edit profile, recommendations, Stage 3 placeholders |

### What's NOT built yet (do these next in order)
1. **Onboarding flow** — cold start problem, empty state for new users, first-time experience
2. **Tone audit** — check all empty states, error messages, action labels are warm + playful
3. **Expo migration** — port from React web to React Native + Expo (Android first)
4. **Stage 2 APIs** — wire MAL, TMDB, OMDB

---

## File Structure

```
/
├── CLAUDE.md                    ← this file
├── WatchedIt_Spec_v1.3.md       ← full product spec, read this for decisions
├── src/
│   └── WatchedIt_App.jsx        ← entire app, all screens in one file
└── package.json
```

All screens live in a single `WatchedIt_App.jsx` file. Component order from top to bottom:
- Design tokens (`T` object)
- Mock data (`MOCK_ENTRIES`, `MOCK_SEARCH`, `STATS`)
- Helper functions
- Shared UI components (Poster, TypePill, Card, Toggle, BlockingPopup, etc.)
- StarRating
- LanguageField (with top 10 language chips)
- GenreEditor (inline tag creation)
- FilterSheet (consolidated sort + filter bottom sheet)
- WatchTower
- WatchList
- DetailView
- LogItSearch + LogItDetails
- SearchScreen
- StatBreakdownRow + StatsScreen
- WatcherScreen
- App (shell with navigation)

---

## Design System — LOCKED, do not change these

### Colours
```js
const T = {
  bgPrimary:   "#292826",   // page background
  surface:     "#333230",   // cards
  elevated:    "#3E3C39",   // inputs, chips
  amber:       "#EF9F27",   // CTAs, ratings, active states
  amberDeep:   "#E8860A",   // card titles, gradient end
  amberSoft:   "#FAC775",   // badges, muted accents
  amberWarm:   "#C8854A",   // TV Show pill
  textPrimary: "#F5F0E8",   // body text
  textMuted:   "#9E9B96",   // labels, dates
  // special:
  // paused badge: #8BA3C4
  // dropped badge: #C47A7A
}
```

### Typography
- Display/headings: Nunito 800w
- Titles: Nunito 600–700w
- Body: Nunito 400–500w
- Mono labels/stats: Inconsolata

### Rules
- Dark mode only
- Cards: 16px border radius
- Buttons/pills: 22px border radius
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
| Watch Deets | The timeline section in detail views |
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
- **Watch Plan** → Watched, Watching (TV/Anime only), Delete. Cannot be Paused or Dropped.
- **Currently Watching** → Watched, Paused, Dropped (rating mandatory)
- **Paused** → Watching (resume), Dropped, Watched
- **Dropped** → Watching (Continue Watching CTA, logs resume date), Watched directly
- **Watched** → Rewatch (new linked entry), Unwatch (delete)
- **Movies** → can only be Watched or Watch Plan. Watching blocked with 🍿 popup.

---

## API Stack (Stage 2)
| Data | API | Notes |
|---|---|---|
| Anime | MAL official API | Free, needs client ID |
| Movies + TV | TMDB | Free, needs API key |
| IMDB ratings | OMDB | Free, 1000 req/day |

Search priority: MAL → TMDB → OMDB
In Stage 3: all API calls move server-side via Supabase Edge Functions.

---

## Platform Decision
**React Native + Expo, Android first.**
- Currently: React web shell for design/logic validation
- Stage 2: Port to React Native + Expo
- Key native features needed: Share extension (Stage 2), home screen widget (Stage 4), haptics
- `div` → `View`, `p` → `Text`, CSS objects → `StyleSheet.create()`
- All logic, state, design tokens carry over identically

---

## Build Stages
| Stage | Scope | Status |
|---|---|---|
| 1 | React web UI shell, all screens, dummy data | ✅ ~95% Complete |
| 2 | Port to React Native + Expo. Wire MAL + TMDB + OMDB. Share extension (Android Intent filters + iOS Share Extension). Shareable stats card. | 🔲 Not started |
| 3 | Google Auth + Supabase. MAL OAuth import. Netflix CSV import. Review to Log queue. API keys server-side. Export module. | 🔲 Not started |
| 4 | Social/friends. Home screen widget. WatchedIt channel/web detection. Subscription analytics. YouTube Takeout. iOS polish. | 🔲 Not started |

---

## Key UX Decisions Made (don't revisit unless flagged)

- **Log It is 2 steps:** Bottom sheet for search, full screen for details. Not step-by-step wizard.
- **Filter & Sort:** Single consolidated bottom sheet triggered by one button. Not separate chips row.
- **Language input:** 10 quick-select chips (English, Japanese, Korean, Hindi, Tamil, Spanish, French, German, Italian, Mandarin) + free text fallback.
- **Genre tags:** Inline "+ Add Tag" chip at end of tag row. Profile is secondary entry point.
- **Star rating:** Tap left half = X.5, tap right half = X. Drag for speed. Haptic on each step.
- **Rewatch:** Single result already in log → callout shown immediately, no tap needed.
- **Movie + Watching:** Blocked with 🍿 popup. CTAs: "Lol faine, I'll finish it" + "Actually I'm done".
- **Rating required popup:** ⭐ "C'mon, you know what you felt" — blocks submit without rating on Watched status.
- **Streak banner:** Shown on Watch Tower when streak ≥ 2 days. Dismissible. Rotates copy by streak length.
- **Currently Watching on home:** Horizontal scroll cards. Paused entries hidden by default.
- **Recently Watched on home:** Last 3 only.
- **Bookmark treatment:** Right-edge gradient border on cards — amber at top fading down.
- **Detail view header layout:** Title inside hero card alongside poster. Locked.
- **Watch time in detail view:** Shown in hero card meta row (Type · Language · Watch time).
- **Episode tracker:** Visual states only in current build (watched/next/unwatched). Interactive in Stage 2.
- **Dropped entry:** Shows red callout + "Continue Watching" CTA. Logs resumed date in Watch Deets.
- **Comparison in stats:** Previous period only (same duration). Toggle to show/hide comparison bars.

---

## Tone & Copy Guidelines
Warm, slightly playful, never condescending. Examples of the right voice:
- "Woah you've gone niche! 🎭 No results found online... add manually to log?"
- "Lol faine, I'll finish it"
- "C'mon, you know what you felt"
- "Nothing watched here. Go fix that."
- "On a roll 🎬 2 days in a row"
- "Remember to touch grass 🌿" (at 4 day streak)
- "We're not judging 👀" (at 14 day streak)
- "Rating later? Your verdict will mean more when you've slept on it."
- "This is yours forever. Future you will thank present you."

Micro-explanations appear at key moments in Log It — below the rating field and reaction field when empty.

---

## Pending Work
- Onboarding flow — what does a new user see on first launch with empty WatchLog?
- Tone audit — verify all empty states, error messages, action labels match voice above
- Animation pass — Step 1 → Step 2 transition in Log It needs slide/expand animation

---

## How to Run
```bash
npm start
# or
npm run dev
```

---

## Important Notes for Claude Code
- **Don't split into multiple files yet** — keeping everything in one JSX file until Expo migration
- **Don't add a backend** — dummy data only until Stage 3
- **Don't change design tokens** — colours, fonts, border radii are locked
- **Always enforce state transition rules** — see the table above
- **Hooks rule** — never call useState/useEffect inside .map() or conditionals — extract to a named component
- **Check the spec** (`WatchedIt_Spec_v1.3.md`) for any product decisions before making assumptions
