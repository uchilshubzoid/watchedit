import { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmModal } from '../components/BlockingPopup';
import {
  getEntries,
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
  const [authMode,    setAuthMode]    = useState('guest');
  const [logoutModal, setLogoutModal] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([
      getEntries(),
      getTitleLanguagePref(),
      AsyncStorage.getItem('watchedit_watcher_name'),
      AsyncStorage.getItem('watchedit_auth_mode'),
    ]).then(([data, pref, storedName, storedAuth]) => {
      if (!active) return;
      setEntries(data);
      setTitleLang(pref || 'en');
      if (storedName) { setName(storedName); setTempName(storedName); }
      setAuthMode(storedAuth || 'guest');
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
  const recommendedCount = entries.filter(e => e.recommend).length;

  async function handleTitleLang(pref) {
    setTitleLang(pref);
    await setTitleLanguagePref(pref);
  }

  async function handleSave() {
    await AsyncStorage.setItem('watchedit_watcher_name', tempName);
    setName(tempName);
    setEditMode(false);
  }

  const isGoogle = authMode === 'google';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.profileSection}>
          {!editMode ? (
            <View style={styles.profileIdentity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
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
          <View style={[styles.authBadge, isGoogle && styles.authBadgeGoogle]}>
            <Text style={styles.authBadgeText}>{isGoogle ? 'Google' : 'Guest'}</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Watched',    val: String(watched.length) },
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
            {[
              {
                icon: 'download-outline',
                label: 'Export My Data',
                sub: 'Download your full WatchLog as JSON',
              },
              {
                icon: 'cloud-upload-outline',
                label: 'Import from Other Source',
                sub: 'Bring in your watch history from elsewhere',
              },
            ].map((item, i) => (
              <View
                key={item.label}
                style={[styles.manageRow, styles.manageRowLocked, i > 0 && styles.manageRowBorder]}
              >
                <View style={[styles.manageIconWrap, styles.manageIconLocked]}>
                  <Ionicons name={item.icon} size={18} color={T.textMuted} />
                </View>
                <View style={{ flex: 1, opacity: 0.5 }}>
                  <Text style={styles.manageLabel}>{item.label}</Text>
                  <Text style={styles.manageSub}>{item.sub}</Text>
                </View>
                <View style={styles.comingSoonPill}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Log out */}
        <Pressable onPress={() => setLogoutModal(true)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

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
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14, textAlign: 'center',
  },
  editBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, backgroundColor: T.elevated, borderRadius: 14, padding: 9, alignItems: 'center' },
  cancelText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 13 },
  saveBtn: { flex: 1, backgroundColor: T.amber, borderRadius: 14, padding: 9, alignItems: 'center' },
  saveText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: T.surface, borderRadius: 14, padding: 12, alignItems: 'center' },
  statVal: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 20, lineHeight: 26 },
  statLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 10, marginTop: 4 },

  sectionLabel: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 10,
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
  recCtaSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },

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
  manageSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 2 },

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

  logoutBtn: { backgroundColor: T.surface, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: T.dropped, fontFamily: T.fontTitle, fontSize: 14 },
});
