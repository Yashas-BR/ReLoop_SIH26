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

import { loginCollector } from '../../../api/client';
import { saveSession } from '../../../services/auth';

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
            // Call existing backend API
            const res = await loginCollector(phoneValue);

            const { collector, token } = res.data;

            // Save logged-in collector on device
            await saveSession({
                role: 'collector',
                userId: collector.id,
                name: collector.name,
                phone: collector.phone,
                preferred_language: collector.preferred_language,
                operating_location: collector.operating_location,
                latitude: collector.latitude,
                longitude: collector.longitude,
                token,
            });

            // Go to collector area
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
            >
                <View style={styles.card}>

                    <View style={styles.header}>
                        <View style={styles.logo}>
                            <Text style={styles.logoText}>📦</Text>
                        </View>

                        <Text style={styles.title}>Collector Login</Text>

                        <Text style={styles.subtitle}>
                            Sign in to continue as a collector
                        </Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.panel}>
                        <Text style={styles.label}>Phone Number</Text>

                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={(value) => {
                                const clean = value.replace(/\D/g, '').slice(0, 10);
                                setPhone(clean);

                                if (error) {
                                    setError('');
                                }
                            }}
                            keyboardType="number-pad"
                            maxLength={10}
                            placeholder="Enter 10-digit phone number"
                            placeholderTextColor="#9ca3af"
                            editable={!busy}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />

                        <Pressable
                            style={[
                                styles.button,
                                busy && styles.buttonDisabled,
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

                                    <Text style={styles.buttonText}>
                                        Signing in...
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>
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
                                onPress={() => router.push('/collector/register')}
                            >
                                <Text style={styles.link}>
                                    Create Account
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.roleSwitch}>
                        <Text style={styles.roleText}>
                            Not a collector?
                        </Text>

                        <Pressable
                            onPress={() => router.push('/login/recycler')}
                        >
                            <Text style={styles.link}>
                                Login as Recycler
                            </Text>
                        </Pressable>
                    </View>

                    <Pressable onPress={() => router.replace('/')}>
                        <Text style={styles.homeLink}>
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    card: {
        width: '100%',
        maxWidth: 460,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 24,
        gap: 20,

        elevation: 3,

        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 15,
        shadowOffset: {
            width: 0,
            height: 6,
        },
    },

    header: {
        alignItems: 'center',
    },

    logo: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#f59e0b',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },

    logoText: {
        fontSize: 30,
    },

    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
    },

    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },

    errorBox: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },

    errorText: {
        color: '#b91c1c',
        fontSize: 14,
    },

    panel: {
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
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 16,
        color: '#111827',
    },

    button: {
        backgroundColor: '#22c55e',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },

    buttonDisabled: {
        opacity: 0.65,
    },

    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },

    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    hint: {
        fontSize: 12,
        color: '#6b7280',
    },

    registerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    roleSwitch: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
    },

    roleText: {
        color: '#6b7280',
        fontSize: 14,
    },

    link: {
        color: '#22c55e',
        fontWeight: '600',
        fontSize: 14,
    },

    homeLink: {
        color: '#22c55e',
        fontWeight: '600',
        textAlign: 'center',
    },
});