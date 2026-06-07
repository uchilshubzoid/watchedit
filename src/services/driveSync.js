import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getEntries, saveEntries } from '../db/storage';

const BACKUP_FILENAME   = 'watchedit-backup.json';
const DRIVE_FILES_BASE  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';
const BOUNDARY          = 'watchedit_backup_boundary';

let backupTimer = null;

// ─── Token refresh ────────────────────────────────────────────────────────────

async function getFreshToken() {
  try {
    const tokens = await GoogleSignin.getTokens();
    await AsyncStorage.setItem('watchedit_drive_token', tokens.accessToken);
    return tokens.accessToken;
  } catch {
    await AsyncStorage.removeItem('watchedit_drive_token');
    return null;
  }
}

// ─── Fetch wrapper with one 401-retry ────────────────────────────────────────

async function driveFetch(url, options, token, isRetry = false) {
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 && !isRetry) {
    const fresh = await getFreshToken();
    if (!fresh) {
      await AsyncStorage.setItem('watchedit_drive_auth_error', 'true');
      throw new Error('AUTH_EXPIRED');
    }
    return driveFetch(url, options, fresh, true);
  }

  return res;
}

// ─── Find existing backup file in appDataFolder ───────────────────────────────

async function findBackupFile(token) {
  const q   = encodeURIComponent(`name='${BACKUP_FILENAME}'`);
  const url = `${DRIVE_FILES_BASE}?spaces=appDataFolder&q=${q}&fields=files(id%2CmodifiedTime)`;
  const res = await driveFetch(url, { method: 'GET' }, token);
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0] ?? null;
}

// ─── Build multipart/related body ────────────────────────────────────────────

function buildMultipart(metadata, content) {
  return (
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${content}\r\n` +
    `--${BOUNDARY}--`
  );
}

// ─── Public: backup entries to Drive ─────────────────────────────────────────

export async function backupToDrive(token) {
  const entries = await getEntries();
  const content = JSON.stringify(entries);

  const existing = await findBackupFile(token);

  const url    = existing
    ? `${DRIVE_UPLOAD_BASE}/${existing.id}?uploadType=multipart`
    : `${DRIVE_UPLOAD_BASE}?uploadType=multipart`;
  const method   = existing ? 'PATCH' : 'POST';
  const metadata = existing ? {} : { name: BACKUP_FILENAME, parents: ['appDataFolder'] };

  const res = await driveFetch(url, {
    method,
    headers: { 'Content-Type': `multipart/related; boundary=${BOUNDARY}` },
    body: buildMultipart(metadata, content),
  }, token);

  if (!res.ok) throw new Error(`Drive backup failed: ${res.status}`);

  const now = new Date().toISOString();
  await AsyncStorage.setItem('watchedit_last_sync', now);
  return now;
}

// ─── Public: restore entries from Drive ──────────────────────────────────────
// Returns { entries, modifiedTime } or null if no backup found.

export async function restoreFromDrive(token) {
  const file = await findBackupFile(token);
  if (!file) return null;

  const res = await driveFetch(
    `${DRIVE_FILES_BASE}/${file.id}?alt=media`,
    { method: 'GET' },
    token,
  );
  if (!res.ok) return null;

  try {
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return { entries: data, modifiedTime: file.modifiedTime };
  } catch {
    return null;
  }
}

// ─── Public: apply a restore (merge or replace) ───────────────────────────────

export async function applyRestore(driveEntries, mode) {
  if (mode === 'replace') {
    await saveEntries(driveEntries);
    return driveEntries;
  }
  // merge — Drive entries fill the gaps; local entries win on id collision
  const local    = await getEntries();
  const localIds = new Set(local.map(e => e.id));
  const toAdd    = driveEntries.filter(e => !localIds.has(e.id));
  const merged   = [...local, ...toAdd];
  await saveEntries(merged);
  return merged;
}

// ─── Public: debounced auto-backup (call after any write operation) ───────────

export function scheduleDriveBackup() {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(async () => {
    backupTimer = null;
    try {
      const [authMode, token] = await Promise.all([
        AsyncStorage.getItem('watchedit_auth_mode'),
        AsyncStorage.getItem('watchedit_drive_token'),
      ]);
      if (authMode !== 'google' || !token) return;
      await backupToDrive(token);
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') {
        await AsyncStorage.setItem('watchedit_drive_auth_error', 'true');
      }
      // All other auto-backup failures are silent.
    }
  }, 5000);
}
