import { View, Text, StyleSheet } from 'react-native';
import { T } from '../constants/tokens';

const TYPE_STYLES = {
  Anime:    { bg: 'rgba(239,159,39,0.18)',  color: T.colorAnime },
  Movie:    { bg: 'rgba(92,158,143,0.18)',  color: T.colorMovie },
  'TV Show':{ bg: 'rgba(139,126,200,0.18)', color: T.colorTV },
};

export default function TypePill({ type }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES['TV Show'];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.color }]}>{type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontFamily: T.fontTitleMedium, fontSize: 11 },
});
