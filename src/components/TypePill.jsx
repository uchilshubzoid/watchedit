import { View, Text, StyleSheet } from 'react-native';
import { T } from '../constants/tokens';

const TYPE_STYLES = {
  Anime:    { bg: 'rgba(239,159,39,0.13)', color: T.amber },
  Movie:    { bg: 'rgba(250,199,117,0.13)', color: T.amberSoft },
  'TV Show':{ bg: 'rgba(200,133,74,0.15)', color: T.amberWarm },
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
  pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontFamily: T.fontTitleMedium, fontSize: 10 },
});
