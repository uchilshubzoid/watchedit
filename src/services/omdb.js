/**
 * src/services/omdb.js
 * OMDB API service for WatchedIt.
 *
 * OMDB is a wrapper around IMDB data. It covers movies and TV series,
 * making it a useful complement to TMDB — particularly for older titles
 * and for surfacing IMDB ratings.
 *
 * OMDB supports browser CORS natively (no proxy needed).
 *
 * Free tier: 1000 requests/day. We use it for:
 *   Stage 1: search (movies + series) — this file
 *   Stage 2: rating enrichment via getOMDBDetails(imdbID) — adds imdbRating
 *             to entries that already have an imdbID from TMDB or OMDB search
 *
 * Env var: REACT_APP_OMDB_API_KEY
 *
 * All exported functions return results shaped to WatchedIt's unified search
 * result format so LogItSearch can render them without knowing the source.
 */

const OMDB_API_KEY = process.env.EXPO_PUBLIC_OMDB_API_KEY || process.env.REACT_APP_OMDB_API_KEY;
const OMDB_BASE = "https://www.omdbapi.com";

// ── Type mapping ──────────────────────────────────────────────────────────────
// OMDB returns "movie", "series", or "episode". We normalise to WatchedIt types.
function mapContentType(omdbType) {
  if (omdbType === "movie")  return "Movie";
  if (omdbType === "series") return "TV Show";
  return "TV Show"; // "episode" — treat as TV Show, user can correct in Step 2
}

// ── Poster URL ────────────────────────────────────────────────────────────────
// OMDB returns full URLs, but uses the string "N/A" when there's no poster.
function posterUrl(raw) {
  return raw && raw !== "N/A" ? raw : null;
}

// ── Year extraction ───────────────────────────────────────────────────────────
// Series years come as ranges: "2011–2019". We take the start year only.
function extractYear(raw) {
  if (!raw || raw === "N/A") return null;
  return raw.split(/[–—-]/)[0].trim() || null;
}

// ── Shared fetch helper ───────────────────────────────────────────────────────
async function omdbFetch(params = {}) {
  if (!OMDB_API_KEY) throw new Error("EXPO_PUBLIC_OMDB_API_KEY not set");

  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", OMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OMDB API ${res.status}`);

  const json = await res.json();

  // OMDB signals failures in-band with Response: "False"
  if (json.Response === "False") {
    // "Movie not found!" is a normal empty-results response, not an error
    if (json.Error === "Movie not found!") return null; // caller handles null → []
    throw new Error(`OMDB: ${json.Error}`);
  }

  return json;
}

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * searchOMDB(query)
 * Searches OMDB for movies and series matching the query.
 * Returns up to 8 results shaped to WatchedIt's unified result format.
 *
 * Note: OMDB search doesn't return IMDB ratings — those require a separate
 * details call per title. Rating enrichment is a Stage 2 task (getOMDBDetails).
 */
export async function searchOMDB(query) {
  if (!query.trim()) return [];

  const json = await omdbFetch({ s: query.trim() });
  if (!json) return []; // "Movie not found!" — treat as empty

  return (json.Search || []).slice(0, 8).map(item => ({
    // Identifiers
    id: item.imdbID,          // e.g. "tt1375666" — use as primary ID for OMDB results
    imdbID: item.imdbID,      // kept separately for future rating-enrichment calls

    // Display
    title: item.Title,
    type: mapContentType(item.Type),
    year: extractYear(item.Year),
    source: "OMDB",
    lang: null,               // not returned by search endpoint

    // Episode / runtime — not in search results; available via getOMDBDetails
    episodes: null,
    epRuntime: null,
    runtime: null,
    ongoing: false,           // search doesn't expose status

    inLog: false,             // enriched by caller

    // Media
    poster_url: posterUrl(item.Poster),

    // Ratings — not in search results; populated by getOMDBDetails in Stage 2
    malRating: null,
    tmdbRating: null,
    imdbRating: null,

    // Genre — not in search results
    genre: [],

    alternative_titles: { en: item.Title, ja: null },
    alternativeTitles: [],
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// DETAILS  (Stage 2 enrichment)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * getOMDBDetails(imdbID)
 * Fetches full details for a specific IMDB ID.
 * Returns a patch object to spread over an existing entry or search result.
 *
 * Primary use: enrich an entry that already has an imdbID (from OMDB search
 * or from TMDB's external_ids endpoint) with imdbRating, Runtime, Genre, etc.
 *
 *   const enriched = { ...entry, ...await getOMDBDetails(entry.imdbID) }
 */
export async function getOMDBDetails(imdbID) {
  if (!imdbID) throw new Error("imdbID required");

  const json = await omdbFetch({ i: imdbID, plot: "short" });
  if (!json) return {};

  // Runtime comes as "142 min" — extract the number
  const runtimeMatch = (json.Runtime || "").match(/\d+/);
  const runtimeMins = runtimeMatch ? parseInt(runtimeMatch[0]) : null;

  // imdbRating comes as "8.8" string — parse to float, null if N/A
  const imdbRating = json.imdbRating && json.imdbRating !== "N/A"
    ? parseFloat(json.imdbRating)
    : null;

  return {
    runtime: runtimeMins,
    genre: json.Genre && json.Genre !== "N/A"
      ? json.Genre.split(",").map(g => g.trim())
      : [],
    lang: json.Language && json.Language !== "N/A"
      ? json.Language.split(",")[0].trim()  // take primary language
      : null,
    imdbRating,
    poster_url: posterUrl(json.Poster),
    overview: json.Plot && json.Plot !== "N/A" ? json.Plot : null,
  };
}
