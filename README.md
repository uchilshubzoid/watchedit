# WatchedIt

Every title you've watched, rated, and remembered, searchable, analysable, and finally yours.

WatchedIt is a personal content manual for movies, TV shows, and anime. It is built for people who watch a lot, have opinions, and want to own their taste data instead of leaving it scattered across streaming apps.

## Current Status

WatchedIt is currently an Android-first Expo React Native app.

- Stage 1 React web shell is complete and kept as migration reference.
- Stage 2 Expo native migration is complete.
- MAL, TMDB, and OMDB search are wired into Log It.
- Local persistence uses AsyncStorage.
- Expo Router owns native navigation.
- Play Store polish, onboarding, copy audit, and animation pass are the next focus.
- The old Create React App shell lives in `archive/web-shell/` for historical reference only.

## Product Shape

Core flows:

- Log titles as watched, watching, or watch plan.
- Search live sources through a unified Log It flow.
- Rate and react to entries.
- Track episode progress and watch sessions for shows.
- Browse WatchList, Watch Tower, Search, Stats, and Watcher/Profile screens.
- Keep taste data local and structured for future import/export and analytics work.

Tone-wise, the app should feel warm, a little playful, and intentional. Logging is a deliberate act: if you chose to capture it, your reaction matters.

## Tech Stack

- Expo `~55`
- React Native `0.83`
- React `19`
- Expo Router
- AsyncStorage
- `@gorhom/bottom-sheet`
- Expo Haptics
- Expo Linear Gradient
- Nunito + Inconsolata fonts
- MAL, TMDB, and OMDB APIs

## Project Structure

```text
app/                    Expo Router routes; mostly thin re-exports
  _layout.jsx           Root stack, fonts, splash, gesture root
  (tabs)/               Bottom tab navigator and Log It FAB
  logit/                Log It modal/details routes
  detail/[id].jsx       Entry detail route
  stats.jsx             Stats route

src/
  screens/              Main screen implementations
  components/           Shared native UI components
  api/                  Unified title search entry point and MAL adapter
  services/             TMDB, OMDB, and legacy search helpers
  db/storage.js         AsyncStorage CRUD helpers
  constants/tokens.js   Locked design tokens
  WatchedIt_Spec_v1.3.md Product spec, currently updated to v1.4 content
  CLAUDE.md             Project memory and implementation guidance

assets/                 App icon, adaptive icon, splash image
archive/web-shell/      Deprecated Stage 1 CRA shell; reference only
```

`src/screens/WatchedItApp.jsx` is read-only migration reference. New work should happen in the native screen/component files.

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file with API credentials:

```bash
EXPO_PUBLIC_MAL_CLIENT_ID=your_mal_client_id
EXPO_PUBLIC_TMDB_TOKEN=your_tmdb_bearer_token
EXPO_PUBLIC_OMDB_API_KEY=your_omdb_api_key
```

The `.env` file is intentionally ignored by Git.

## Run Locally

Start Expo:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

## Builds

Preview APK:

```bash
npm run build:apk
```

Production AAB:

```bash
npm run build:aab
```

These use EAS Build and require an Expo/EAS account.

## Important Development Notes

- Use `src/constants/tokens.js` for colors, fonts, and radii.
- Use `src/db/storage.js` for all persistence; all storage functions are async.
- Do not use browser APIs in native screens.
- Use Expo Router for navigation.
- Use Expo Haptics instead of `navigator.vibrate`.
- Preserve the watch status transition rules from the spec.
- Keep `WatchedItApp.jsx` as reference only.

## Docs

- Product spec: [src/WatchedIt_Spec_v1.3.md](src/WatchedIt_Spec_v1.3.md)
- Project memory: [src/CLAUDE.md](src/CLAUDE.md)
