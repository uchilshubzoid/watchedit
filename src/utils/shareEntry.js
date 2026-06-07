import { Share } from 'react-native';

function buildShareText(entry) {
  const lines = [];

  lines.push(`*${entry.title}*`);

  const metaParts = [entry.type];
  if (entry.year) metaParts.push(String(entry.year));

  const isMovie    = entry.type === 'Movie';
  const ep         = entry.ep || 0;
  const total      = entry.total || 0;
  const rt         = entry.epRuntime || (entry.type === 'Anime' ? 24 : 45);
  const isWatched  = entry.status === 'watched';
  const isWatching = entry.status === 'watching';

  if (!isMovie) {
    if (entry.ongoing) {
      metaParts.push(`Ongoing · ${ep} eps watched so far`);
    } else if (isWatched && total > 0) {
      metaParts.push(`${total} episodes · ${rt} min/ep`);
    } else if (isWatching && total > 0) {
      metaParts.push(`${ep} of ${total} episodes · ${rt} min/ep`);
    }
  }

  if (entry.watch_platform) metaParts.push(entry.watch_platform);
  lines.push(metaParts.join(' · '));

  if (entry.rating) {
    lines.push(`★ ${entry.rating} / 10`);
  } else if (isWatched) {
    lines.push('— not rated yet');
  }

  if (entry.reaction && entry.reaction.trim()) {
    const snippet = entry.reaction.trim().slice(0, 120);
    const ellipsis = entry.reaction.trim().length > 120 ? '...' : '';
    lines.push(`"${snippet}${ellipsis}"`);
  }

  lines.push('');
  lines.push("Thought you'd like this one 👀");
  lines.push('— logged on WatchedIt');

  return lines.join('\n');
}

export async function shareEntry(entry) {
  await Share.share({ message: buildShareText(entry) });
}
