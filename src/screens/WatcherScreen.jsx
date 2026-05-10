import { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { ConfirmModal } from '../components/BlockingPopup';
import {
  getEntries, clearEntries,
  getTitleLanguagePref, setTitleLanguagePref,
} from '../db/storage';
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
  const [clearModal,  setClearModal]  = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([
      getEntries(),
      getTitleLanguagePref(),
      AsyncStorage.getItem('watchedit_watcher_name'),
    ]).then(([data, pref, storedName]) => {
      if (!active) return;
      setEntries(data);
      setTitleLang(pref || 'en');
      if (storedName) { setName(storedName); setTempName(storedName); }
    });
    return () => { active = false; };
  }, []));

  const watched = entries.filter(e => e.status === 'watched');

  let totalMins = 0;
  watched.forEach(e => {
    if (e.watchTime) {
      const h = e.watchTime.match(/(\d+)h/);
      const m = e.watchTime.match(/(\d+)m/);
      totalMins += (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
    }
  });
  const totalHours = Math.round(totalMins / 60);
  const rated = watched.filter(e => e.rating);
  const avgRating = rated.length
    ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1)
    : '—';

  async function handleTitleLang(pref) {
    setTitleLang(pref);
    await setTitleLanguagePref(pref);
  }

  async function handleSave() {
    await AsyncStorage.setItem('watchedit_watcher_name', tempName);
    setName(tempName);
    setEditMode(false);
  }

  async function handleClearData() {
    await clearEntries();
    setEntries([]);
    setClearModal(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
          </View>
          {!editMode ? (
            <>
              <Text style={styles.profileName}>{name}</Text>
              <Pressable onPress={() => { setTempName(name); setEditMode(true); }} style={styles.editProfileBtn}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.editRow}>
              <TextInput
                value={tempName} onChangeText={setTempName}
                style={styles.nameInput} placeholderTextColor={T.textMuted}
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
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Watched', val: String(watched.length) },
            { label: 'Hours',   val: totalHours > 0 ? `${totalHours}h` : '—' },
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
          <Text style={styles.recCtaIcon}>👍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.recCtaLabel}>My Recommendations</Text>
            <Text style={styles.recCtaSub}>
              {entries.filter(e => e.recommend).length > 0
                ? `${entries.filter(e => e.recommend).length} title${entries.filter(e => e.recommend).length === 1 ? '' : 's'} you'd recommend`
                : 'Titles you'd pass along to friends'}
            </Text>
          </View>
          <Text style={styles.recCtaArrow}>›</Text>
        </Pressable>

        {/* Manage */}
        <View>
          <Text style={styles.sectionLabel}>Manage</Text>
          <View style={styles.manageCard}>
            {[
              { icon: '🏷️', label: 'Manage Tags & Categories', sub: 'Add, remove or rename your genre tags' },
              { icon: '🎨', label: 'App Preferences', sub: 'Theme and display settings' },
            ].map((item, i) => (
              <Pressable key={item.label} style={[styles.manageRow, i === 0 && styles.manageRowBorder]}>
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.manageLabel}>{item.label}</Text>
                  <Text style={styles.manageSub}>{item.sub}</Text>
                </View>
                <Text style={{ color: T.textMuted }}>›</Text>
              </Pressable>
            ))}
            {/* Title language preference */}
            <View style={styles.langPrefRow}>
              <Text style={styles.langPrefLabel}>Preferred Title Language</Text>
              <View style={styles.langBtns}>
                {[{ id: 'en', label: 'English' }, { id: 'romaji', label: 'Romanised' }, { id: 'ja', label: 'Japanese' }].map(opt => (
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

        {/* Data & Connections (Stage 3) */}
        <View>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>Data & Connections</Text>
            <View style={styles.stagePill}>
              <Text style={styles.stagePillText}>Stage 3</Text>
            </View>
          </View>
          <View style={styles.manageCard}>
            {[
              { icon: '🔗', label: 'Connect MyAnimeList', sub: 'Import anime history + sync new watches' },
              { icon: '📥', label: 'Import Netflix History', sub: 'Upload your Netflix watch history CSV' },
              { icon: '📤', label: 'Export My Data', sub: 'Download your full WatchLog as JSON or CSV' },
            ].map((item, i) => (
              <View key={item.label} style={[styles.manageRow, styles.manageRowLocked, i < 2 && styles.manageRowBorder]}>
                <Text style={{ fontSize: 18, opacity: 0.5 }}>{item.icon}</Text>
                <View style={{ flex: 1, opacity: 0.5 }}>
                  <Text style={styles.manageLabel}>{item.label}</Text>
                  <Text style={styles.manageSub}>{item.sub}</Text>
                </View>
                <Text style={{ color: T.textMuted, fontSize: 12, fontFamily: T.fontMono }}>🔒</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Clear data */}
        <Pressable onPress={() => setClearModal(true)} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear all data</Text>
        </Pressable>

        {/* Log out */}
        <Pressable onPress={() => setLogoutModal(true)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        show={clearModal} onClose={() => setClearModal(false)}
        title="Clear all data?" message="This will wipe your entire WatchLog. Cannot be undone."
        confirmLabel="Clear It" onConfirm={handleClearData}
      />
      <ConfirmModal
        show={logoutModal} onClose={() => setLogoutModal(false)}
        title="Log out?" message="You'll need to sign back in. Your WatchLog stays safe."
        confirmLabel="Log Out" onConfirm={() => setLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  profileSection: { alignItems: 'center', gap: 12, paddingTop: 8 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: T.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 26 },
  profileName: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 20 },
  editProfileBtn: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  editProfileText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 13 },
  editRow: { width: '100%', gap: 10 },
  nameInput: {
    backgroundColor: T.elevated, borderRadius: 12, padding: 12,
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14, textAlign: 'center',
  },
  editBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: T.elevated, borderRadius: 14, padding: 10, alignItems: 'center' },
  cancelText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 13 },
  saveBtn: { flex: 1, backgroundColor: T.amber, borderRadius: 14, padding: 10, alignItems: 'center' },
  saveText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: T.surface, borderRadius: 14, padding: 12, alignItems: 'center' },
  statVal: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 20, lineHeight: 26 },
  statLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 10, marginTop: 4 },
  sectionLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  stagePill: { backgroundColor: 'rgba(239,159,39,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  stagePillText: { color: T.amberSoft, fontFamily: T.fontMono, fontSize: 11 },
  recCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderRadius: 18, padding: 14,
  },
  recCtaIcon: { fontSize: 20 },
  recCtaLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 14 },
  recCtaSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },
  recCtaArrow: { color: T.textMuted, fontSize: 20, fontFamily: T.fontBody },
  manageCard: { backgroundColor: T.surface, borderRadius: 18, overflow: 'hidden' },
  manageRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 },
  manageRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  manageRowLocked: {},
  manageLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 13 },
  manageSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 2 },
  langPrefRow: { padding: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 10 },
  langPrefLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  langBtns: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, backgroundColor: T.elevated, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  langBtnActive: { backgroundColor: T.amber },
  langBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  langBtnTextActive: { color: T.bgPrimary },
  clearBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(196,122,122,0.3)',
    borderRadius: 18, paddingVertical: 12, alignItems: 'center', backgroundColor: T.elevated,
  },
  clearBtnText: { color: 'rgba(196,122,122,0.7)', fontFamily: T.fontMono, fontWeight: '600', fontSize: 12, letterSpacing: 0.4 },
  logoutBtn: { backgroundColor: T.surface, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: T.dropped, fontFamily: T.fontTitle, fontSize: 14 },
});
