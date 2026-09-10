import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useTranslation } from '../../../i18n/config';

const SECTION_META = [
    { id: 'general', color: 'blue', warning: false, hasDoNot: false },
    { id: 'ppe', color: 'purple', warning: false, hasDoNot: false },
    { id: 'materials', color: 'green', warning: false, hasDoNot: false },
    { id: 'sharp', color: 'amber', warning: true, hasDoNot: true },
    { id: 'ewaste', color: 'purple', warning: true, hasDoNot: true },
    { id: 'chemical', color: 'red', warning: true, hasDoNot: true },
    { id: 'emergency', color: 'red', warning: true, hasDoNot: true },
] as const;

const COLOR_MAP = {
    blue: {
        bg: '#eff6ff',
        border: '#3b82f6',
        accent: '#2563eb',
    },
    green: {
        bg: '#f0fdf4',
        border: '#22c55e',
        accent: '#15803d',
    },
    purple: {
        bg: '#faf5ff',
        border: '#a855f7',
        accent: '#7e22ce',
    },
    amber: {
        bg: '#fffbeb',
        border: '#f59e0b',
        accent: '#b45309',
    },
    red: {
        bg: '#fef2f2',
        border: '#ef4444',
        accent: '#b91c1c',
    },
};

type SectionId = (typeof SECTION_META)[number]['id'];
type ColorName = keyof typeof COLOR_MAP;

function asStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function SafetySection({
    sectionId,
    color,
    warning,
    hasDoNot,
    t,
    onLayout,
}: {
    sectionId: SectionId;
    color: ColorName;
    warning: boolean;
    hasDoNot: boolean;
    t: (key: string) => any;
    onLayout: (y: number) => void;
}) {
    const colors = COLOR_MAP[color];

    const title = t(`safety.sections.${sectionId}.title`);
    const items = asStringArray(
        t(`safety.sections.${sectionId}.items`)
    );
    const doNot = hasDoNot
        ? asStringArray(
            t(`safety.sections.${sectionId}.doNot`)
        )
        : [];

    return (
        <View
            onLayout={(event) =>
                onLayout(event.nativeEvent.layout.y)
            }
            style={[
                styles.card,
                {
                    borderColor: colors.border,
                },
                warning && styles.warningCard,
            ]}
        >
            <View style={styles.cardHeader}>
                <View
                    style={[
                        styles.iconWrap,
                        { backgroundColor: colors.bg },
                    ]}
                >
                    <Text
                        style={[
                            styles.iconText,
                            { color: colors.accent },
                        ]}
                    >
                        {warning ? '!' : '✓'}
                    </Text>
                </View>

                <Text style={styles.cardTitle}>
                    {String(title)}
                </Text>

                {warning ? (
                    <View style={styles.warningBadge}>
                        <Text style={styles.warningBadgeText}>
                            {String(t('safety.warningBadge'))}
                        </Text>
                    </View>
                ) : null}
            </View>

            {items.length > 0 ? (
                <View style={styles.guidelines}>
                    {items.map((item, index) => (
                        <View
                            key={`${sectionId}-item-${index}`}
                            style={styles.guidelineRow}
                        >
                            <Text
                                style={[
                                    styles.bullet,
                                    { color: colors.accent },
                                ]}
                            >
                                •
                            </Text>

                            <Text style={styles.guidelineText}>
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {doNot.length > 0 ? (
                <View style={styles.doNotBox}>
                    <Text style={styles.doNotHeading}>
                        {String(t('safety.doNot'))}
                    </Text>

                    {doNot.map((item, index) => (
                        <View
                            key={`${sectionId}-donot-${index}`}
                            style={styles.doNotRow}
                        >
                            <Text style={styles.doNotBullet}>×</Text>
                            <Text style={styles.doNotText}>
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default function SafetyGuidance() {
    const { t } = useTranslation();
    const scrollRef = useRef<ScrollView>(null);

    const [sectionOffsets, setSectionOffsets] = useState<
        Partial<Record<SectionId, number>>
    >({});

    function jumpTo(sectionId: SectionId) {
        const y = sectionOffsets[sectionId];

        if (y == null) return;

        scrollRef.current?.scrollTo({
            y: Math.max(0, y - 20),
            animated: true,
        });
    }

    return (
        <ScrollView
            ref={scrollRef}
            style={styles.screen}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>‹ Back</Text>
            </Pressable>

            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Text style={styles.headerIconText}>🛡️</Text>
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                        {String(t('safety.title'))}
                    </Text>

                    <Text style={styles.subtitle}>
                        {String(t('safety.subtitle'))}
                    </Text>
                </View>
            </View>

            <View style={styles.offlineNotice}>
                <Text style={styles.offlineIcon}>✓</Text>
                <Text style={styles.offlineText}>
                    {String(t('safety.offlineNotice'))}
                </Text>
            </View>

            <View style={styles.jumpNav}>
                <Text style={styles.jumpNavTitle}>
                    {String(t('safety.jumpNavLabel'))}
                </Text>

                <View style={styles.jumpLinks}>
                    {SECTION_META.map((section) => (
                        <Pressable
                            key={section.id}
                            style={styles.jumpChip}
                            onPress={() => jumpTo(section.id)}
                        >
                            <Text style={styles.jumpChipText}>
                                {String(
                                    t(`safety.sections.${section.id}.title`)
                                )}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.sections}>
                {SECTION_META.map((section) => (
                    <SafetySection
                        key={section.id}
                        sectionId={section.id}
                        color={section.color}
                        warning={section.warning}
                        hasDoNot={section.hasDoNot}
                        t={t}
                        onLayout={(y) =>
                            setSectionOffsets((current) => ({
                                ...current,
                                [section.id]: y,
                            }))
                        }
                    />
                ))}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {String(t('safety.footer'))}
                </Text>
            </View>

            <View style={{ height: 36 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    container: {
        paddingHorizontal: 18,
        paddingTop: 22,
    },

    back: {
        color: '#16a34a',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 16,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
    },

    headerIcon: {
        width: 52,
        height: 52,
        borderRadius: 15,
        backgroundColor: '#f3e8ff',
        justifyContent: 'center',
        alignItems: 'center',
    },

    headerIconText: {
        fontSize: 27,
    },

    title: {
        color: '#111827',
        fontSize: 28,
        fontWeight: '900',
    },

    subtitle: {
        marginTop: 5,
        color: '#64748b',
        fontSize: 12,
        lineHeight: 18,
    },

    offlineNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        padding: 12,
        backgroundColor: '#f0fdf4',
        borderWidth: 1.5,
        borderColor: '#22c55e',
        borderRadius: 11,
        marginBottom: 16,
    },

    offlineIcon: {
        color: '#15803d',
        fontSize: 14,
        fontWeight: '900',
    },

    offlineText: {
        flex: 1,
        color: '#15803d',
        fontSize: 11,
        fontWeight: '700',
        lineHeight: 16,
    },

    jumpNav: {
        padding: 13,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 14,
        marginBottom: 17,
    },

    jumpNavTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 10,
    },

    jumpLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },

    jumpChip: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#f3e8ff',
    },

    jumpChipText: {
        color: '#7e22ce',
        fontSize: 9,
        fontWeight: '700',
    },

    sections: {
        gap: 15,
    },

    card: {
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderRadius: 15,
        padding: 15,
    },

    warningCard: {
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: {
            width: 0,
            height: 2,
        },
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },

    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    iconText: {
        fontSize: 18,
        fontWeight: '900',
    },

    cardTitle: {
        flex: 1,
        color: '#111827',
        fontSize: 17,
        fontWeight: '900',
    },

    warningBadge: {
        backgroundColor: '#fee2e2',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },

    warningBadgeText: {
        color: '#b91c1c',
        fontSize: 8,
        fontWeight: '900',
    },

    guidelines: {
        gap: 10,
    },

    guidelineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
    },

    bullet: {
        fontSize: 18,
        fontWeight: '900',
        lineHeight: 22,
    },

    guidelineText: {
        flex: 1,
        color: '#334155',
        fontSize: 15,
        lineHeight: 22,
    },

    doNotBox: {
        marginTop: 15,
        padding: 13,
        backgroundColor: '#fef2f2',
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
        borderRadius: 10,
    },

    doNotHeading: {
        color: '#b91c1c',
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 8,
    },

    doNotRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 6,
    },

    doNotBullet: {
        color: '#b91c1c',
        fontSize: 15,
        fontWeight: '900',
    },

    doNotText: {
        flex: 1,
        color: '#991b1b',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 19,
    },

    footer: {
        marginTop: 20,
        padding: 17,
        backgroundColor: '#faf5ff',
        borderWidth: 2,
        borderColor: '#a855f7',
        borderRadius: 15,
    },

    footerText: {
        color: '#7e22ce',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        fontWeight: '600',
    },
});
