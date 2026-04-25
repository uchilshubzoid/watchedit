export function getPreferredTitle(malResult, pref) {
  if (pref === "en") return malResult.alternative_titles?.en || malResult.title;
  if (pref === "ja") return malResult.alternative_titles?.ja || malResult.title;
  return malResult.title; // romanised default
}
