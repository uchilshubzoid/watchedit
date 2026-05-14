// Design tokens — LOCKED. Do not change colours, font names, or border radii.
// Fonts are loaded in app/_layout.jsx via @expo-google-fonts.

export const T = {
  // Backgrounds & surfaces
  bgPrimary:   '#292826',
  surface:     '#333230',
  elevated:    '#3E3C39',

  // Amber family — use sparingly: ratings, CTAs, active states only
  amber:       '#EF9F27',
  amberDeep:   '#E8860A',
  amberSoft:   '#FAC775',
  amberWarm:   '#C8854A',

  // Text
  textPrimary: '#F5F0E8',
  textMuted:   '#9E9B96',

  // Content type colours
  colorAnime:  '#EF9F27',   // amber — same as T.amber
  colorMovie:  '#5C9E8F',   // dusty teal
  colorTV:     '#8B7EC8',   // soft violet

  // Status colours — outside amber family
  paused:      '#8BA3C4',
  dropped:     '#C47A7A',

  // Typography — font family strings registered in app/_layout.jsx
  fontDisplay:      'Nunito-ExtraBold',   // 800w — headings, large numbers, CTAs
  fontTitle:        'Nunito-Bold',         // 700w — card titles
  fontTitleMedium:  'Nunito-SemiBold',    // 600w
  fontBody:         'Nunito-Regular',      // 400w — body text
  fontBodyMedium:   'Nunito-Medium',      // 500w
  fontMono:         'Inconsolata-Regular', // mono — labels, stats, dates
  fontFun:          'Fredoka-Regular',     // subtext — callouts, episode counts

  // Border radii
  radiusCard:   16,
  radiusButton: 22,
};
