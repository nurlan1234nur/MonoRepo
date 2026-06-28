import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';

export function HomeScreen() {
  const { user } = useAuth();
  const { couple, partner, loading } = useCouple();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome, {user?.name ?? 'love'}</Text>
      <Text style={styles.subtitle}>
        {partner ? `You are connected with ${partner.name}.` : 'Your private couple space is connected.'}
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>Streak</Text>
        <Text style={styles.value}>{user?.streak ?? 0}</Text>
        <Text style={styles.label}>Partner</Text>
        {loading ? <ActivityIndicator color="#df5c78" style={styles.loader} /> : <Text style={styles.value}>{partner?.name ?? 'Waiting for partner'}</Text>}
        <Text style={styles.label}>Invite code</Text>
        <Text selectable style={styles.value}>{couple?.inviteCode ?? '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff8f7',
    padding: 24,
    paddingTop: 72,
  },
  title: {
    color: '#3b2f2f',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#7c5f5f',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#f3d3d7',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    padding: 16,
  },
  label: {
    color: '#9a7b7b',
    fontSize: 12,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: '#3b2f2f',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
