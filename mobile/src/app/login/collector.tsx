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
import { AppLogo } from '../../components/branding/AppLogo';
import { useTranslation } from '../../../i18n/config';

export default function CollectorLogin() {
    const { t } = useTranslation();
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleLogin() {
        const phoneValue = phone.trim();

        if (!phoneValue) {
            setError(t('login.phoneRequired10'));
            return;
        }

        if (phoneValue.length !== 10) {
            setError(t('login.phoneInvalid10'));
            return;
        }

        setError('');
        setBusy(true);

        try {
            const res = await loginCollector(phoneValue);
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
            setError(err?.message || t('login.loginFailed'));
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
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <AppLogo size="large" />
                        </View>
                        <View style={styles.logo}>
                            <Text style={styles.logoText}>📦</Text>
                        </View>
                        <Text style={styles.title}>{t('login.collectorLoginTitle')}</Text>
                        <Text style={styles.subtitle}>{t('login.collectorLoginSubtitle')}</Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.panel}>
                        <Text style={styles.label}>{t('login.phoneNumber')}</Text>

                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={(value) => {
                                const clean = value.replace(/\D/g, '').slice(0, 10);
                                setPhone(clean);
                                if (error) setError('');
                            }}
                            keyboardType="number-pad"
                            maxLength={10}
                            placeholder={t('login.phonePlaceholder10')}
                            placeholderTextColor="#9ca3af"
                            editable={!busy}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />

                        <Pressable
                            style={[styles.button, busy && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={busy}
                        >
                            {busy ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator size="small" color="#ffffff" />
                                    <Text style={styles.buttonText}>{t('login.signingInDots')}</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>{t('login.signIn')}</Text>
                            )}
                        </Pressable>

                        <Text style={styles.hint}>{t('login.phoneHintCollector')}</Text>

                        <View style={styles.registerRow}>
                            <Text style={styles.hint}>{t('login.noAccountQuestion')}{' '}</Text>
                            <Pressable onPress={() => router.push('/login/collector/register')}>
                                <Text style={styles.link}>{t('login.createAccountLink')}</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.roleSwitch}>
                        <Text style={styles.roleText}>{t('login.notCollector')}</Text>
                        <Pressable onPress={() => router.push('/login/recycler')}>
                            <Text style={styles.link}>{t('login.loginAsRecycler')}</Text>
                        </Pressable>
                    </View>

                    <Pressable onPress={() => router.replace('/')}>
                        <Text style={styles.homeLink}>{t('login.backToHome')}</Text>
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
        shadowOffset: { width: 0, height: 6 },
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
        textAlign: 'center',
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