import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CoupleProvider } from './context/CoupleContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainTabs } from './navigation/MainTabs';
import { AuthScreen } from './screens/AuthScreen';
import { CoupleSetupScreen } from './screens/CoupleSetupScreen';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#df5c78" size="large" />
      </View>
    );
  }

  if (!user) return <AuthScreen />;
  if (!user.couple) return <CoupleSetupScreen />;

  return (
    <CoupleProvider>
      <MainTabs />
    </CoupleProvider>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#fff8f7',
    flex: 1,
    justifyContent: 'center',
  },
});
