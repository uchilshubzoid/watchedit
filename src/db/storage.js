const KEY = "watchedit_entries";

export function getEntries() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addEntry(entry) {
  const entries = getEntries();
  entries.unshift(entry);
  saveEntries(entries);
}

export function updateEntry(updated) {
  const entries = getEntries();
  const idx = entries.findIndex(e => e.id === updated.id);
  if (idx !== -1) entries[idx] = updated;
  saveEntries(entries);
}

export function deleteEntry(id) {
  saveEntries(getEntries().filter(e => e.id !== id));
}

export function getEntry(id) {
  return getEntries().find(e => e.id === id) ?? null;
}

export function clearEntries() {
  localStorage.removeItem(KEY);
}
