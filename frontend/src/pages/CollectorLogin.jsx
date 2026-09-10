import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function CollectorLogin() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    const phoneValue = phone.trim();

    if (!phoneValue) {
      setError('Phone number is required');
      return;
    }

    if (phoneValue.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setBusy(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/collectors/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneValue,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
          result?.error ||
          'Login failed'
        );
      }

      console.log('Collector login response:', result);

      /*
       * We'll add secure session storage next.
       *
       * Original web version:
       * saveSession(...)
       * navigate('/collector')
       */

      router.replace('/collector');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoIcon}>📦</Text>
            </View>

            <Text style={styles.title}>
              Collector Login
            </Text>

            <Text style={styles.subtitle}>
              Sign in to continue as a collector
            </Text>
          </View>

          {/* ERROR */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* LOGIN PANEL */}
          <View style={styles.loginPanel}>
            <Text style={styles.label}>
              Phone Number
            </Text>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="Enter 10-digit phone number"
              placeholderTextColor="#9ca3af"
              value={phone}
              editable={!busy}
              onChangeText={(value) => {
                const numbersOnly = value
                  .replace(/\D/g, '')
                  .slice(0, 10);

                setPhone(numbersOnly);

                if (error) {
                  setError('');
                }
              }}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            <Pressable
              style={[
                styles.loginButton,
                busy && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={busy}
            >
              {busy ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />

                  <Text style={styles.loginButtonText}>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>
                  Sign In
                </Text>
              )}
            </Pressable>

            <Text style={styles.hint}>
              Enter the phone number registered with your collector account.
            </Text>

            <View style={styles.registerRow}>
              <Text style={styles.hint}>
                Don't have an account?{' '}
              </Text>

              <Pressable
                onPress={() =>
                  router.push('/collector/register')
                }
              >
                <Text style={styles.link}>
                  Create Account
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ROLE SWITCH */}
          <View style={styles.roleSwitch}>
            <Text style={styles.roleSwitchText}>
              Not a collector?
            </Text>

            <Pressable
              onPress={() =>
                router.push('/login/recycler')
              }
            >
              <Text style={styles.link}>
                Login as Recycler
              </Text>
            </Pressable>
          </View>

          {/* BACK HOME */}
          <Pressable
            style={styles.backHome}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.link}>
              Back to Home
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 30,
  },

  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    gap: 20,

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 3,
  },

  header: {
    alignItems: 'center',
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  logoIcon: {
    fontSize: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },

  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 10,
  },

  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },

  loginPanel: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },

  loginButton: {
    width: '100%',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  hint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },

  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  roleSwitch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },

  roleSwitchText: {
    fontSize: 14,
    color: '#6b7280',
  },

  link: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },

  backHome: {
    alignItems: 'center',
  },
});