import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Modal, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogItSearch from '../../src/screens/LogItSearch';
import { T } from '../../src/constants/tokens';

function LogItFAB({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.fabWrapper}
      android_ripple={{ color: T.amberDeep, radius: 28, borderless: true }}
    >
      <LinearGradient colors={[T.amber, T.amberDeep]} style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

function TabIcon({ name, focused }) {
  return (
    <Ionicons
      name={focused ? name : `${name}-outline`}
      size={24}
      color={focused ? T.amber : T.textMuted}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarH = 63 + insets.bottom;
  const [logitOpen, setLogitOpen] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('openLogIt', () => setLogitOpen(true));
    return () => sub.remove();
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            ...styles.tabBar,
            height: tabBarH,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            overflow: 'visible',
          },
          tabBarActiveTintColor: T.amber,
          tabBarInactiveTintColor: T.textMuted,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Watch Tower',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="watchlist"
          options={{
            title: 'Watch List',
            tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="plus"
          options={{
            title: '',
            tabBarButton: () => <LogItFAB onPress={() => setLogitOpen(true)} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="watcher"
          options={{
            title: 'Watcher',
            tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
          }}
        />
      </Tabs>

      <Modal
        visible={logitOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setLogitOpen(false)}
      >
        <LogItSearch onClose={() => setLogitOpen(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    elevation: 0,
  },
  tabLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: 11,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
