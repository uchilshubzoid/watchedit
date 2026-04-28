import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTRIES_KEY = 'watchedit_entries';
const LANG_PREF_KEY = 'watchedit_title_language_pref';

export async function getEntries() {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveEntries(entries) {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export async function addEntry(entry) {
  const entries = await getEntries();
  entries.unshift(entry);
  await saveEntries(entries);
}

export async function updateEntry(updated) {
  const entries = await getEntries();
  const idx = entries.findIndex(e => e.id === updated.id);
  if (idx !== -1) entries[idx] = updated;
  await saveEntries(entries);
}

export async function deleteEntry(id) {
  await saveEntries((await getEntries()).filter(e => e.id !== id));
}

export async function getEntry(id) {
  return (await getEntries()).find(e => e.id === id) ?? null;
}

export async function clearEntries() {
  await AsyncStorage.removeItem(ENTRIES_KEY);
}

export async function getTitleLanguagePref() {
  try {
    return (await AsyncStorage.getItem(LANG_PREF_KEY)) || 'en';
  } catch {
    return 'en';
  }
}

export async function setTitleLanguagePref(pref) {
  await AsyncStorage.setItem(LANG_PREF_KEY, pref);
}
