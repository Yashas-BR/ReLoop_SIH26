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
import { router } from 'expo-router';

import { registerCollector } from '../../../../api/client';
import { saveSession } from '../../../../services/auth';

const LANG_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'mr', label: 'मराठी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
];

export default function CollectorRegister() {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        operating_location: '',
        preferred_language: 'hi',
    });

    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    function setField(key: string, value: string) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    async function handleSubmit() {
        const name = form.name.trim();
        const phone = form.phone.trim();

        if (name.length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError('Enter a valid 10-digit Indian phone number');
            return;
        }

        setError('');
        setBusy(true);

        try {
            const res = await registerCollector({
                name,
                phone,
                operating_location:
                    form.operating_location.trim() || undefined,
                preferred_language: form.preferred_language,
            });

            const { collector, token } = res.data;

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

            router.replace('/collector');
        } catch (err: any) {
            setError(err?.message || 'Could not create account');
        } finally {
            setBusy(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
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

                        <Text style={styles.title}>Create Collector Account</Text>

                        <Text style={styles.subtitle}>
                            Join Kabadiwala Connect
                        </Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.panel}>
                        <Text style={styles.panelTitle}>Kabadiwala</Text>

                        <Text style={styles.label}>Name</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            value={form.name}
                            onChangeText={(value) => setField('name', value)}
                            editable={!busy}
                        />

                        <Text style={styles.label}>Phone Number</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="10-digit mobile number"
                            keyboardType="number-pad"
                            maxLength={10}
                            value={form.phone}
                            onChangeText={(value) =>
                                setField(
                                    'phone',
                                    value.replace(/\D/g, '').slice(0, 10)
                                )
                            }
                            editable={!busy}
                        />

                        <Text style={styles.label}>Operating Location</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Example: Bengaluru"
                            value={form.operating_location}
                            onChangeText={(value) =>
                                setField('operating_location', value)
                            }
                            editable={!busy}
                        />

                        <Text style={styles.label}>Preferred Language</Text>

                        <View style={styles.languageContainer}>
                            {LANG_OPTIONS.map((option) => {
                                const active =
                                    form.preferred_language === option.code;

                                return (
                                    <Pressable
                                        key={option.code}
                                        style={[
                                            styles.languageOption,
                                            active && styles.languageOptionActive,
                                        ]}
                                        onPress={() =>
                                            setField(
                                                'preferred_language',
                                                option.code
                                            )
                                        }
                                        disabled={busy}
                                    >
                                        <View
                                            style={[
                                                styles.radioOuter,
                                                active && styles.radioOuterActive,
                                            ]}
                                        >
                                            {active ? (
                                                <View style={styles.radioInner} />
                                            ) : null}
                                        </View>

                                        <Text
                                            style={[
                                                styles.languageText,
                                                active && styles.languageTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Pressable
                            style={[
                                styles.button,
                                busy && styles.buttonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={busy}
                        >
                            {busy ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Create Account
                                </Text>
                            )}
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => router.replace('/login/collector')}
                        disabled={busy}
                    >
                        <Text style={styles.loginLink}>
                            Already have an account? Sign in
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => router.replace('/')}
                        disabled={busy}
                    >
                        <Text style={styles.homeLink}>← Back to Home</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f8fafc',
    },

    card: {
        width: '100%',
        maxWidth: 460,
        alignSelf: 'center',
    },

    header: {
        alignItems: 'center',
        marginBottom: 24,
    },

    logo: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },

    logoText: {
        fontSize: 30,
    },

    title: {
        fontSize: 27,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
    },

    subtitle: {
        marginTop: 6,
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
    },

    errorBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },

    errorText: {
        color: '#b91c1c',
        fontSize: 14,
    },

    panel: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 18,
        padding: 20,
    },

    panelTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
    },

    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 7,
        marginTop: 12,
    },

    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#ffffff',
    },

    languageContainer: {
        marginTop: 4,
        gap: 10,
    },

    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },

    languageOptionActive: {
        borderColor: '#f59e0b',
        backgroundColor: '#fffbeb',
    },

    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#9ca3af',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },

    radioOuterActive: {
        borderColor: '#f59e0b',
    },

    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#f59e0b',
    },

    languageText: {
        color: '#374151',
        fontWeight: '500',
    },

    languageTextActive: {
        color: '#92400e',
        fontWeight: '700',
    },

    button: {
        marginTop: 24,
        backgroundColor: '#16a34a',
        borderRadius: 10,
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonDisabled: {
        opacity: 0.65,
    },

    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },

    loginLink: {
        textAlign: 'center',
        marginTop: 20,
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '600',
    },

    homeLink: {
        textAlign: 'center',
        marginTop: 16,
        color: '#6b7280',
        fontSize: 14,
    },
});