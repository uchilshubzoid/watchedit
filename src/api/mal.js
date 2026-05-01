// CORS doesn't apply in React Native — call MAL directly with the client ID header.
const MAL_CLIENT_ID = process.env.EXPO_PUBLIC_MAL_CLIENT_ID;
const MAL_BASE = 'https://api.myanimelist.net/v2';
const FIELDS = 'id,title,main_picture,num_episodes,average_episode_duration,genres,mean,status,start_season,alternative_titles';

export async function searchMAL(query) {
  if (!MAL_CLIENT_ID) throw new Error('EXPO_PUBLIC_MAL_CLIENT_ID not set');

  const url = `${MAL_BASE}/anime?q=${encodeURIComponent(query.trim())}&limit=8&fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID },
  });

  if (!res.ok) throw new Error(`MAL API ${res.status}`);

  const json = await res.json();

  return (json.data || []).map(({ node }) => ({
    id: node.id,
    title: node.title,
    type: 'Anime',
    year: node.start_season?.year ?? null,
    source: 'MAL',
    lang: 'Japanese',
    episodes: node.num_episodes > 0 ? node.num_episodes : null,
    epRuntime: node.average_episode_duration > 0
      ? Math.round(node.average_episode_duration / 60)
      : 24,
    genre: (node.genres || []).map(g => g.name),
    ongoing: node.status === 'currently_airing',
    inLog: false,
    poster_url: node.main_picture?.large ?? node.main_picture?.medium ?? null,
    malRating: node.mean ?? null,
    runtime: null,
    alternative_titles: {
      en: node.alternative_titles?.en || null,
      ja: node.alternative_titles?.ja || null,
    },
    alternativeTitles: [node.alternative_titles?.en, ...(node.alternative_titles?.synonyms || [])].filter(Boolean),
  }));
}
