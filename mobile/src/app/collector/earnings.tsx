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
    DEMO_COLLECTOR_ID,
    getEarningsSummary,
    getPaymentHistory,
} from '../../../api/client';
import { BrandedHeader } from '../../components/branding/BrandedHeader';
import { currentCollectorId } from '../../../services/auth';

type Filter = 'all' | 'paid' | 'pending';

type Summary = {
    total_earned?: number | string;
    total_paid?: number | string;
    total_pending?: number | string;
    paid_transactions?: number;
    pending_transactions?: number;
    total_transactions?: number;
};

type LedgerRow = {
    lot_id: string;
    material_category?: string;
    quantity_weight_kg?: number | string;
    recycler_name?: string;
    final_price?: number | string;
    payment_status?: string;
    payment_method?: string;
    txn_datetime?: string;
};

function fmt(n?: number | string | null) {
    if (n == null) return '—';
    return `₹${Number(n).toLocaleString('en-IN', {
        maximumFractionDigits: 0,
    })}`;
}

function fmtDate(d?: string) {
    if (!d) return '—';

    return new Date(d).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
    });
}

export default function CollectorEarnings() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const load = useCallback(async () => {
        setError('');

        try {
            const sessionCollectorId = await currentCollectorId();
            const collectorId =
                sessionCollectorId ?? Number(DEMO_COLLECTOR_ID);

            const [sumRes, histRes] = await Promise.all([
                getEarningsSummary(collectorId),
                getPaymentHistory(collectorId),
            ]);

            setSummary(sumRes?.data ?? null);
            setRows(
                Array.isArray(histRes?.data)
                    ? histRes.data
                    : []
            );
        } catch (err: any) {
            console.log('Earnings load error:', err);
            setError(
                err?.message ||
                'Could not load your earnings. Please try again.'
            );
        }
    }, []);

    useEffect(() => {
        async function initialLoad() {
            setLoading(true);
            try {
                await load();
            } finally {
                setLoading(false);
            }
        }

        initialLoad();
    }, [load]);

    async function refresh() {
        setRefreshing(true);
        try {
            await load();
        } finally {
            setRefreshing(false);
        }
    }

    const filtered = useMemo(() => {
        if (filter === 'all') return rows;

        return rows.filter(
            (row) => row.payment_status === filter
        );
    }, [rows, filter]);

    const paidCount = rows.filter(
        (row) => row.payment_status === 'paid'
    ).length;

    const pendingCount = rows.filter(
        (row) => row.payment_status === 'pending'
    ).length;

    const filteredTotal = filtered.reduce(
        (acc, row) =>
            acc + (Number(row.final_price) || 0),
        0
    );

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={refresh}
                />
            }
            showsVerticalScrollIndicator={false}
        >
            <BrandedHeader
                showBack
                title="Earnings Ledger"
                subtitle="Track your payments and completed transactions."
            />

            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>

                    <Pressable onPress={load}>
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            ) : null}

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator
                        size="large"
                        color="#16a34a"
                    />
                    <Text style={styles.loadingText}>
                        Loading earnings...
                    </Text>
                </View>
            ) : (
                <>
                    <View style={styles.summaryGrid}>
                        <SummaryCard
                            icon="₹"
                            label="Total Earned"
                            value={fmt(summary?.total_earned)}
                            sub="All time"
                        />

                        <SummaryCard
                            icon="✓"
                            label="Paid Out"
                            value={fmt(summary?.total_paid)}
                            sub={`${summary?.paid_transactions ?? 0} transactions`}
                            tone="green"
                        />

                        <SummaryCard
                            icon="⏳"
                            label="Pending"
                            value={fmt(summary?.total_pending)}
                            sub={`${summary?.pending_transactions ?? 0} pending payments`}
                            tone="amber"
                        />

                        <SummaryCard
                            icon="▤"
                            label="Total Transactions"
                            value={String(
                                summary?.total_transactions ?? rows.length
                            )}
                            sub="Completed payments"
                            tone="purple"
                        />
                    </View>

                    <View style={styles.ledgerHeader}>
                        <View>
                            <Text style={styles.ledgerTitle}>
                                Earnings Ledger
                            </Text>
                            <Text style={styles.ledgerSubtitle}>
                                Completed transactions with a final price
                            </Text>
                        </View>
                    </View>

                    <View style={styles.filters}>
                        <FilterButton
                            label="All"
                            active={filter === 'all'}
                            onPress={() => setFilter('all')}
                        />

                        <FilterButton
                            label={`Paid ${paidCount}`}
                            active={filter === 'paid'}
                            onPress={() => setFilter('paid')}
                        />

                        <FilterButton
                            label={`Pending ${pendingCount}`}
                            active={filter === 'pending'}
                            onPress={() => setFilter('pending')}
                        />
                    </View>

                    {rows.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyIcon}>₹</Text>
                            <Text style={styles.emptyTitle}>
                                No transactions yet
                            </Text>
                            <Text style={styles.emptyText}>
                                Completed lots with a final price will appear
                                here. In-flight lots remain on your dashboard.
                            </Text>

                            <Pressable
                                style={styles.createButton}
                                onPress={() =>
                                    router.push('/collector/create-lot')
                                }
                            >
                                <Text style={styles.createButtonText}>
                                    Create New Lot
                                </Text>
                            </Pressable>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>
                                No {filter} transactions
                            </Text>

                            <Pressable
                                style={styles.outlineButton}
                                onPress={() => setFilter('all')}
                            >
                                <Text style={styles.outlineButtonText}>
                                    Show All
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {filtered.map((row) => (
                                <View
                                    key={row.lot_id}
                                    style={styles.ledgerCard}
                                >
                                    <View style={styles.ledgerCardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.lotId}>
                                                {row.lot_id}
                                            </Text>

                                            <Text style={styles.material}>
                                                {row.material_category || 'Material'}
                                            </Text>
                                        </View>

                                        <StatusBadge
                                            status={
                                                row.payment_status || 'pending'
                                            }
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    <LedgerLine
                                        label="Weight"
                                        value={`${row.quantity_weight_kg ?? '—'} kg`}
                                    />

                                    <LedgerLine
                                        label="Recycler"
                                        value={row.recycler_name || '—'}
                                    />

                                    <LedgerLine
                                        label="Date"
                                        value={fmtDate(row.txn_datetime)}
                                    />

                                    <LedgerLine
                                        label="Amount"
                                        value={fmt(row.final_price)}
                                        strong
                                    />

                                    {row.payment_method &&
                                        row.payment_status === 'paid' ? (
                                        <LedgerLine
                                            label="Payment Method"
                                            value={String(
                                                row.payment_method
                                            ).toUpperCase()}
                                        />
                                    ) : null}

                                    <Pressable
                                        style={styles.viewButton}
                                        onPress={() =>
                                            router.push({
                                                pathname:
                                                    '/collector/lots/[lotId]' as any,
                                                params: {
                                                    lotId: String(row.lot_id),
                                                },
                                            })
                                        }
                                    >
                                        <Text style={styles.viewButtonText}>
                                            View Lot
                                        </Text>
                                    </Pressable>
                                </View>
                            ))}

                            <View style={styles.footer}>
                                <Text style={styles.footerCount}>
                                    {filtered.length} / {rows.length}{' '}
                                    transactions
                                </Text>

                                <View style={styles.footerTotalWrap}>
                                    <Text style={styles.footerLabel}>
                                        Filtered Total
                                    </Text>
                                    <Text style={styles.footerTotal}>
                                        {fmt(filteredTotal)}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    sub,
    tone = 'default',
}: {
    icon: string;
    label: string;
    value: string;
    sub: string;
    tone?: 'default' | 'green' | 'amber' | 'purple';
}) {
    const toneStyle =
        tone === 'green'
            ? styles.summaryGreen
            : tone === 'amber'
                ? styles.summaryAmber
                : tone === 'purple'
                    ? styles.summaryPurple
                    : styles.summaryDefault;

    return (
        <View style={[styles.summaryCard, toneStyle]}>
            <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>
                    {icon}
                </Text>
            </View>

            <Text style={styles.summaryLabel}>
                {label}
            </Text>

            <Text style={styles.summaryValue}>
                {value}
            </Text>

            <Text style={styles.summarySub}>
                {sub}
            </Text>
        </View>
    );
}

function FilterButton({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={[
                styles.filterButton,
                active && styles.filterButtonActive,
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const paid = status === 'paid';

    return (
        <View
            style={[
                styles.statusBadge,
                paid
                    ? styles.statusPaid
                    : styles.statusPending,
            ]}
        >
            <Text
                style={[
                    styles.statusText,
                    paid
                        ? styles.statusPaidText
                        : styles.statusPendingText,
                ]}
            >
                {paid ? '✓ Paid' : '⏳ Pending'}
            </Text>
        </View>
    );
}

function LedgerLine({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <View style={styles.ledgerLine}>
            <Text style={styles.ledgerLabel}>
                {label}
            </Text>

            <Text
                style={[
                    styles.ledgerValue,
                    strong && styles.ledgerValueStrong,
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    container: {
        padding: 18,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 18,
    },

    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#111827',
    },

    subtitle: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 5,
        lineHeight: 17,
    },

    backButton: {
        paddingVertical: 7,
        paddingHorizontal: 9,
    },

    backText: {
        color: '#16a34a',
        fontSize: 12,
        fontWeight: '800',
    },

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fcd34d',
        borderRadius: 11,
        padding: 12,
        marginBottom: 15,
    },

    errorText: {
        flex: 1,
        color: '#92400e',
        fontSize: 11,
    },

    retryText: {
        color: '#166534',
        fontWeight: '800',
        fontSize: 11,
    },

    loadingBox: {
        paddingVertical: 80,
        alignItems: 'center',
    },

    loadingText: {
        color: '#6b7280',
        marginTop: 10,
        fontSize: 11,
    },

    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },

    summaryCard: {
        width: '48%',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
    },

    summaryDefault: {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
    },

    summaryGreen: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },

    summaryAmber: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
    },

    summaryPurple: {
        backgroundColor: '#faf5ff',
        borderColor: '#e9d5ff',
    },

    summaryIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },

    summaryIconText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#16a34a',
    },

    summaryLabel: {
        color: '#64748b',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 10,
    },

    summaryValue: {
        color: '#111827',
        fontSize: 20,
        fontWeight: '900',
        marginTop: 4,
    },

    summarySub: {
        color: '#94a3b8',
        fontSize: 8,
        marginTop: 4,
    },

    ledgerHeader: {
        marginTop: 26,
        marginBottom: 11,
    },

    ledgerTitle: {
        color: '#111827',
        fontSize: 20,
        fontWeight: '900',
    },

    ledgerSubtitle: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 3,
    },

    filters: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },

    filterButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#ffffff',
    },

    filterButtonActive: {
        backgroundColor: '#dcfce7',
        borderColor: '#16a34a',
    },

    filterText: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
    },

    filterTextActive: {
        color: '#15803d',
        fontWeight: '900',
    },

    emptyCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 15,
        padding: 28,
        alignItems: 'center',
    },

    emptyIcon: {
        fontSize: 30,
        fontWeight: '900',
        color: '#16a34a',
    },

    emptyTitle: {
        color: '#111827',
        fontSize: 15,
        fontWeight: '800',
        marginTop: 8,
    },

    emptyText: {
        color: '#64748b',
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 15,
        marginTop: 7,
    },

    createButton: {
        marginTop: 15,
        backgroundColor: '#16a34a',
        borderRadius: 9,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },

    createButtonText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
    },

    outlineButton: {
        marginTop: 13,
        borderWidth: 1,
        borderColor: '#16a34a',
        borderRadius: 9,
        paddingHorizontal: 16,
        paddingVertical: 9,
    },

    outlineButtonText: {
        color: '#15803d',
        fontSize: 10,
        fontWeight: '800',
    },

    ledgerCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 14,
        padding: 15,
        marginBottom: 11,
    },

    ledgerCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },

    lotId: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '900',
    },

    material: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 3,
    },

    statusBadge: {
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },

    statusPaid: {
        backgroundColor: '#dcfce7',
    },

    statusPending: {
        backgroundColor: '#fef3c7',
    },

    statusText: {
        fontSize: 8,
        fontWeight: '800',
    },

    statusPaidText: {
        color: '#15803d',
    },

    statusPendingText: {
        color: '#92400e',
    },

    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },

    ledgerLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginBottom: 9,
    },

    ledgerLabel: {
        color: '#94a3b8',
        fontSize: 9,
    },

    ledgerValue: {
        flex: 1,
        color: '#374151',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'right',
    },

    ledgerValueStrong: {
        color: '#16a34a',
        fontSize: 14,
        fontWeight: '900',
    },

    viewButton: {
        marginTop: 7,
        borderWidth: 1,
        borderColor: '#16a34a',
        borderRadius: 9,
        minHeight: 39,
        alignItems: 'center',
        justifyContent: 'center',
    },

    viewButtonText: {
        color: '#15803d',
        fontSize: 10,
        fontWeight: '800',
    },

    footer: {
        marginTop: 5,
        padding: 15,
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },

    footerCount: {
        color: '#64748b',
        fontSize: 9,
    },

    footerTotalWrap: {
        alignItems: 'flex-end',
    },

    footerLabel: {
        color: '#64748b',
        fontSize: 8,
    },

    footerTotal: {
        color: '#15803d',
        fontSize: 16,
        fontWeight: '900',
        marginTop: 2,
    },
});
