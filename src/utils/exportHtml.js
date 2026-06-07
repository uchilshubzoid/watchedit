import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(title) {
  if (!title) return '??';
  const words = title.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function w92Url(url) {
  if (!url) return null;
  return url.replace(/\/w\d+\//, '/w92/').replace(/\/original\//, '/w92/');
}

async function posterToBase64(url) {
  if (!url) return null;
  try {
    const dest = new File(Paths.cache, `export_poster_${Date.now()}.jpg`);
    const downloaded = await File.downloadFileAsync(w92Url(url), dest, { idempotent: true });
    const b64 = await downloaded.base64();
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

function episodeLine(entry) {
  if (entry.type === 'Movie') return null;
  const ep    = entry.ep || 0;
  const total = entry.total || 0;
  const rt    = entry.epRuntime || (entry.type === 'Anime' ? 24 : 45);
  if (entry.ongoing) return `Ongoing · ${ep} eps watched so far`;
  if (entry.status === 'watched'   && total > 0) return `${total} episodes · ${rt} min/ep`;
  if (entry.status === 'watching'  && total > 0) return `${ep} of ${total} episodes · ${rt} min/ep`;
  if (entry.status === 'watchplan' && total > 0) return `${total} episodes · ${rt} min/ep`;
  return null;
}

function finishDateLabel(entry) {
  if (entry.status === 'watched')    return entry.finishedDate || entry.watch_end_date?.slice(0, 10) || null;
  if (entry.status === 'watching')   return entry.lastWatchedDate || null;
  if (entry.status === 'watchplan')  return entry.date || null;
  return null;
}

function statusBadgeStyle(entry) {
  if (entry.status === 'watched')    return 'background:#3a2e10;color:#EF9F27;';
  if (entry.status === 'watching')   return 'background:#1a2535;color:#8BA3C4;';
  if (entry.status === 'watchplan')  return 'background:#2a2826;color:#9E9B96;';
  if (entry.dropped)                 return 'background:#2e1a1a;color:#C47A7A;';
  if (entry.paused)                  return 'background:#1a2535;color:#8BA3C4;';
  return 'background:#2a2826;color:#9E9B96;';
}

function statusLabel(entry) {
  if (entry.dropped)                return 'Dropped';
  if (entry.paused)                 return 'Paused';
  if (entry.status === 'watched')   return 'Watched';
  if (entry.status === 'watching')  return 'Watching';
  if (entry.status === 'watchplan') return 'Yet to watch';
  return '';
}

const TAB_LABELS = {
  all:       'All',
  watching:  'Watching',
  watched:   'Watched',
  watchplan: 'Watch Plan',
  bookmarks: 'Bookmarks',
};

// ─── Active filter pills ──────────────────────────────────────────────────────

function buildFilterPills({ chips, language, selectedGenres, ratingRange, dateRange, platform, unrated, showPaused, tab }) {
  const pills = [];
  chips.forEach(c => pills.push(c));
  if (language) pills.push(language);
  selectedGenres.forEach(g => pills.push(g));
  if (ratingRange[0] > 0 || ratingRange[1] < 10) pills.push(`★ ${ratingRange[0]}–${ratingRange[1]}`);
  if (dateRange.start || dateRange.end) {
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?';
    pills.push(`${fmt(dateRange.start)} – ${fmt(dateRange.end)}`);
  }
  if (platform) pills.push(platform);
  if (unrated) pills.push('Unrated');
  if (showPaused && tab === 'watching') pills.push('Paused');
  return pills;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml({ entries, posterMap, watcherName, tab, filterPills, chips }) {
  const now      = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const tabLabel  = TAB_LABELS[tab] || 'All';
  const typeLabel = chips.filter(c => ['Anime', 'Movie', 'TV Show'].includes(c)).join(', ');
  const pageTitle = typeLabel ? `${tabLabel} · ${typeLabel}` : tabLabel;

  const filterPillsHtml = filterPills.length
    ? filterPills.map(p => `<span class="pill">${p}</span>`).join('')
    : '';

  const rows = entries.map(entry => {
    const posterSrc = posterMap[entry.id];
    const posterHtml = posterSrc
      ? `<img src="${posterSrc}" class="poster" alt="${entry.title}" />`
      : `<div class="poster poster-fallback"><span>${initials(entry.title)}</span></div>`;

    const epLine  = episodeLine(entry);
    const dateStr = finishDateLabel(entry);

    const metaParts = [entry.type];
    if (entry.watch_platform) metaParts.push(entry.watch_platform);
    if (dateStr) metaParts.push(dateStr);

    const reactionHtml = entry.reaction && entry.reaction.trim()
      ? `<p class="reaction">"${entry.reaction.trim().slice(0, 100)}${entry.reaction.trim().length > 100 ? '…' : ''}"</p>`
      : '';

    const ratingHtml = entry.rating
      ? `<div class="rating">${entry.rating}</div>`
      : `<div class="rating muted">—</div>`;

    return `
    <div class="entry">
      ${posterHtml}
      <div class="entry-meta">
        <p class="title">${entry.title}</p>
        <p class="meta">${metaParts.join(' · ')}</p>
        ${epLine ? `<p class="ep-line">${epLine}</p>` : ''}
        ${reactionHtml}
        <div class="badges">
          <span class="badge" style="${statusBadgeStyle(entry)}">${statusLabel(entry)}</span>
        </div>
      </div>
      <div class="entry-right">
        ${ratingHtml}
      </div>
    </div>`;
  }).join('\n    <div class="divider"></div>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WatchedIt · ${pageTitle}</title>
  <script type="application/json" id="watchedit-data">${JSON.stringify(entries)}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1e1c19; color: #F5F0E8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; }
    .page { max-width: 600px; margin: 0 auto; }

    /* Header */
    .header { background: #292826; padding: 20px 16px 16px; }
    .logo-pill { display: inline-flex; align-items: center; gap: 4px; background: rgba(239,159,39,0.12); border: 1px solid rgba(239,159,39,0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px; }
    .logo-text { color: #F5F0E8; font-weight: 700; font-size: 13px; }
    .logo-dot  { color: #EF9F27; }
    .watcher   { color: #9E9B96; font-size: 12px; margin-bottom: 6px; }
    .page-title { color: #EF9F27; font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .entry-count { color: #9E9B96; font-size: 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
    .filter-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .pill { background: rgba(239,159,39,0.12); border: 1px solid rgba(239,159,39,0.25); color: #EF9F27; border-radius: 20px; padding: 3px 10px; font-size: 11px; }

    /* Entries */
    .entries { background: #292826; margin-top: 2px; }
    .entry { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; }
    .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 0 16px; }

    /* Poster */
    .poster { width: 48px; height: 68px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .poster-fallback { width: 48px; height: 68px; border-radius: 6px; background: linear-gradient(135deg, #EF9F27, #E8860A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .poster-fallback span { color: #1e1c19; font-weight: 800; font-size: 16px; }

    /* Meta */
    .entry-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .title    { color: #E8860A; font-weight: 700; font-size: 15px; line-height: 1.3; }
    .meta     { color: #9E9B96; font-size: 12px; }
    .ep-line  { color: #9E9B96; font-size: 11px; font-family: monospace; }
    .reaction { color: #C8C4BC; font-size: 12px; font-style: italic; margin-top: 2px; }
    .badges   { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .badge    { font-size: 11px; border-radius: 20px; padding: 2px 8px; font-weight: 600; }

    /* Rating */
    .entry-right { flex-shrink: 0; display: flex; align-items: center; padding-top: 4px; }
    .rating      { color: #EF9F27; font-weight: 800; font-size: 18px; font-family: monospace; }
    .rating.muted { color: #9E9B96; }

    /* Footer */
    .footer { background: #1a1814; padding: 16px; text-align: center; color: #9E9B96; font-size: 11px; font-family: monospace; margin-top: 2px; }
    .footer span { color: #EF9F27; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-pill">
      <span class="logo-text">Watched<span class="logo-dot">It •</span></span>
    </div>
    <p class="watcher">${watcherName ? `${watcherName}'s WatchLog` : 'WatchLog'}</p>
    <p class="page-title">${pageTitle}</p>
    <p class="entry-count">${entries.length} ${entries.length === 1 ? 'title' : 'titles'}</p>
    ${filterPillsHtml ? `<div class="filter-pills">${filterPillsHtml}</div>` : ''}
  </div>

  <div class="entries">
    ${rows}
  </div>

  <div class="footer">
    generated by <span>WatchedIt</span> · ${watcherName ? `${watcherName}'s watchlog` : 'watchlog'} · ${monthYear}
  </div>
</div>
</body>
</html>`;
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportEntriesHtml(entries, { tab, chips, language, selectedGenres, ratingRange, dateRange, platform, unrated, showPaused, watcherName }) {
  // Fetch all posters in parallel
  const posterResults = await Promise.allSettled(
    entries.map(e => posterToBase64(e.poster_url))
  );
  const posterMap = {};
  entries.forEach((e, i) => {
    const r = posterResults[i];
    if (r.status === 'fulfilled' && r.value) posterMap[e.id] = r.value;
  });

  const filterPills = buildFilterPills({ chips, language, selectedGenres, ratingRange, dateRange, platform, unrated, showPaused, tab });
  const html = buildHtml({ entries, posterMap, watcherName, tab, filterPills, chips });

  // Write to cache
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const datetime = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `watchedit-list-${datetime}.html`;
  const htmlFile = new File(Paths.cache, filename);
  await htmlFile.write(html);

  await Sharing.shareAsync(htmlFile.uri, {
    mimeType: 'text/html',
    dialogTitle: 'Share your WatchList',
    UTI: 'public.html',
  });
}
