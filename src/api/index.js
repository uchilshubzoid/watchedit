/**
 * src/api/index.js
 * Unified search entry-point for WatchedIt.
 *
 * Strategy: MAL + TMDB (movies + TV) all run in parallel via Promise.allSettled.
 * Results are combined in priority order — MAL anime first, then TMDB movies,
 * then TMDB TV — and deduplicated by title so anime that appears in both
 * sources only shows once (MAL entry wins).
 *
 * Both sources' results are normalised to a single shape before returning so
 * the UI never has to care which source responded.
 *
 * Normalised result shape:
 *   source              "MAL" | "TMDB"
 *   id                  source-specific numeric ID
 *   title               display title (romanised for anime)
 *   year                string | null
 *   poster_url          string | null
 *   content_type        "Anime" | "Movie" | "TV Show"
 *   episode_count       number | null
 *   episode_runtime_mins number | null
 *   is_ongoing          boolean
 *   genre_tags          string[]
 *   language            string (display name)
 *   global_rating       number | null   (MAL mean or TMDB vote_average)
 *   alternative_titles  { en: string|null, ja: string|null }
 *   alternativeTitles   string[]        (legacy array kept for getPreferredTitle)
 *   inLog               boolean         (enriched by caller)
 */

import { searchMAL } from "./mal";
import { searchTMDBMovies, searchTMDBTV } from "../services/tmdb";
import { searchOMDB } from "../services/omdb";

// ── Normalise a single result from any source ─────────────────────────────────

function normaliseMal(r) {
  return {
    source: r.source,               // "MAL"
    id: r.id,
    title: r.title,
    year: r.year,
    poster_url: r.poster_url,
    content_type: r.type,           // "Anime"
    episode_count: r.episodes,
    episode_runtime_mins: r.epRuntime,
    is_ongoing: r.ongoing,
    genre_tags: r.genre || [],
    language: r.lang,
    global_rating: r.malRating,
    alternative_titles: r.alternative_titles || { en: null, ja: null },
    alternativeTitles: r.alternativeTitles || [],
    inLog: r.inLog || false,
  };
}

function normaliseTmdb(r) {
  return {
    source: r.source,               // "TMDB"
    id: r.id,
    title: r.title,
    year: r.year,
    poster_url: r.poster_url,
    content_type: r.type,           // "Movie" | "TV Show"
    episode_count: r.episodes,
    episode_runtime_mins: r.epRuntime,
    is_ongoing: r.ongoing,
    genre_tags: r.genre || [],
    language: r.lang,
    global_rating: r.tmdbRating,
    alternative_titles: r.alternative_titles || { en: null, ja: null },
    alternativeTitles: r.alternativeTitles || [],
    inLog: r.inLog || false,
  };
}

function normaliseOmdb(r) {
  return {
    source: "OMDB",
    id: r.imdbID,                   // IMDB ID ("tt1375666")
    title: r.title,
    year: r.year,
    poster_url: r.poster_url,
    content_type: r.type,           // "Movie" | "TV Show"
    episode_count: null,
    episode_runtime_mins: null,
    is_ongoing: false,
    genre_tags: [],
    language: null,
    global_rating: r.imdbRating,    // null from search; populated by getOMDBDetails
    alternative_titles: r.alternative_titles || { en: r.title, ja: null },
    alternativeTitles: r.alternativeTitles || [],
    imdbID: r.imdbID,               // kept for Stage 2 detail enrichment
    inLog: r.inLog || false,
  };
}

// ── Duplicate detection (case-insensitive title) ──────────────────────────────

function deduplicateByTitle(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = r.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Relevance scoring ─────────────────────────────────────────────────────────
// Scores how well a title matches the query. Higher = more relevant.
//   4 — exact match
//   3 — title starts with query
//   2 — every query word appears in the title
//   1 — title contains the query as a substring
//   0 — none of the above (partial word match from the API)
function scoreRelevance(title, query) {
  const t = title.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (t === q) return 4;
  if (t.startsWith(q)) return 3;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every(w => t.includes(w))) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

// ── inLog enrichment ──────────────────────────────────────────────────────────

function enrichWithLogStatus(results, entries = []) {
  return results.map(r => ({
    ...r,
    inLog: entries.some(e =>
      e.title?.toLowerCase() === r.title?.toLowerCase()
    ),
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// Main export
// ═════════════════════════════════════════════════════════════════════════════

/**
 * searchTitles(query, entries)
 *
 * Runs MAL + TMDB (movies) + TMDB (TV) in parallel via Promise.allSettled so
 * a failure in one source never blocks the others.
 *
 * Result order: MAL anime first, then TMDB movies, then TMDB TV shows, then OMDB.
 * Duplicates removed by title (case-insensitive); MAL wins ties, TMDB beats OMDB.
 *
 * @param {string}   query   - User's search string
 * @param {object[]} entries - Current WatchLog entries (for inLog detection)
 * @returns {Promise<object[]>} Normalised, deduplicated result array
 */
/**
 * Return shape:
 * {
 *   combined:  object[]   — deduplicated, relevance-sorted, all sources
 *   bySource:  { MAL: object[], TMDB: object[], OMDB: object[] }
 *              — raw per-source results (no cross-source dedup) used when the
 *                user filters to a single source so they see that source's full
 *                results even if some titles were removed from the combined list
 * }
 */
export async function searchTitles(query, entries = []) {
  if (!query.trim()) return { combined: [], bySource: { MAL: [], TMDB: [], OMDB: [] } };

  const [malResult, moviesResult, tvResult, omdbResult] = await Promise.allSettled([
    searchMAL(query),
    searchTMDBMovies(query),
    searchTMDBTV(query),
    searchOMDB(query),
  ]);

  const malRaw    = malResult.status    === "fulfilled" ? malResult.value    : [];
  const moviesRaw = moviesResult.status === "fulfilled" ? moviesResult.value : [];
  const tvRaw     = tvResult.status     === "fulfilled" ? tvResult.value     : [];
  const omdbRaw   = omdbResult.status   === "fulfilled" ? omdbResult.value   : [];

  if (malResult.status    === "rejected") console.warn("[searchTitles] MAL failed:",         malResult.reason?.message);
  if (moviesResult.status === "rejected") console.warn("[searchTitles] TMDB movies failed:", moviesResult.reason?.message);
  if (tvResult.status     === "rejected") console.warn("[searchTitles] TMDB TV failed:",     tvResult.reason?.message);
  if (omdbResult.status   === "rejected") console.warn("[searchTitles] OMDB failed:",        omdbResult.reason?.message);

  // Per-source normalised arrays (used for single-source filter view)
  const malNorm   = enrichWithLogStatus(malRaw.map(normaliseMal),   entries);
  const tmdbNorm  = enrichWithLogStatus([...moviesRaw, ...tvRaw].map(normaliseTmdb), entries);
  const omdbNorm  = enrichWithLogStatus(omdbRaw.map(normaliseOmdb), entries);

  // Combined: deduplicate across sources (MAL wins > TMDB > OMDB), then sort by relevance
  const allCombined = [
    ...malRaw.map(normaliseMal),
    ...moviesRaw.map(normaliseTmdb),
    ...tvRaw.map(normaliseTmdb),
    ...omdbRaw.map(normaliseOmdb),
  ];

  const deduplicated = deduplicateByTitle(allCombined);
  const q = query.trim();
  deduplicated.sort((a, b) => scoreRelevance(b.title, q) - scoreRelevance(a.title, q));

  return {
    combined: enrichWithLogStatus(deduplicated, entries),
    bySource: { MAL: malNorm, TMDB: tmdbNorm, OMDB: omdbNorm },
  };
}
