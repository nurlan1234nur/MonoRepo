import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { api } from '../lib/api';

export function MoreScreen() {
  const { user, logout } = useAuth();
  const { couple, partner, loading: coupleLoading } = useCouple();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function changePassword() {
    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await api('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      setMessage('Password changed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>Profile and account controls are moving here first.</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.avatar || user?.name?.slice(0, 1).toUpperCase() || 'N'}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Recovery email</Text>
            <Text style={styles.rowValue}>{user?.recoveryEmail || 'Not connected'}</Text>
          </View>
          <Text style={styles.badge}>Soon</Text>
        </View>
        <Pressable
          onPress={() => {
            setPasswordOpen((value) => !value);
            setError('');
            setMessage('');
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Password</Text>
            <Text style={styles.rowValue}>Change your login password.</Text>
          </View>
          <Text style={styles.badge}>{passwordOpen ? 'Close' : 'Change'}</Text>
        </Pressable>
        {passwordOpen ? (
          <View style={styles.form}>
            <View style={styles.passwordRow}>
              <TextInput
                editable={!busy}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor="#9a7b7b"
                secureTextEntry={!showPasswords}
                style={styles.passwordInput}
                value={currentPassword}
              />
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                editable={!busy}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor="#9a7b7b"
                secureTextEntry={!showPasswords}
                style={styles.passwordInput}
                value={newPassword}
              />
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                editable={!busy}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9a7b7b"
                secureTextEntry={!showPasswords}
                style={styles.passwordInput}
                value={confirmPassword}
              />
            </View>
            <Pressable onPress={() => setShowPasswords((value) => !value)} style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>{showPasswords ? 'Hide passwords' : 'Show passwords'}</Text>
            </Pressable>
            <Pressable
              disabled={busy || !currentPassword || !newPassword || !confirmPassword}
              onPress={changePassword}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
                (busy || !currentPassword || !newPassword || !confirmPassword) && styles.disabled,
              ]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save password</Text>}
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Couple</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Invite code</Text>
            <Text selectable style={styles.codeValue}>{couple?.inviteCode ?? '-'}</Text>
          </View>
          {coupleLoading ? <ActivityIndicator color="#df5c78" /> : <Text style={styles.badge}>Active</Text>}
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Partner</Text>
            <Text style={styles.rowValue}>{partner?.name ?? 'Waiting for partner to join'}</Text>
          </View>
          <Text style={styles.badge}>{partner ? 'Connected' : 'Open'}</Text>
        </View>
      </View>

      <Pressable onPress={logout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#fff8f7',
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#f3d3d7',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 22,
    padding: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#fdecef',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#df5c78',
    fontSize: 22,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
  },
  name: {
    color: '#3b2f2f',
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    color: '#7c5f5f',
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    color: '#9a7b7b',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#f3d3d7',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  form: {
    backgroundColor: '#fff',
    borderColor: '#f3d3d7',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  passwordRow: {
    backgroundColor: '#fff',
    borderColor: '#f0c8cf',
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordInput: {
    color: '#3b2f2f',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineButton: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  inlineButtonText: {
    color: '#df5c78',
    fontSize: 13,
    fontWeight: '800',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#df5c78',
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    backgroundColor: '#fdecef',
    borderRadius: 12,
    color: '#b9314f',
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  message: {
    backgroundColor: '#eef8ef',
    borderRadius: 12,
    color: '#2f7a45',
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: '#3b2f2f',
    fontSize: 15,
    fontWeight: '800',
  },
  rowValue: {
    color: '#7c5f5f',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  codeValue: {
    color: '#df5c78',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 3,
  },
  badge: {
    backgroundColor: '#fdecef',
    borderRadius: 8,
    color: '#df5c78',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: '#df5c78',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#df5c78',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
