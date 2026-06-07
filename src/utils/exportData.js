import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Date formatting ──────────────────────────────────────────────────────────

function toDDMMYYYY(val) {
  if (!val) return '';
  const d = new Date(val.includes('T') ? val : val + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function entryStatus(e) {
  if (e.dropped) return 'Dropped';
  if (e.paused)  return 'Paused';
  if (e.status === 'watched')   return 'Watched';
  if (e.status === 'watching')  return 'Watching';
  if (e.status === 'watchplan') return 'Watch Plan';
  return e.status || '';
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // wrap in quotes if contains comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells) {
  return cells.map(csvCell).join(',');
}

// ─── Shared file + share ──────────────────────────────────────────────────────

function dateTag() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
}

async function writeAndShare(content, filename, mimeType) {
  const file = new File(Paths.cache, filename);
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Save or share your WatchedIt export' });
}

// ─── JSON export ──────────────────────────────────────────────────────────────

export async function exportJSON(entries) {
  const content = JSON.stringify(entries, null, 2);
  await writeAndShare(content, `watchedit-export-${dateTag()}.json`, 'application/json');
}

// ─── CSV export ───────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'Title',
  'Content Type',
  'Status',
  'My Rating',
  'Source Rating',
  'Source Name',
  'Watch Platform',
  'Genre',
  'Language',
  'Date Logged',
  'Start Date',
  'Finish Date',
  'Episodes Watched',
  'Total Episodes',
  'Per Episode Runtime (mins)',
  'Total Watch Time',
];

export async function exportCSV(entries) {
  const isMovie = e => e.type === 'Movie';

  const rows = entries.map(e => [
    e.title,
    e.type,
    entryStatus(e),
    e.rating ?? '',
    e.malRating ?? '',
    e.ratingSource ?? '',
    e.watch_platform ?? '',
    (e.genre || []).length ? (e.genre || []).join(', ') : '',
    e.lang ?? '',
    toDDMMYYYY(e.logged_at),
    toDDMMYYYY(e.watch_start_date),
    toDDMMYYYY(e.watch_end_date) || toDDMMYYYY(e.finishedDate) || '',
    isMovie(e) ? '' : (e.ep ?? ''),
    isMovie(e) ? '' : (e.total ?? ''),
    isMovie(e) ? '' : (e.epRuntime ?? ''),
    e.watchTime ?? '',
  ]);

  const lines = [csvRow(CSV_HEADERS), ...rows.map(csvRow)];
  await writeAndShare(lines.join('\n'), `watchedit-export-${dateTag()}.csv`, 'text/csv');
}
