import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../src/constants/tokens';

export default function OnboardingAuth() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.label}>Screen 2 — Auth Choice</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bgPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label:  { color: T.textMuted, fontFamily: T.fontBody, fontSize: 14 },
});
