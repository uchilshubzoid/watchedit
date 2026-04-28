import { Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';

function initials(title = '?') {
  const words = title.trim().split(/\s+/);
  return words.length === 1
    ? words[0].slice(0, 2).toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
}

export default function Poster({ title = '?', size = 44, url }) {
  const height = Math.round(size * 1.4);
  const radius = 10;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height, borderRadius: radius }}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={[T.amber, T.amberDeep]}
      style={{ width: size, height, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: size * 0.28 }}>
        {initials(title)}
      </Text>
    </LinearGradient>
  );
}
