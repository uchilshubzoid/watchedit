/**
 * src/services/tmdb.js
 * TMDB API service for WatchedIt.
 *
 * Uses the Bearer token (read access token) approach — Authorization header,
 * not ?api_key query param. This is the recommended approach per TMDB docs
 * and keeps the token out of URLs/logs.
 *
 * TMDB supports browser CORS natively, so no dev proxy is needed here
 * (unlike MAL which requires the CRA proxy in setupProxy.js).
 *
 * Env var: EXPO_PUBLIC_TMDB_TOKEN (Expo / Stage 2)
 * Fallback: REACT_APP_TMDB_TOKEN  (CRA / Stage 1 — remove after Expo migration)
 *
 * All exported functions return results shaped to WatchedIt's unified search
 * result format so LogItSearch can render them without knowing the source.
 */

const TMDB_TOKEN =
  process.env.EXPO_PUBLIC_TMDB_TOKEN || process.env.REACT_APP_TMDB_TOKEN;

const TMDB_BASE   = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

// ── Auth header ───────────────────────────────────────────────────────────────
// Reused on every request. If the token is missing we throw early so the
// caller can surface a sensible error rather than getting a 401 silently.
function authHeaders() {
  if (!TMDB_TOKEN) throw new Error("TMDB_TOKEN not set");
  return {
    Authorization: `Bearer ${TMDB_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// ── Genre ID → name maps ──────────────────────────────────────────────────────
// TMDB search endpoints return genre_ids (numbers), not names. Fetching the
// full genre list per search would add two extra round-trips. These static maps
// cover all genres currently in TMDB's catalogue — update if TMDB adds new ones.

const MOVIE_GENRES = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

const TV_GENRES = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  10762: "Kids", 9648: "Mystery", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk",
  10768: "War & Politics", 37: "Western",
};

function resolveGenres(ids, map) {
  return (ids || []).map(id => map[id]).filter(Boolean);
}

// ── Language code → display name ──────────────────────────────────────────────
// TMDB returns ISO 639-1 codes (e.g. "en", "ja"). WatchedIt stores full names.
// Covers the 10 quick-select chips in LanguageField plus common others.
const LANGUAGE_NAMES = {
  en: "English",  ja: "Japanese", ko: "Korean",   zh: "Mandarin",
  fr: "French",   de: "German",   es: "Spanish",  it: "Italian",
  hi: "Hindi",    ta: "Tamil",    pt: "Portuguese", ru: "Russian",
  ar: "Arabic",   tr: "Turkish",
};

function languageName(code) {
  return LANGUAGE_NAMES[code] || code || "";
}

// ── Poster URL ────────────────────────────────────────────────────────────────
// poster_path is a relative path like "/abc123.jpg". Null if no poster.
function posterUrl(path) {
  return path ? `${POSTER_BASE}${path}` : null;
}

// ── Shared fetch helper ───────────────────────────────────────────────────────
// Thin wrapper that adds auth, checks response status, and returns parsed JSON.
async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`TMDB API ${res.status} on ${path}`);
  return res.json();
}

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * searchTMDBMovies(query)
 * Searches TMDB for movies matching the query.
 * Returns up to 8 results shaped to WatchedIt's unified result format.
 *
 * We cap at 8 to match MAL's limit and keep the result list scannable.
 * TMDB returns results ranked by popularity by default — good enough for search.
 */
export async function searchTMDBMovies(query) {
  if (!query.trim()) return [];

  const json = await tmdbFetch("/search/movie", {
    query: query.trim(),
    include_adult: false,
    language: "en-US",
    page: 1,
  });

  return (json.results || []).slice(0, 8).map(movie => ({
    // Identifiers
    id: movie.id,               // TMDB movie ID — stored as tmdb_id in entry
    malId: null,

    // Display
    title: movie.title,
    type: "Movie",
    year: movie.release_date ? movie.release_date.split("-")[0] : null,
    source: "TMDB",
    lang: languageName(movie.original_language),

    // Episode / runtime — N/A for movies from search; populated by getMovieDetails
    episodes: null,
    epRuntime: null,
    runtime: null,              // fetched separately via getTMDBMovieDetails
    ongoing: false,

    // Enriched by LogItSearch against local log
    inLog: false,

    // Media
    poster_url: posterUrl(movie.poster_path),

    // Ratings
    tmdbRating: movie.vote_average > 0 ? Math.round(movie.vote_average * 10) / 10 : null,
    malRating: null,

    // Genre — resolved from IDs using static map (no extra API call)
    genre: resolveGenres(movie.genre_ids, MOVIE_GENRES),

    // Title variants — TMDB doesn't separate romanised/english/japanese like MAL
    // Use original_title as the "ja" equivalent for non-English films
    alternative_titles: {
      en: movie.title,
      ja: movie.original_language !== "en" ? movie.original_title : null,
    },
    alternativeTitles: movie.original_title !== movie.title ? [movie.original_title] : [],
  }));
}

/**
 * searchTMDBTV(query)
 * Searches TMDB for TV shows matching the query.
 * Returns up to 8 results shaped to WatchedIt's unified result format.
 *
 * Note: TMDB includes anime in its TV catalogue. We label everything "TV Show"
 * here because MAL is the authoritative source for anime — the two sources
 * are run in parallel and MAL results appear first in the combined list.
 * Users can correct the type in Log It Step 2.
 */
export async function searchTMDBTV(query) {
  if (!query.trim()) return [];

  const json = await tmdbFetch("/search/tv", {
    query: query.trim(),
    include_adult: false,
    language: "en-US",
    page: 1,
  });

  return (json.results || []).slice(0, 8).map(show => ({
    id: show.id,
    malId: null,

    title: show.name,
    type: "TV Show",
    year: show.first_air_date ? show.first_air_date.split("-")[0] : null,
    source: "TMDB",
    lang: languageName(show.original_language),

    // Episode count and runtime not available from search — fetch via getTMDBTVDetails
    episodes: null,
    epRuntime: null,
    runtime: null,
    ongoing: false,             // accurate value requires details call

    inLog: false,

    poster_url: posterUrl(show.poster_path),

    tmdbRating: show.vote_average > 0 ? Math.round(show.vote_average * 10) / 10 : null,
    malRating: null,

    genre: resolveGenres(show.genre_ids, TV_GENRES),

    alternative_titles: {
      en: show.name,
      ja: show.original_language !== "en" ? show.original_name : null,
    },
    alternativeTitles: show.original_name !== show.name ? [show.original_name] : [],
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// DETAILS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * getTMDBMovieDetails(movieId)
 * Fetches full movie details from TMDB for a specific movie ID.
 * Called when the user taps "WatchedIt →" on a TMDB movie card to go to
 * Log It Step 2 — we need the runtime and accurate genre names at that point.
 *
 * Returns a patch object meant to be spread over the search result:
 *   const full = { ...searchResult, ...await getTMDBMovieDetails(searchResult.id) }
 */
export async function getTMDBMovieDetails(movieId) {
  const movie = await tmdbFetch(`/movie/${movieId}`, { language: "en-US" });

  return {
    // runtime in minutes, 0 means unknown
    runtime: movie.runtime > 0 ? movie.runtime : null,

    // genres from details are full objects with name strings
    genre: (movie.genres || []).map(g => g.name),

    // Richer poster in case search returned a lower-quality path
    poster_url: posterUrl(movie.poster_path),

    // TMDB-sourced global rating
    tmdbRating: movie.vote_average > 0 ? Math.round(movie.vote_average * 10) / 10 : null,

    // Official English title from TMDB (may differ from search result title)
    title: movie.title,

    // Tagline / overview available if we want to display in detail view later
    overview: movie.overview || null,
  };
}

/**
 * getTMDBTVDetails(tvId)
 * Fetches full TV show details from TMDB for a specific series ID.
 * Same call pattern as getTMDBMovieDetails — spread over the search result.
 *
 * Key fields we care about:
 * - number_of_episodes: total episode count across all seasons
 * - episode_run_time: array of runtimes (can be multiple values); we take first
 * - status: "Returning Series" → ongoing, "Ended" / "Canceled" → finished
 * - genres: full genre objects
 */
export async function getTMDBTVDetails(tvId) {
  const show = await tmdbFetch(`/tv/${tvId}`, { language: "en-US" });

  // episode_run_time is an array (some shows have variable runtimes).
  // Take the first value. If empty, fall back to null — user can set in Step 2.
  const runtimes = show.episode_run_time || [];
  const epRuntime = runtimes.length > 0 ? runtimes[0] : null;

  // TMDB "status" values: "Returning Series", "Ended", "Canceled",
  // "In Production", "Planned", "Pilot"
  const ONGOING_STATUSES = new Set(["Returning Series", "In Production", "Planned", "Pilot"]);
  const ongoing = ONGOING_STATUSES.has(show.status);

  return {
    episodes: show.number_of_episodes > 0 ? show.number_of_episodes : null,
    epRuntime,
    ongoing,

    genre: (show.genres || []).map(g => g.name),
    poster_url: posterUrl(show.poster_path),

    tmdbRating: show.vote_average > 0 ? Math.round(show.vote_average * 10) / 10 : null,

    title: show.name,
    overview: show.overview || null,

    // Total seasons — useful for display, not currently in data model but good to have
    seasons: show.number_of_seasons || null,
  };
}
