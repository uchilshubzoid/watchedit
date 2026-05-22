import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { T } from '../constants/tokens';

const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export default function MiniCalendar({ value, max, min, onChange }) {
  const selected = value ? new Date(value + 'T12:00:00') : new Date();
  const maxDate  = max   ? new Date(max   + 'T12:00:00') : new Date();
  const minDate  = min   ? new Date(min   + 'T12:00:00') : null;
  const [viewYear,  setViewYear]  = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  function prevMonth() {
    const ny = viewMonth === 0 ? viewYear - 1 : viewYear;
    const nm = viewMonth === 0 ? 11 : viewMonth - 1;
    if (minDate && (ny < minDate.getFullYear() || (ny === minDate.getFullYear() && nm < minDate.getMonth()))) return;
    setViewYear(ny); setViewMonth(nm);
  }
  function nextMonth() {
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    if (ny > maxDate.getFullYear() || (ny === maxDate.getFullYear() && nm > maxDate.getMonth())) return;
    setViewYear(ny); setViewMonth(nm);
  }

  const atMaxMonth = viewYear === maxDate.getFullYear() && viewMonth === maxDate.getMonth();
  const atMinMonth = minDate && viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth();
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function selectDay(d) {
    const c  = new Date(viewYear, viewMonth, d);
    const mx = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    if (c > mx) return;
    if (minDate) {
      const mn = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (c < mn) return;
    }
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    onChange(iso);
  }

  function isSelected(d) {
    return selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === d;
  }
  function isToday(d) {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === d;
  }
  function isFuture(d) {
    const c  = new Date(viewYear, viewMonth, d);
    const mx = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    return c > mx;
  }
  function isPast(d) {
    if (!minDate) return false;
    const c  = new Date(viewYear, viewMonth, d);
    const mn = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return c < mn;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={prevMonth} style={styles.navBtn} disabled={atMinMonth}>
          <Text style={[styles.navText, atMinMonth && styles.navDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn} disabled={atMaxMonth}>
          <Text style={[styles.navText, atMaxMonth && styles.navDisabled]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.daysRow}>
        {DAYS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((d, ci) =>
              d === null ? (
                <View key={`e${wi * 7 + ci}`} style={styles.cell} />
              ) : (
                <Pressable
                  key={d}
                  onPress={() => selectDay(d)}
                  disabled={isFuture(d) || isPast(d)}
                  style={[
                    styles.cell,
                    isSelected(d) && styles.selectedCell,
                    isToday(d) && !isSelected(d) && styles.todayCell,
                  ]}
                >
                  <Text style={[
                    styles.dayNum,
                    isSelected(d) && styles.selectedNum,
                    isToday(d) && !isSelected(d) && styles.todayNum,
                    (isFuture(d) || isPast(d)) && styles.futureNum,
                  ]}>
                    {d}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: T.bgPrimary, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navBtn: { padding: 6 },
  navText: { color: T.textMuted, fontSize: 22, lineHeight: 26 },
  navDisabled: { color: 'rgba(255,255,255,0.15)' },
  monthLabel: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  daysRow: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', color: T.textMuted, fontFamily: T.fontMono, fontSize: 9, letterSpacing: 0.8 },
  grid: { flexDirection: 'column' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  selectedCell: { backgroundColor: T.amber },
  todayCell: { backgroundColor: 'rgba(239,159,39,0.15)' },
  dayNum: { color: T.textPrimary, fontFamily: T.fontBody, fontSize: 13 },
  selectedNum: { color: T.bgPrimary, fontFamily: T.fontDisplay },
  todayNum: { color: T.amber, fontFamily: T.fontDisplay },
  futureNum: { color: 'rgba(255,255,255,0.18)' },
});
