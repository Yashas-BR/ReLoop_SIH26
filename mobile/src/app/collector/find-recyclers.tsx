import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    getLotsByCollector,
} from '../../../api/client';

import { currentCollectorId } from '../../../services/auth';
import { useTranslation } from '../../../i18n/config';

type Lot = {
    lot_id: string | number;
    category?: string;
    material_category?: string;
    approx_weight_kg?: number | string;
    weight_kg?: number | string;
    estimated_value?: number | string;
    final_price?: number | string;
    location?: string;
    collection_location?: string;
    handover_location?: string;
    gps_lat?: number | string;
    gps_lng?: number | string;
    latitude?: number | string;
    longitude?: number | string;
    created_at?: string;
    transaction_status?: string;
    payment_status?: string;
};

function fmtDate(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function statusColors(status?: string) {
    const value = String(status || '').toLowerCase();

    if (['completed', 'paid', 'confirmed'].includes(value)) {
        return { bg: '#dcfce7', text: '#15803d' };
    }

    if (['pending', 'quoted', 'matched', 'created'].includes(value)) {
        return { bg: '#fef3c7', text: '#b45309' };
    }

    if (['cancelled', 'rejected'].includes(value)) {
        return { bg: '#fee2e2', text: '#b91c1c' };
    }

    return { bg: '#e5e7eb', text: '#4b5563' };
}

export default function FindRecyclersScreen() {
    const { t } = useTranslation();
    const [lots, setLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadLots = useCallback(async () => {
        setError('');

        try {
            const collectorId = await currentCollectorId();
            if (!collectorId) {
                router.replace('/login/collector');
                return;
            }

            const response = await getLotsByCollector(collectorId);
            const data = response?.data;

            setLots(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.log('Find recyclers lots error:', err);
            setError(err?.message || t('dashboard.findRecyclersDesc'));
        }
    }, []);

    useEffect(() => {
        async function initialLoad() {
            setLoading(true);
            try {
                await loadLots();
            } finally {
                setLoading(false);
            }
        }

        initialLoad();
    }, [loadLots]);

    async function refresh() {
        setRefreshing(true);
        try {
            await loadLots();
        } finally {
            setRefreshing(false);
        }
    }

    const selectableLots = useMemo(() => {
        return lots.filter((lot) => {
            const status = String(
                lot.transaction_status || lot.payment_status || ''
            ).toLowerCase();

            return !['completed', 'cancelled', 'rejected', 'paid'].includes(status);
        });
    }, [lots]);

    function openMatchedRecyclers(lot: Lot) {
        const category = lot.category || lot.material_category || 'PCB';
        const weight = lot.approx_weight_kg ?? lot.weight_kg;
        const estimatedValue = lot.estimated_value ?? lot.final_price;
        const location =
            lot.location ||
            lot.collection_location ||
            lot.handover_location ||
            '';

        const lat = lot.gps_lat ?? lot.latitude;
        const lng = lot.gps_lng ?? lot.longitude;

        router.push({
            pathname: '/collector/matched-recyclers',
            params: {
                lotId: String(lot.lot_id),
                category: String(category),
                location: String(location),
                ...(lat != null ? { lat: String(lat) } : {}),
                ...(lng != null ? { lng: String(lng) } : {}),
                ...(weight != null ? { weight: String(weight) } : {}),
                ...(estimatedValue != null
                    ? { estimatedValue: String(estimatedValue) }
                    : {}),
            },
        });
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refresh} />
            }
        >
            <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>‹ {t('common.back')}</Text>
            </Pressable>

            <Text style={styles.title}>{t('dashboard.findRecyclers')}</Text>
            <Text style={styles.subtitle}>
                {t('dashboard.findRecyclersDesc')}
            </Text>

            <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>♻️</Text>
                <Text style={styles.infoText}>
                    {t('recyclers.subtitle')}
                </Text>
            </View>

            {error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={loadLots}>
                        <Text style={styles.retryText}>{t('common.retry')}</Text>
                    </Pressable>
                </View>
            ) : null}

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#16a34a" />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            ) : selectableLots.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyTitle}>{t('dashboard.noLots')}</Text>
                    <Text style={styles.emptyText}>
                        {t('dashboard.noLotsDesc')}
                    </Text>

                    <Pressable
                        style={styles.createButton}
                        onPress={() => router.push('/collector/create-lot')}
                    >
                        <Text style={styles.createButtonText}>+ {t('dashboard.createNewLot')}</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.list}>
                    {selectableLots.map((lot) => {
                        const category =
                            lot.category || lot.material_category || 'E-Waste';
                        const weight =
                            lot.approx_weight_kg ?? lot.weight_kg ?? '—';
                        const status =
                            lot.transaction_status || lot.payment_status || 'created';
                        const colors = statusColors(status);

                        return (
                            <Pressable
                                key={String(lot.lot_id)}
                                style={({ pressed }) => [
                                    styles.lotCard,
                                    pressed && styles.lotCardPressed,
                                ]}
                                onPress={() => openMatchedRecyclers(lot)}
                            >
                                <View style={styles.lotIcon}>
                                    <Text style={styles.lotIconText}>♻️</Text>
                                </View>

                                <View style={styles.lotBody}>
                                    <View style={styles.lotTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.lotId}>{String(lot.lot_id)}</Text>
                                            <Text style={styles.lotCategory}>{category}</Text>
                                        </View>

                                        <View
                                            style={[
                                                styles.statusBadge,
                                                { backgroundColor: colors.bg },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusText,
                                                    { color: colors.text },
                                                ]}
                                            >
                                                {String(status)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.metaRow}>
                                        <Text style={styles.metaText}>⚖️ {weight} kg</Text>
                                        {lot.created_at ? (
                                            <Text style={styles.metaText}>
                                                📅 {fmtDate(lot.created_at)}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <View style={styles.selectRow}>
                                        <Text style={styles.selectText}>
                                            {t('dashboard.findRecyclers')}
                                        </Text>
                                        <Text style={styles.chevron}>›</Text>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            <View style={{ height: 40 }} />
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
        marginBottom: 14,
    },
    title: {
        fontSize: 29,
        fontWeight: '900',
        color: '#111827',
    },
    subtitle: {
        marginTop: 6,
        color: '#64748b',
        fontSize: 13,
        lineHeight: 19,
    },
    infoCard: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 13,
        padding: 13,
    },
    infoIcon: {
        fontSize: 18,
    },
    infoText: {
        flex: 1,
        color: '#166534',
        fontSize: 11,
        lineHeight: 17,
    },
    errorCard: {
        marginTop: 15,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fca5a5',
        borderRadius: 11,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        flex: 1,
        color: '#b91c1c',
        fontSize: 11,
    },
    retryText: {
        color: '#15803d',
        fontSize: 11,
        fontWeight: '800',
    },
    loadingBox: {
        minHeight: 260,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6b7280',
        fontSize: 12,
    },
    emptyCard: {
        marginTop: 18,
        padding: 28,
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
    },
    emptyIcon: {
        fontSize: 38,
    },
    emptyTitle: {
        marginTop: 10,
        fontSize: 17,
        fontWeight: '800',
        color: '#111827',
    },
    emptyText: {
        marginTop: 6,
        color: '#6b7280',
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 18,
    },
    createButton: {
        marginTop: 18,
        backgroundColor: '#16a34a',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 10,
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    list: {
        marginTop: 18,
        gap: 11,
    },
    lotCard: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 15,
        padding: 14,
    },
    lotCardPressed: {
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
    },
    lotIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#dcfce7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    lotIconText: {
        fontSize: 20,
    },
    lotBody: {
        flex: 1,
    },
    lotTopRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    lotId: {
        fontSize: 10,
        color: '#94a3b8',
    },
    lotCategory: {
        marginTop: 2,
        fontSize: 15,
        fontWeight: '800',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 9,
    },
    metaText: {
        color: '#64748b',
        fontSize: 10,
    },
    selectRow: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: {
        color: '#15803d',
        fontSize: 11,
        fontWeight: '800',
    },
    chevron: {
        color: '#16a34a',
        fontSize: 22,
        lineHeight: 22,
    },
});
