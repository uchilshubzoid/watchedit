import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ConfirmModal } from '../components/BlockingPopup';
import InfoPopup from '../components/InfoPopup';
import {
  getEntries, addEntry, saveEntries,
  getTitleLanguagePref, setTitleLanguagePref,
} from '../db/storage';
import { exportJSON, exportCSV } from '../utils/exportData';
import { getGoogleAuthErrorMessage, signInWithGoogle, signOutGoogle } from '../hooks/useGoogleAuth';
import { backupToDrive, restoreFromDrive, applyRestore, scheduleDriveBackup } from '../services/driveSync';
import { T } from '../constants/tokens';

function getInitials(name = '') {
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function WatcherScreen() {
  const [entries,     setEntries]     = useState([]);
  const [name,        setName]        = useState('You');
  const [tempName,    setTempName]    = useState('You');
  const [editMode,    setEditMode]    = useState(false);
  const [titleLang,   setTitleLang]   = useState('en');
  const [authMode,       setAuthMode]       = useState('guest');
  const [driveAccount,   setDriveAccount]   = useState('');
  const [lastSync,       setLastSync]       = useState(null); // ISO string or null
  const [driveConnecting,  setDriveConnecting]  = useState(false);
  const [syncState,        setSyncState]        = useState('idle'); // 'idle' | 'syncing' | 'done'
  const [driveInfoPopup,   setDriveInfoPopup]   = useState(false);
  const [driveUnlinkPopup, setDriveUnlinkPopup] = useState(false);
  const [logoutModal,      setLogoutModal]      = useState(false);
  const driveRowAnim  = useRef(new Animated.Value(1)).current;
  const syncDoneTimer = useRef(null);

  // Easter egg: 5 rapid taps on avatar launches onboarding replay
  const avatarTapCount = useRef(0);
  const avatarTapTimer = useRef(null);

  function handleAvatarTap() {
    avatarTapCount.current += 1;
    if (avatarTapTimer.current) clearTimeout(avatarTapTimer.current);
    if (avatarTapCount.current >= 5) {
      avatarTapCount.current = 0;
      AsyncStorage.removeItem('watchedit_onboarding_done');
      router.replace('/onboarding');
      return;
    }
    avatarTapTimer.current = setTimeout(() => { avatarTapCount.current = 0; }, 1500);
  }

  // Toast
  const toastAnim   = useRef(new Animated.Value(0)).current;
  const toastTimer  = useRef(null);
  const [toastMsg,  setToastMsg]   = useState('');
  const [toastIsErr, setToastIsErr] = useState(false);

  // Import flow
  const [importPopup,   setImportPopup]   = useState(null); // null | 'invalid' | 'confirm'
  const [importPopupMsg, setImportPopupMsg] = useState('');
  const pendingImport = useRef(null);

  // Drive restore prompt (shown after inline link when local data exists)
  const [restorePopup,  setRestorePopup]  = useState(false);
  const [restoreData,   setRestoreData]   = useState(null); // { entries, count }

  // Auth error popup (token expired during auto-backup)
  const [authErrorPopup, setAuthErrorPopup] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([
      getEntries(),
      getTitleLanguagePref(),
      AsyncStorage.getItem('watchedit_watcher_name'),
      AsyncStorage.getItem('watchedit_auth_mode'),
      AsyncStorage.getItem('watchedit_drive_account'),
      AsyncStorage.getItem('watchedit_last_sync'),
      AsyncStorage.getItem('watchedit_drive_auth_error'),
      AsyncStorage.getItem('watchedit_backup_pending'),
      AsyncStorage.getItem('watchedit_drive_token'),
    ]).then(([data, pref, storedName, storedAuth, storedAccount, storedSync, authErr, backupPending, storedToken]) => {
      if (!active) return;
      setEntries(data);
      setTitleLang(pref || 'en');
      if (storedName) { setName(storedName); setTempName(storedName); }
      setAuthMode(storedAuth || 'guest');
      setDriveAccount(storedAccount || '');
      setLastSync(storedSync || null);
      if (authErr === 'true') {
        AsyncStorage.removeItem('watchedit_drive_auth_error');
        setAuthErrorPopup(true);
        return; // auth needs re-linking — don't attempt retry with a bad token
      }
      // Retry any backup that failed while offline — silently, no UI state changes
      const isLinked = storedAuth === 'drive' || storedAuth === 'google';
      if (backupPending === 'true' && isLinked && storedToken) {
        backupToDrive(storedToken)
          .then(now => { if (active) setLastSync(now); })
          .catch(err => {
            // Still offline or BACKUP_IN_PROGRESS: flag stays set, will retry next focus.
            // AUTH_EXPIRED means the token is unrecoverable — surface the re-link popup.
            if (err?.message === 'AUTH_EXPIRED' && active) setAuthErrorPopup(true);
          });
      }
    });
    return () => { active = false; };
  }, []));

  const statsPool = entries.filter(e => e.status === 'watched' || e.status === 'watching');

  let totalMins = 0;
  statsPool.forEach(e => {
    if (e.status === 'watching') {
      // Only count episodes actually watched, using stored per-episode runtime
      if (e.ep && e.epRuntime) totalMins += e.ep * e.epRuntime;
    } else if (e.watchTime) {
      const h = e.watchTime.match(/(\d+)h/);
      const m = e.watchTime.match(/(\d+)m/);
      totalMins += (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
    }
  });
  const totalHours = Math.round(totalMins / 60);
  const rated = statsPool.filter(e => e.rating);
  const avgRating = rated.length
    ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1)
    : '—';
  const recommendedCount = entries.filter(e => e.recommend).length;

  async function handleTitleLang(pref) {
    setTitleLang(pref);
    await setTitleLanguagePref(pref);
  }

  function showToast(msg, isErr = false) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastIsErr(isErr);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }, 4000);
  }

  async function handleExportJSON() {
    try {
      const data = await getEntries();
      await exportJSON(data);
    } catch {
      showToast('Export failed — try again', true);
    }
  }

  async function handleExportCSV() {
    try {
      const data = await getEntries();
      await exportCSV(data);
    } catch {
      showToast('Export failed — try again', true);
    }
  }

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      const text = await fetch(uri).then(r => r.text());
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || !parsed.every(item => item.id && item.title)) {
        setImportPopupMsg('');
        setImportPopup('invalid');
        return;
      }
      pendingImport.current = parsed;
      setImportPopupMsg(`${parsed.length} ${parsed.length === 1 ? 'entry' : 'entries'} found in this backup.`);
      setImportPopup('confirm');
    } catch {
      showToast('Could not read that file — try again', true);
    }
  }

  async function handleImportConfirm(mode) {
    setImportPopup(null);
    const imported = pendingImport.current || [];
    pendingImport.current = null;
    try {
      if (mode === 'replace') {
        await saveEntries(imported);
        scheduleDriveBackup();
        setEntries(imported);
        showToast(`Replaced — ${imported.length} ${imported.length === 1 ? 'entry' : 'entries'} imported`);
      } else {
        const existing = await getEntries();
        const existingIds = new Set(existing.map(e => e.id));
        const toAdd = imported.filter(e => !existingIds.has(e.id));
        await saveEntries([...existing, ...toAdd]);
        scheduleDriveBackup();
        setEntries([...existing, ...toAdd]);
        showToast(`Merged — ${toAdd.length} new ${toAdd.length === 1 ? 'entry' : 'entries'} added`);
      }
    } catch {
      showToast('Import failed — try again', true);
    }
  }

  async function handleSave() {
    await AsyncStorage.setItem('watchedit_watcher_name', tempName);
    setName(tempName);
    setEditMode(false);
  }

  async function handleLinkDrive() {
    setDriveConnecting(true);
    try {
      const result = await signInWithGoogle();
      if (!result) return;

      await AsyncStorage.setItem('watchedit_auth_mode', 'google');
      await AsyncStorage.setItem('watchedit_drive_account', result.email);
      await AsyncStorage.setItem('watchedit_drive_token', result.accessToken);
      await AsyncStorage.setItem('watchedit_last_sync', new Date().toISOString());

      setAuthMode('google');
      setDriveAccount(result.email);
      driveRowAnim.setValue(0);
      Animated.timing(driveRowAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

      // Check Drive for an existing backup
      try {
        const backup = await restoreFromDrive(result.accessToken);
        if (backup) {
          const local = await getEntries();
          if (local.length === 0) {
            await applyRestore(backup.entries, 'replace');
            setEntries(backup.entries);
            showToast(`WatchLog restored — ${backup.entries.length} ${backup.entries.length === 1 ? 'entry' : 'entries'} loaded`);
          } else {
            setRestoreData({ entries: backup.entries, count: backup.entries.length });
            setRestorePopup(true);
          }
        }
      } catch {
        // Backup check failure is non-blocking
      }

      const sync = await AsyncStorage.getItem('watchedit_last_sync');
      setLastSync(sync);
    } catch (error) {
      const msg = getGoogleAuthErrorMessage(error);
      if (msg) showToast(msg, true);
    } finally {
      setDriveConnecting(false);
    }
  }

  async function handleRestoreConfirm(mode) {
    setRestorePopup(false);
    if (!restoreData) return;
    try {
      const merged = await applyRestore(restoreData.entries, mode);
      setEntries(merged);
      const added = mode === 'merge'
        ? merged.length - (await getEntries()).length  // already saved, but show diff
        : restoreData.count;
      showToast(
        mode === 'merge'
          ? `Merged — ${restoreData.count} Drive ${restoreData.count === 1 ? 'entry' : 'entries'} added`
          : `Replaced — ${restoreData.count} ${restoreData.count === 1 ? 'entry' : 'entries'} loaded from Drive`
      );
    } catch {
      showToast('Restore failed — try again', true);
    }
    setRestoreData(null);
  }

  async function handleSyncNow() {
    if (syncState !== 'idle') return;
    setSyncState('syncing');
    try {
      const token = await AsyncStorage.getItem('watchedit_drive_token');
      const now   = await backupToDrive(token);
      setLastSync(now);
      setSyncState('done');
      if (syncDoneTimer.current) clearTimeout(syncDoneTimer.current);
      syncDoneTimer.current = setTimeout(() => setSyncState('idle'), 2500);
    } catch (err) {
      setSyncState('idle');
      if (err.message === 'AUTH_EXPIRED') {
        setAuthMode('guest');
        setAuthErrorPopup(true);
      } else if (err.message !== 'BACKUP_IN_PROGRESS') {
        showToast('Sync failed — check your connection', true);
      }
      // BACKUP_IN_PROGRESS: a background retry is already running — reset UI silently
    }
  }

  async function handleDriveUnlink() {
    await signOutGoogle();
    await Promise.all([
      AsyncStorage.setItem('watchedit_auth_mode', 'guest'),
      AsyncStorage.removeItem('watchedit_drive_account'),
      AsyncStorage.removeItem('watchedit_drive_token'),
      AsyncStorage.removeItem('watchedit_last_sync'),
      AsyncStorage.removeItem('watchedit_backup_pending'),
    ]);
    setAuthMode('guest');
    setDriveAccount('');
    setLastSync(null);
    setSyncState('idle');
    setDriveUnlinkPopup(false);
  }

  function formatLastSync(iso) {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  const isDriveLinked = authMode === 'drive' || authMode === 'google';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.profileSection}>
          {!editMode ? (
            <View style={styles.profileIdentity}>
              <Pressable onPress={handleAvatarTap} style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </Pressable>
              <Text style={styles.profileName}>{name}</Text>
              <Pressable
                onPress={() => { setTempName(name); setEditMode(true); }}
                hitSlop={8}
                style={styles.editIconBtn}
              >
                <Ionicons name="pencil-outline" size={15} color={T.textMuted} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.editRow}>
              <TextInput
                value={tempName} onChangeText={setTempName}
                style={styles.nameInput} placeholderTextColor={T.textMuted}
                autoFocus returnKeyType="done" onSubmitEditing={handleSave}
              />
              <View style={styles.editBtns}>
                <Pressable style={styles.cancelBtn} onPress={() => setEditMode(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          )}
          <View style={[styles.authBadge, isDriveLinked && styles.authBadgeGoogle]}>
            <Text style={styles.authBadgeText}>{isDriveLinked ? 'Google Drive' : 'Guest'}</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Titles',     val: String(statsPool.length) },
            { label: 'Hours',      val: totalHours > 0 ? `${totalHours}h` : '—' },
            { label: 'Avg Rating', val: avgRating },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* My Recommendations CTA */}
        <Pressable onPress={() => router.push('/recommendations')} style={styles.recCta}>
          <View style={styles.recCtaIcon}>
            <Ionicons name="sparkles-outline" size={19} color={T.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recCtaLabel}>My Recommendations</Text>
            <Text style={styles.recCtaSub}>
              {recommendedCount > 0
                ? `${recommendedCount} title${recommendedCount === 1 ? '' : 's'} you'd recommend`
                : "Titles you'd pass along to friends"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
        </Pressable>

        {/* Manage */}
        <View>
          <Text style={styles.sectionLabel}>Manage</Text>
          <View style={styles.manageCard}>
            <Pressable
              onPress={() => router.push('/manage-tags')}
              style={styles.manageRow}
            >
              <View style={styles.manageIconWrapAmber}>
                <Ionicons name="pricetag-outline" size={18} color={T.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageLabel}>Manage Tags & Categories</Text>
                <Text style={styles.manageSub}>Add, remove or rename your genre tags</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
            </Pressable>

            {/* Title language preference */}
            <View style={styles.langPrefRow}>
              <Text style={styles.langPrefLabel}>Preferred Title Language</Text>
              <View style={styles.langBtns}>
                {[
                  { id: 'en', label: 'English' },
                  { id: 'romaji', label: 'Romanised' },
                  { id: 'ja', label: 'Japanese' },
                ].map(opt => (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleTitleLang(opt.id)}
                    style={[styles.langBtn, titleLang === opt.id && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, titleLang === opt.id && styles.langBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Data & Connections */}
        <View>
          <Text style={styles.sectionLabel}>Data & Connections</Text>
          <View style={styles.manageCard}>

            {/* Google Drive row */}
            {!isDriveLinked ? (
              /* Guest — Link Drive */
              <View style={styles.driveLinkRow}>
                <Pressable
                  onPress={handleLinkDrive}
                  disabled={driveConnecting}
                  style={styles.driveRowMain}
                >
                  <View style={[styles.manageIconWrapAmber, driveConnecting && { opacity: 0.6 }]}>
                    {driveConnecting
                      ? <ActivityIndicator size="small" color={T.amber} />
                      : <Ionicons name="logo-google" size={18} color={T.amber} />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.manageLabel}>
                      {driveConnecting ? 'Connecting…' : 'Link Google Drive'}
                    </Text>
                    <Text style={styles.manageSub}>
                      {driveConnecting
                        ? 'Signing in to your Google account'
                        : 'Back up your WatchLog to your personal Google Drive'}
                    </Text>
                  </View>
                </Pressable>
                {!driveConnecting && (
                  <Pressable onPress={() => setDriveInfoPopup(true)} hitSlop={8} style={{ paddingRight: 14 }}>
                    <Ionicons name="information-circle-outline" size={20} color={T.textMuted} style={{ opacity: 0.6 }} />
                  </Pressable>
                )}
              </View>
            ) : (
              /* Drive connected — fades in on first link */
              <Animated.View style={[styles.manageRow, styles.manageRowBorder, { opacity: driveRowAnim }]}>
                <View style={styles.driveIconWrap}>
                  <Ionicons name="logo-google" size={18} color="#5cb85c" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.driveTitleRow}>
                    <Text style={styles.manageLabel}>Google Drive</Text>
                    <View style={styles.syncedBadge}>
                      <Text style={styles.syncedBadgeText}>✓ Synced</Text>
                    </View>
                  </View>
                  <Text style={styles.manageSub}>
                    {driveAccount ? `Connected as ${driveAccount}` : 'Connected'}
                  </Text>
                  {lastSync && (
                    <Text style={styles.driveLastSync}>Last synced: {formatLastSync(lastSync)}</Text>
                  )}
                  <View style={styles.driveActions}>
                    <Pressable
                      onPress={handleSyncNow}
                      disabled={syncState !== 'idle'}
                      style={styles.driveActionBtn}
                    >
                      {syncState === 'syncing' ? (
                        <View style={styles.driveActionInner}>
                          <ActivityIndicator size={11} color={T.textMuted} />
                          <Text style={styles.driveActionText}>Syncing…</Text>
                        </View>
                      ) : syncState === 'done' ? (
                        <View style={styles.driveActionInner}>
                          <Ionicons name="checkmark-circle-outline" size={13} color="#5cb85c" />
                          <Text style={[styles.driveActionText, { color: '#5cb85c' }]}>Synced!</Text>
                        </View>
                      ) : (
                        <View style={styles.driveActionInner}>
                          <Ionicons name="refresh-outline" size={13} color={T.textMuted} />
                          <Text style={styles.driveActionText}>Sync now</Text>
                        </View>
                      )}
                    </Pressable>
                    <Text style={styles.driveActionDivider}>·</Text>
                    <Pressable onPress={() => setDriveUnlinkPopup(true)} style={styles.driveActionBtn}>
                      <View style={styles.driveActionInner}>
                        <Ionicons name="cloud-offline-outline" size={13} color={T.dropped} style={{ opacity: 0.8 }} />
                        <Text style={[styles.driveActionText, styles.driveActionUnlink]}>Unlink</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            )}

            <Pressable onPress={handleExportJSON} style={[styles.manageRow, styles.manageRowBorder]}>
              <View style={styles.manageIconWrapAmber}>
                <Ionicons name="share-social-outline" size={18} color={T.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageLabel}>Export as JSON</Text>
                <Text style={styles.manageSub}>Full WatchLog backup — reimportable</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
            </Pressable>

            <Pressable onPress={handleExportCSV} style={[styles.manageRow, styles.manageRowBorder]}>
              <View style={styles.manageIconWrapAmber}>
                <Ionicons name="document-text-outline" size={18} color={T.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageLabel}>Export as CSV</Text>
                <Text style={styles.manageSub}>Spreadsheet-friendly flat export</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
            </Pressable>

            <Pressable onPress={handleImport} style={[styles.manageRow, styles.manageRowBorder]}>
              <View style={styles.manageIconWrapAmber}>
                <Ionicons name="archive-outline" size={18} color={T.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageLabel}>Import from WatchedIt backup</Text>
                <Text style={styles.manageSub}>Restore from a JSON export file</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Log out */}
        <Pressable onPress={() => setLogoutModal(true)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, toastIsErr && styles.toastError, {
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}
      >
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      <ConfirmModal
        show={logoutModal} onClose={() => setLogoutModal(false)}
        title="Log out?" message="You'll need to sign back in. Your WatchLog stays safe."
        confirmLabel="Log Out" onConfirm={() => setLogoutModal(false)}
      />

      {/* Import invalid file popup */}
      <InfoPopup
        visible={importPopup === 'invalid'}
        title="Unrecognised file"
        message="This doesn't look like a WatchedIt export. Make sure you're selecting a JSON file exported from WatchedIt."
        cta="Got it"
        onClose={() => setImportPopup(null)}
      />

      {/* Import confirm popup */}
      <InfoPopup
        visible={importPopup === 'confirm'}
        title="Import backup"
        message={`${importPopupMsg}\n\nMerge adds new entries, skipping any already in your log. Replace all clears your current WatchLog first.`}
        cta="Merge"
        onClose={() => handleImportConfirm('merge')}
        secondaryCta="Replace all"
        onSecondary={() => handleImportConfirm('replace')}
        secondaryDanger
      />

      {/* Drive info popup */}
      <InfoPopup
        visible={driveInfoPopup}
        title="Why link Google Drive?"
        message={"Your WatchLog gets backed up to your own Google Drive account. If you ever lose your phone or reinstall the app, everything comes back.\n\nWe never see your data — it goes straight to your Drive."}
        cta="Got it"
        onClose={() => setDriveInfoPopup(false)}
      />

      {/* Drive unlink confirm */}
      <InfoPopup
        visible={driveUnlinkPopup}
        title="Unlink Google Drive?"
        message="Your WatchLog will stay on this device but will no longer sync to Drive. You can re-link anytime."
        cta="Keep it linked"
        onClose={() => setDriveUnlinkPopup(false)}
        secondaryCta="Unlink"
        onSecondary={handleDriveUnlink}
        secondaryDanger
      />

      {/* Drive restore prompt — shown when linking with existing local data */}
      <InfoPopup
        visible={restorePopup}
        title="Found a Drive backup"
        message={`Your Drive has a backup with ${restoreData?.count ?? 0} ${restoreData?.count === 1 ? 'entry' : 'entries'}. You also have titles on this device.\n\nMerge adds Drive entries that aren't already here. Replace discards local data and loads the Drive backup.`}
        cta="Merge both"
        onClose={() => handleRestoreConfirm('merge')}
        secondaryCta="Replace with backup"
        onSecondary={() => handleRestoreConfirm('replace')}
        secondaryDanger
      />

      {/* Auth expired — shown when auto-backup fails due to token expiry */}
      <InfoPopup
        visible={authErrorPopup}
        title="Drive connection expired"
        message="Your Google session has expired. Re-link your account to keep backing up automatically."
        cta="Re-link account"
        onClose={() => { setAuthErrorPopup(false); handleLinkDrive(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },

  profileSection: {
    alignItems: 'center', gap: 10, paddingTop: 8,
  },
  profileIdentity: {
    flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'center',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: T.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 19 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 20 },
  editIconBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  authBadge: {
    alignSelf: 'center', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: T.elevated,
  },
  authBadgeGoogle: { backgroundColor: 'rgba(100,160,100,0.18)' },
  authBadgeText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 0.4 },

  editRow: { gap: 8, width: '100%' },
  nameInput: {
    backgroundColor: T.elevated, borderRadius: 12, padding: 10,
    color: T.textPrimary, fontFamily: T.fontFun, fontSize: 14, textAlign: 'center',
  },
  editBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, backgroundColor: T.elevated, borderRadius: 14, padding: 9, alignItems: 'center' },
  cancelText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 13 },
  saveBtn: { flex: 1, backgroundColor: T.amber, borderRadius: 14, padding: 9, alignItems: 'center' },
  saveText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: T.surface, borderRadius: 14, padding: 12, alignItems: 'center' },
  statVal: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 20, lineHeight: 26 },
  statLabel: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 10, marginTop: 4 },

  sectionLabel: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 13,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12,
  },

  recCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderRadius: 18, padding: 14,
  },
  recCtaIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(239,159,39,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  recCtaLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 14 },
  recCtaSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12, marginTop: 2 },

  manageCard: { backgroundColor: T.surface, borderRadius: 18, overflow: 'hidden' },
  manageRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 },
  manageRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  manageRowLocked: {},
  manageIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: T.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  manageIconWrapAmber: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(239,159,39,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  manageIconLocked: { opacity: 0.5 },
  manageLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 13 },
  manageSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13, marginTop: 2 },

  comingSoonPill: {
    backgroundColor: T.elevated, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  comingSoonText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10 },

  langPrefRow: { padding: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 10 },
  langPrefLabel: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  langBtns: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, backgroundColor: T.elevated, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  langBtnActive: { backgroundColor: T.amber },
  langBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  langBtnTextActive: { color: T.bgPrimary },

  // Drive rows
  driveLinkRow: { flexDirection: 'row', alignItems: 'center' },
  driveRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  driveIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(100,180,100,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  driveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncedBadge: {
    backgroundColor: 'rgba(100,180,100,0.15)',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  syncedBadgeText: { color: '#5cb85c', fontFamily: T.fontTitleMedium, fontSize: 10 },
  driveLastSync: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11, opacity: 0.7 },
  driveActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  driveActionBtn: { paddingVertical: 2 },
  driveActionInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  driveActionText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12, textDecorationLine: 'underline' },
  driveActionUnlink: { color: T.dropped, opacity: 0.8 },
  driveActionDivider: { color: T.textMuted, opacity: 0.4, fontSize: 12 },

  logoutBtn: { backgroundColor: T.surface, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: T.dropped, fontFamily: T.fontTitle, fontSize: 14 },

  toast: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: T.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.35)',
    elevation: 8,
  },
  toastError: { borderColor: 'rgba(196,122,122,0.4)' },
  toastText: { color: T.textPrimary, fontFamily: T.fontBodyMedium, fontSize: 13, textAlign: 'center' },
});
