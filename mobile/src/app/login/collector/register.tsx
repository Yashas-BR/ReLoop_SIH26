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
import { AppLogo } from '../../../components/branding/AppLogo';
import { useTranslation } from '../../../../i18n/config';

/** All 8 supported languages — codes match i18n config & backend */
const LANG_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'mr', label: 'मराठी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'bn', label: 'বাংলা' },
];

export default function CollectorRegister() {
    const { t } = useTranslation();

    const [form, setForm] = useState({
        name: '',
        phone: '',
        operating_location: '',
        preferred_language: 'hi',
    });

    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    function setField(key: string, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit() {
        const name = form.name.trim();
        const phone = form.phone.trim();

        if (name.length < 2) {
            setError(t('login.nameRequired'));
            return;
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError(t('login.phoneInvalidIndian'));
            return;
        }

        setError('');
        setBusy(true);

        try {
            const res = await registerCollector({
                name,
                phone,
                operating_location: form.operating_location.trim() || undefined,
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
            setError(err?.message || t('login.registerFailed'));
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
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <AppLogo size="large" />
                        </View>
                        <View style={styles.logo}>
                            <Text style={styles.logoText}>📦</Text>
                        </View>
                        <Text style={styles.title}>{t('login.registerTitle')}</Text>
                        <Text style={styles.subtitle}>{t('login.registerSubtitle')}</Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.panel}>

                        <Text style={styles.label}>{t('login.nameLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.namePlaceholder')}
                            placeholderTextColor="#9ca3af"
                            value={form.name}
                            onChangeText={(value) => setField('name', value)}
                            editable={!busy}
                        />

                        <Text style={styles.label}>{t('login.phoneLabel10')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.phonePlaceholder10Digit')}
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={10}
                            value={form.phone}
                            onChangeText={(value) =>
                                setField('phone', value.replace(/\D/g, '').slice(0, 10))
                            }
                            editable={!busy}
                        />

                        <Text style={styles.label}>{t('login.operatingLocationLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('login.operatingLocationPlaceholder')}
                            placeholderTextColor="#9ca3af"
                            value={form.operating_location}
                            onChangeText={(value) => setField('operating_location', value)}
                            editable={!busy}
                        />

                        <Text style={styles.label}>{t('login.preferredLanguageLabel')}</Text>
                        <View style={styles.languageContainer}>
                            {LANG_OPTIONS.map((option) => {
                                const active = form.preferred_language === option.code;
                                return (
                                    <Pressable
                                        key={option.code}
                                        style={[
                                            styles.languageOption,
                                            active && styles.languageOptionActive,
                                        ]}
                                        onPress={() => setField('preferred_language', option.code)}
                                        disabled={busy}
                                    >
                                        <View
                                            style={[
                                                styles.radioOuter,
                                                active && styles.radioOuterActive,
                                            ]}
                                        >
                                            {active ? <View style={styles.radioInner} /> : null}
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
                            style={[styles.button, busy && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={busy}
                        >
                            {busy ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator color="#ffffff" size="small" />
                                    <Text style={styles.buttonText}>{t('login.creatingAccount')}</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>{t('login.createAccountBtn')}</Text>
                            )}
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => router.replace('/login/collector')}
                        disabled={busy}
                    >
                        <Text style={styles.loginLink}>{t('login.alreadyHaveAccount')}</Text>
                    </Pressable>

                    <Pressable onPress={() => router.replace('/')} disabled={busy}>
                        <Text style={styles.homeLink}>{'← '}{t('login.backToHome')}</Text>
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
        fontSize: 15,
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
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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