const MAL_CLIENT_ID = process.env.REACT_APP_MAL_CLIENT_ID;
// Requests go via the CRA dev proxy (/mal → https://api.myanimelist.net)
// so there are no browser CORS issues — the proxy forwards the header server-side.
const MAL_BASE = "/mal/v2";
const FIELDS = "id,title,main_picture,num_episodes,average_episode_duration,genres,mean,status,start_season,alternative_titles";

/**
 * Search MAL for anime matching query.
 * Returns an array of result objects shaped for LogItSearch.
 * Throws on network/API error so callers can fall back to mock.
 */
export async function searchMAL(query) {
  if (!MAL_CLIENT_ID) throw new Error("REACT_APP_MAL_CLIENT_ID not set");

  const url = `${MAL_BASE}/anime?q=${encodeURIComponent(query.trim())}&limit=8&fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: { "X-MAL-CLIENT-ID": MAL_CLIENT_ID },
  });

  if (!res.ok) throw new Error(`MAL API ${res.status}`);

  const json = await res.json();

  return (json.data || []).map(({ node }) => ({
    id: node.id,
    title: node.title,
    type: "Anime",
    year: node.start_season?.year ?? null,
    source: "MAL",
    lang: "Japanese",
    // num_episodes is 0 for ongoing/not-yet-aired — treat as null
    episodes: node.num_episodes > 0 ? node.num_episodes : null,
    // average_episode_duration is in seconds; 0 means unknown → fall back to 24 min
    epRuntime: node.average_episode_duration > 0
      ? Math.round(node.average_episode_duration / 60)
      : 24,
    genre: (node.genres || []).map(g => g.name),
    ongoing: node.status === "currently_airing",
    inLog: false, // enriched by LogItSearch against local log
    poster_url: node.main_picture?.medium ?? null,
    malRating: node.mean ?? null,
    runtime: null,
    // Structured for getPreferredTitle — en/ja are strings, synonyms is an array
    alternative_titles: {
      en: node.alternative_titles?.en || null,
      ja: node.alternative_titles?.ja || null,
    },
    alternativeTitles: [node.alternative_titles?.en, ...(node.alternative_titles?.synonyms || [])].filter(Boolean),
  }));
}
