import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';

type TabKey = 'home' | 'timeline' | 'memories' | 'chat' | 'more';

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'timeline', label: 'Timeline', icon: '◇' },
  { key: 'memories', label: 'Memories', icon: '□' },
  { key: 'chat', label: 'Chat', icon: '✉' },
  { key: 'more', label: 'More', icon: '⋯' },
];

function renderScreen(tab: TabKey) {
  switch (tab) {
    case 'home':
      return <HomeScreen />;
    case 'timeline':
      return <PlaceholderScreen title="Timeline" description="Daily story and history will be migrated here." />;
    case 'memories':
      return <PlaceholderScreen title="Memories" description="Moments, photos, and shared media will be migrated here." />;
    case 'chat':
      return <PlaceholderScreen title="Chat" description="Realtime messages and socket connection will be migrated here next." />;
    case 'more':
      return <MoreScreen />;
  }
}

export function MainTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  return (
    <View style={styles.shell}>
      <View style={styles.content}>{renderScreen(activeTab)}</View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                active && styles.activeTab,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.icon, active && styles.activeText]}>{tab.icon}</Text>
              <Text style={[styles.label, active && styles.activeText]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#fff8f7',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#fffdfb',
    borderColor: '#f3d3d7',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 76,
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 54,
  },
  activeTab: {
    backgroundColor: '#fdecef',
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    color: '#9a7b7b',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 23,
  },
  label: {
    color: '#9a7b7b',
    fontSize: 11,
    fontWeight: '700',
  },
  activeText: {
    color: '#df5c78',
  },
});
