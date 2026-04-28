import { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder } from 'react-native';
import Svg, { Polygon, Defs, ClipPath, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { T } from '../constants/tokens';

const POINTS = '12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26';

function Star({ star, value }) {
  const full = value >= star;
  const half = !full && value >= star - 0.5;
  // Each SVG gets its own ClipPath — only needed for half stars.
  // Full stars skip ClipPath entirely (avoids the '100%' width bug in RN SVG).
  const clipId = `hclip${star}`;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      {half && (
        <Defs>
          <ClipPath id={clipId}>
            <Rect x="0" y="0" width="12" height="24" />
          </ClipPath>
        </Defs>
      )}
      <Polygon points={POINTS} fill={T.elevated} />
      {full && <Polygon points={POINTS} fill={T.amber} />}
      {half && <Polygon points={POINTS} fill={T.amber} clipPath={`url(#${clipId})`} />}
    </Svg>
  );
}

export default function StarRating({ value, onChange }) {
  const layout      = useRef({ x: 0, width: 0 });
  const lastRating  = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  function applyRating(pageX) {
    const { x, width } = layout.current;
    if (!width) return;
    const relX  = Math.max(0, Math.min(pageX - x, width));
    const starW = width / 10;
    const idx   = Math.floor(relX / starW);
    const r     = Math.min(10, relX - idx * starW < starW / 2 ? idx + 0.5 : idx + 1);
    if (r !== lastRating.current) {
      lastRating.current = r;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onChangeRef.current(r);
    }
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponder:          () => true,
      onPanResponderGrant:   (e) => applyRating(e.nativeEvent.pageX),
      onPanResponderMove:    (e) => applyRating(e.nativeEvent.pageX),
      onPanResponderRelease: ()  => { lastRating.current = null; },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View
        {...pan.panHandlers}
        onLayout={(e) => {
          e.target.measure((_x, _y, w, _h, pageX) => {
            layout.current = { x: pageX, width: w };
          });
        }}
        style={styles.row}
      >
        {[1,2,3,4,5,6,7,8,9,10].map((s) => (
          <View key={s} style={styles.starWrap}>
            <Star star={s} value={value ?? 0} />
          </View>
        ))}
      </View>
      {value ? (
        <View style={styles.valueRow}>
          <Text style={styles.valueNum}>{Number.isInteger(value) ? value : value.toFixed(1)}</Text>
          <Text style={styles.valueDenom}> / 10</Text>
          <Pressable onPress={() => onChange(null)} style={styles.clearBtn}>
            <Text style={styles.clearText}>clear</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.hint}>Tap a star or drag to rate</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { gap: 10 },
  row:       { flexDirection: 'row', gap: 2 },
  starWrap:  { flex: 1, paddingVertical: 4, alignItems: 'center' },
  valueRow:  { flexDirection: 'row', alignItems: 'baseline' },
  valueNum:  { color: T.amber, fontFamily: T.fontDisplay, fontSize: 32, lineHeight: 38 },
  valueDenom:{ color: T.textMuted, fontFamily: T.fontBody, fontSize: 14 },
  clearBtn:  { marginLeft: 8 },
  clearText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  hint:      { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
});
