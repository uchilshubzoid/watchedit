import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';
import MiniCalendar from './MiniCalendar';
import { T } from '../constants/tokens';

function localISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoToDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function parseToISO(text) {
  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LogSeshSheet({ entry, onClose, onUpdate, markAll = false }) {
  const todayISO  = localISODate();
  const currentEp = entry?.ep || 0;
  const total     = entry?.total || null;
  const ongoing   = entry?.ongoing || false;

  // Normal sesh mode: 'count' (how many this sesh) | 'number' (which episode)
  const [countMode, setCountMode] = useState(true);
  const [epCount,   setEpCount]   = useState('');   // count mode: episodes watched this sesh
  const [epTo,      setEpTo]      = useState(markAll && total ? String(total) : ''); // direct mode
  const [date,      setDate]      = useState(todayISO);
  const [dateText,  setDateText]  = useState(isoToDisplay(todayISO));
  const [calOpen,   setCalOpen]   = useState(false);
  const [rating,    setRating]    = useState(null);
  const [reaction,  setReaction]  = useState('');
  const [errors,    setErrors]    = useState({});

  const epFromNum  = currentEp + 1;
  const epToNum    = countMode
    ? currentEp + (parseInt(epCount, 10) || 0)
    : epTo.trim() === '' ? epFromNum : (parseInt(epTo, 10) || 0);

  const markAllOngoing = markAll && ongoing;
  const isComplete     = markAllOngoing
    ? epToNum > 0
    : (!ongoing && total && epToNum >= total);

  function validate() {
    const errs = {};
    if (markAllOngoing) {
      if (!epTo.trim() || epToNum <= 0)  errs.epTo   = 'Enter the last episode you watched';
      else if (epToNum <= currentEp)     errs.epTo   = "You're already past that episode";
      if (!rating)                       errs.rating = 'Rate it before marking it done';
    } else {
      if (countMode) {
        const n = parseInt(epCount, 10);
        if (!epCount.trim() || n <= 0)   errs.epTo = 'Enter how many episodes you watched';
        else if (!ongoing && total && epToNum > total) errs.epTo = `Only ${total} episodes in this show`;
      } else {
        if (epToNum <= currentEp)                    errs.epTo = "You're already past that episode";
        if (!ongoing && total && epToNum > total)    errs.epTo = `Only ${total} episodes in this show`;
      }
      if (isComplete && !rating)                     errs.rating = 'Rate it before marking it complete';
    }
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newSession = { ep_from: epFromNum, ep_to: epToNum, date, date_display: fmtDate(date) };
    const updated = { ...entry, ep: epToNum, watch_sessions: [...(entry.watch_sessions || []), newSession] };

    if (isComplete) {
      updated.status         = 'watched';
      updated.rating         = rating;
      updated.reaction       = reaction.trim() || undefined;
      updated.finishedDate   = fmtDate(date);
      updated.watch_end_date = date;
      updated.paused         = false;
      updated.dropped        = false;
      if (markAllOngoing) { updated.total = epToNum; updated.ongoing = false; }
    } else {
      const rt   = entry.epRuntime || (entry.type === 'Anime' ? 24 : 45);
      const mins = rt * epToNum;
      updated.status          = 'watching';
      updated.paused          = false;
      updated.dropped         = false;
      updated.lastWatchedDate = fmtDate(date);
      if (epToNum > 0) { updated.watchTime = `~${Math.floor(mins/60)}h ${mins%60}m`; updated.estimated = true; }
    }

    onUpdate(updated);
    onClose();
  }

  const infoLine = ongoing
    ? `${currentEp} eps watched · Ongoing`
    : total ? `Currently on Ep ${currentEp} of ${total}` : `Currently on Ep ${currentEp}`;

  const countPreview = (() => {
    const n = parseInt(epCount, 10);
    if (!n || n <= 0) return null;
    const to = currentEp + n;
    return n === 1
      ? `Ep ${epFromNum} · Now on ep ${to}`
      : `Ep ${epFromNum}–${to} · Now on ep ${to}`;
  })();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior='padding'
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <Pressable onPress={onClose} style={styles.handleWrap}>
            <View style={styles.handle} />
          </Pressable>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  {markAllOngoing ? 'Mark as Finished' : markAll ? 'Mark All Watched' : 'Log a Sesh'}
                </Text>
                <Text style={styles.headerSub}>{infoLine}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeX}>✕</Text>
              </Pressable>
            </View>

            {/* Ongoing finish — single ep input */}
            {markAllOngoing && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Final Episode Watched</Text>
                <TextInput
                  value={epTo} onChangeText={t => { setEpTo(t); setErrors(p => ({ ...p, epTo: null })); }}
                  keyboardType="number-pad" placeholder={currentEp > 0 ? String(currentEp + 1) : 'e.g. 47'}
                  placeholderTextColor={T.textMuted}
                  style={[styles.epInput, errors.epTo && styles.inputError, epToNum > currentEp && styles.inputActive]}
                  autoFocus
                />
                {errors.epTo ? <Text style={styles.errorText}>{errors.epTo}</Text>
                  : <Text style={styles.fieldHint}>How many episodes total did you watch?</Text>}
              </View>
            )}

            {/* Normal sesh — count or direct mode */}
            {!markAll && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Episodes Watched This Sesh</Text>

                {/* Mode toggle */}
                <View style={styles.modeRow}>
                  <Pressable onPress={() => { setCountMode(true); setErrors(p => ({ ...p, epTo: null })); }}
                    style={[styles.modeBtn, countMode && styles.modeBtnActive]}>
                    <Text style={[styles.modeBtnText, countMode && styles.modeBtnTextActive]}>Count</Text>
                  </Pressable>
                  <Pressable onPress={() => { setCountMode(false); setErrors(p => ({ ...p, epTo: null })); }}
                    style={[styles.modeBtn, !countMode && styles.modeBtnActive]}>
                    <Text style={[styles.modeBtnText, !countMode && styles.modeBtnTextActive]}>Episode #</Text>
                  </Pressable>
                </View>

                {countMode ? (
                  <>
                    <TextInput
                      value={epCount}
                      onChangeText={t => { setEpCount(t); setErrors(p => ({ ...p, epTo: null, rating: null })); }}
                      keyboardType="number-pad"
                      placeholder="How many this time?"
                      placeholderTextColor={T.textMuted}
                      style={[styles.epInput, errors.epTo && styles.inputError, epToNum > currentEp && styles.inputActive]}
                      autoFocus
                    />
                    {errors.epTo
                      ? <Text style={styles.errorText}>{errors.epTo}</Text>
                      : countPreview
                        ? <Text style={styles.fieldHint}>{countPreview}</Text>
                        : <Text style={styles.fieldHint}>Starting from ep {epFromNum}</Text>}
                  </>
                ) : (
                  <>
                    <TextInput
                      value={epTo}
                      onChangeText={t => { setEpTo(t); setErrors(p => ({ ...p, epTo: null, rating: null })); }}
                      keyboardType="number-pad"
                      placeholder={`Currently on ep ${currentEp}`}
                      placeholderTextColor={T.textMuted}
                      style={[styles.epInput, errors.epTo && styles.inputError, epToNum > currentEp && styles.inputActive]}
                      autoFocus
                    />
                    {errors.epTo
                      ? <Text style={styles.errorText}>{errors.epTo}</Text>
                      : <Text style={styles.fieldHint}>Which episode did you last watch?</Text>}
                  </>
                )}
              </View>
            )}

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date Watched</Text>
              <View style={styles.dateRow}>
                <TextInput
                  value={dateText} onChangeText={setDateText}
                  onBlur={() => {
                    const iso = parseToISO(dateText);
                    if (iso) { setDate(iso); setDateText(isoToDisplay(iso)); }
                    else setDateText(isoToDisplay(date));
                  }}
                  placeholder="Apr 25, 2026" placeholderTextColor={T.textMuted}
                  style={styles.dateInput}
                />
                <Pressable onPress={() => setCalOpen(o => !o)} style={styles.calBtn}>
                  <Ionicons name="calendar-outline" size={18} color={calOpen ? T.amber : T.textMuted} />
                </Pressable>
              </View>
              {calOpen && (
                <MiniCalendar
                  value={date} max={todayISO}
                  onChange={iso => { setDate(iso); setDateText(isoToDisplay(iso)); setCalOpen(false); }}
                />
              )}
            </View>

            {/* Complete section */}
            {isComplete && (
              <View style={styles.completeBox}>
                <Text style={styles.completeTitle}>
                  Like Jon Snow, your watch has ended. Yay or Nay, what's your say?
                </Text>
                <Text style={styles.completeSub}>
                  {markAllOngoing
                    ? 'This will mark the show as Watched and lock in your final episode count.'
                    : 'This will mark the show as Watched.'}
                </Text>
                <View style={styles.starWrap}>
                  <StarRating value={rating} onChange={v => { setRating(v); setErrors(p => ({ ...p, rating: null })); }} />
                </View>
                {errors.rating && <Text style={styles.errorText}>{errors.rating}</Text>}
                <View style={styles.reactionHeader}>
                  <Text style={styles.fieldLabel}>Your reaction (optional)</Text>
                  <Text style={styles.charCount}>{reaction.length}/500</Text>
                </View>
                <TextInput
                  value={reaction} onChangeText={t => setReaction(t.slice(0, 500))}
                  placeholder="Your thoughts, feelings, hot takes... 🔥" placeholderTextColor={T.textMuted}
                  multiline numberOfLines={3} style={styles.textarea} textAlignVertical="top"
                />
              </View>
            )}

            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>{isComplete ? 'Mark Watched ✓' : 'Log Sesh ✓'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  handleWrap: { alignItems: 'center', paddingVertical: 16 },
  handle: { width: 36, height: 4, backgroundColor: T.elevated, borderRadius: 4 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 18, marginBottom: 4 },
  headerSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },
  closeBtn: { padding: 4 },
  closeX: { color: T.textMuted, fontSize: 18 },
  field: { gap: 8 },
  fieldLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  fieldHint: { color: T.amberSoft, fontFamily: T.fontFun, fontSize: 12 },
  modeRow: { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 12, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  modeBtnActive: { backgroundColor: T.surface },
  modeBtnText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },
  modeBtnTextActive: { color: T.textPrimary, fontFamily: T.fontTitle },
  epInput: {
    backgroundColor: T.elevated, borderRadius: 12, padding: 14,
    color: T.textPrimary, fontFamily: T.fontMono, fontWeight: '700', fontSize: 20,
    textAlign: 'center', borderWidth: 1.5, borderColor: 'transparent',
  },
  inputError: { borderColor: '#C47A7A' },
  inputActive: { borderColor: T.amber, color: T.amber },
  errorText: { color: '#C47A7A', fontFamily: T.fontFun, fontSize: 11 },
  dateRow: { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 12, overflow: 'hidden' },
  dateInput: { flex: 1, padding: 12, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14 },
  calBtn: { padding: 10, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' },
  completeBox: {
    backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.2)', borderRadius: 16, padding: 16, gap: 12,
  },
  completeTitle: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 15 },
  completeSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12 },
  starWrap: { backgroundColor: T.surface, borderRadius: 12, padding: 14 },
  reactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  textarea: {
    backgroundColor: T.surface, borderRadius: 12, padding: 12,
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14, minHeight: 80,
  },
  submitBtn: {
    backgroundColor: T.amber, borderRadius: 18, paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  submitText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 16 },
});
