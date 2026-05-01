export function highResPosterUrl(url) {
  if (!url) return null;

  // TMDB image URLs are size-addressable. Prefer a larger poster for saved entries
  // so the expanded Watch Deets poster does not upscale a thumbnail.
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/[^/]+\//, '/t/p/w780/');
  }

  // OMDB often returns Amazon poster thumbnails with size tokens like SX300.
  return url
    .replace(/_V1_SX\d+/, '_V1_SX1000')
    .replace(/_V1_SY\d+/, '_V1_SY1500');
}
