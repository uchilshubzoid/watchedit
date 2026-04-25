/**
 * src/services/search.js
 * Search orchestrator for WatchedIt.
 *
 * Implements the MAL → TMDB → OMDB priority order defined in the spec (§21).
 * All three sources run in parallel via Promise.allSettled — we don't wait for
 * MAL to finish before starting TMDB. The priority order only affects how
 * results are sorted in the combined list, not execution order.
 *
 * Why allSettled instead of Promise.all?
 * If one source fails (e.g. MAL rate-limits, TMDB is down), we still want
 * results from the others rather than throwing and showing nothing.
 *
 * Source responsibilities:
 *   MAL  — anime only (most complete metadata for anime)
 *   TMDB — movies + TV shows (MAL results appear first so anime dupes are rare)
 *   OMDB — stub (Stage 2: enriches with IMDB ratings, not a primary search source)
 *
 * The returned array is shaped to WatchedIt's unified result format so
 * LogItSearch can render all results without knowing the source.
 */

import { searchMAL } from "../api/mal";
import { searchTMDBMovies, searchTMDBTV } from "./tmdb";
import { searchOMDB } from "./omdb";

// ── Duplicate detection ───────────────────────────────────────────────────────
// After combining sources there can be duplicates — e.g. a TV show that exists
// on both TMDB and MAL (MAL handles anime, but some anime also appear on TMDB).
// Strategy: deduplicate by title (case-insensitive). MAL wins ties because it
// appears first and has richer anime metadata.
function deduplicateByTitle(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = r.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── inLog enrichment ──────────────────────────────────────────────────────────
// Marks each result as already-in-log so the search card can show the correct
// CTA state (disabled / rewatch). Checks by source-specific ID first (most
// reliable), then falls back to title match.
function enrichWithLogStatus(results, entries = []) {
  return results.map(r => ({
    ...r,
    inLog: entries.some(e => {
      // Prefer ID match — title match has false positives for common names
      if (r.source === "MAL"  && e.malId  && e.malId  === r.id) return true;
      if (r.source === "TMDB" && e.tmdbId && e.tmdbId === r.id) return true;
      // Title fallback
      return e.title?.toLowerCase() === r.title?.toLowerCase();
    }),
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// Main export
// ═════════════════════════════════════════════════════════════════════════════

/**
 * searchAll(query, entries)
 *
 * Runs MAL + TMDB (movies) + TMDB (TV) + OMDB in parallel.
 * Returns a combined, deduplicated array ordered by source priority:
 *   1. MAL results  (anime — most complete metadata)
 *   2. TMDB movies
 *   3. TMDB TV shows
 *   4. OMDB results (stub — empty for now)
 *
 * @param {string}   query   - The user's search string
 * @param {object[]} entries - Current WatchLog entries (for inLog detection)
 * @returns {Promise<object[]>} Unified result array
 */
export async function searchAll(query, entries = []) {
  if (!query.trim()) return [];

  // Fire all sources in parallel — failures in one don't block the others
  const [malResult, tmdbMoviesResult, tmdbTVResult, omdbResult] =
    await Promise.allSettled([
      searchMAL(query),
      searchTMDBMovies(query),
      searchTMDBTV(query),
      searchOMDB(query),
    ]);

  // Extract values from settled promises; failed sources contribute nothing
  const malResults       = malResult.status        === "fulfilled" ? malResult.value        : [];
  const tmdbMovieResults = tmdbMoviesResult.status  === "fulfilled" ? tmdbMoviesResult.value  : [];
  const tmdbTVResults    = tmdbTVResult.status      === "fulfilled" ? tmdbTVResult.value      : [];
  const omdbResults      = omdbResult.status        === "fulfilled" ? omdbResult.value        : [];

  // Log any source failures in dev so we know what broke without crashing the UI
  if (malResult.status        === "rejected") console.warn("[search] MAL failed:",       malResult.reason?.message);
  if (tmdbMoviesResult.status === "rejected") console.warn("[search] TMDB movies failed:", tmdbMoviesResult.reason?.message);
  if (tmdbTVResult.status     === "rejected") console.warn("[search] TMDB TV failed:",   tmdbTVResult.reason?.message);
  if (omdbResult.status       === "rejected") console.warn("[search] OMDB failed:",      omdbResult.reason?.message);

  // Combine in priority order, deduplicate, enrich with log status
  const combined = [
    ...malResults,        // anime — highest fidelity for anime
    ...tmdbMovieResults,  // movies
    ...tmdbTVResults,     // TV shows
    ...omdbResults,       // supplementary (stub)
  ];

  const deduplicated = deduplicateByTitle(combined);
  return enrichWithLogStatus(deduplicated, entries);
}

/**
 * searchAnime(query, entries)
 * MAL only — for when you know you want anime results.
 * Used internally; exported for potential direct use in filters.
 */
export async function searchAnime(query, entries = []) {
  if (!query.trim()) return [];
  try {
    const results = await searchMAL(query);
    return enrichWithLogStatus(results, entries);
  } catch (err) {
    console.warn("[search] MAL failed:", err.message);
    return [];
  }
}

/**
 * searchMoviesAndTV(query, entries)
 * TMDB only — movies + TV in parallel.
 * Used internally; exported for potential direct use in type-filtered searches.
 */
export async function searchMoviesAndTV(query, entries = []) {
  if (!query.trim()) return [];
  const [moviesResult, tvResult] = await Promise.allSettled([
    searchTMDBMovies(query),
    searchTMDBTV(query),
  ]);
  const movies = moviesResult.status === "fulfilled" ? moviesResult.value : [];
  const tv     = tvResult.status     === "fulfilled" ? tvResult.value     : [];
  return enrichWithLogStatus([...movies, ...tv], entries);
}
