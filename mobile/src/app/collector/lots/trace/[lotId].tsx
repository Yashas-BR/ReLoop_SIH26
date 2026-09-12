import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    DEMO_COLLECTOR_ID,
    getHandoversByLot,
    getLotEvents,
    getLotImages,
    getLotsByCollector,
} from '../../../../../api/client';
import { BrandedHeader } from '../../../../components/branding/BrandedHeader';
import { currentCollectorId } from '../../../../../services/auth';

type AnyRecord = Record<string, any>;

const unwrapArray = (response: any): AnyRecord[] => {
    const value = response?.data ?? response;
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.events)) return value.events;
    if (Array.isArray(value?.images)) return value.images;
    return [];
};

const formatDate = (value: any) => {
    if (!value) return '—';

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatMoney = (value: any) => {
    if (value == null || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);

    return `₹${n.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
    })}`;
};

const EVENT_META: Record<
    string,
    { title: string; icon: string; description: string }
> = {
    LOT_CREATED: {
        title: 'Lot Created',
        icon: '📦',
        description: 'The e-waste lot was registered by the collector.',
    },
    IMAGE_UPLOADED: {
        title: 'Collection Evidence Added',
        icon: '📷',
        description: 'A photo was attached as evidence for the lot.',
    },
    PRICE_ESTIMATED: {
        title: 'Price Estimated',
        icon: '₹',
        description: 'An estimated market value was recorded.',
    },
    RECYCLER_MATCHED: {
        title: 'Recycler Matched',
        icon: '♻️',
        description: 'The lot was matched with recycler candidates.',
    },
    QUOTE_REQUESTED: {
        title: 'Quote Requested',
        icon: '💬',
        description: 'A quote request was sent to a recycler.',
    },
    QUOTE_OFFERED: {
        title: 'Recycler Quote Received',
        icon: '🏷️',
        description: 'A recycler submitted a price offer.',
    },
    QUOTE_ACCEPTED: {
        title: 'Quote Accepted',
        icon: '✅',
        description: 'The collector accepted a recycler quote.',
    },
    QR_SCANNED: {
        title: 'QR Verified',
        icon: '▣',
        description: 'The lot QR was scanned during handover.',
    },
    FINAL_WEIGHT_RECORDED: {
        title: 'Final Weight Recorded',
        icon: '⚖️',
        description: 'The physical scale weight was recorded.',
    },
    HANDOVER_INITIATED: {
        title: 'Handover Initiated',
        icon: '🤝',
        description: 'A handover reference was generated.',
    },
    HANDOVER_CONFIRMED: {
        title: 'Handover Confirmed',
        icon: '✓',
        description: 'The recycler confirmed receipt of the material.',
    },
    PAYMENT_COMPLETED: {
        title: 'Payment Completed',
        icon: '💰',
        description: 'Payment for the lot was completed.',
    },
    LOT_CANCELLED: {
        title: 'Lot Cancelled',
        icon: '⊘',
        description: 'The lot lifecycle was cancelled.',
    },
};

function getEventType(event: AnyRecord) {
    return String(
        event.event_type ??
        event.type ??
        event.event_name ??
        event.name ??
        'EVENT'
    ).toUpperCase();
}

function getEventTime(event: AnyRecord) {
    return (
        event.event_timestamp ??
        event.created_at ??
        event.timestamp ??
        event.occurred_at ??
        event.updated_at
    );
}

function getEventDescription(event: AnyRecord, type: string) {
    return (
        event.description ??
        event.message ??
        event.details?.description ??
        EVENT_META[type]?.description ??
        type.replaceAll('_', ' ').toLowerCase()
    );
}

function EvidenceImage({ item, index }: { item: AnyRecord; index: number }) {
    const uri =
        item.image_url ??
        item.url ??
        item.secure_url ??
        item.image_ref;

    if (!uri) return null;

    return (
        <View style={styles.imageCard}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageMeta}>
                <Text style={styles.imageType}>
                    {String(item.image_type ?? 'EVIDENCE').replaceAll('_', ' ')}
                </Text>
                <Text style={styles.smallMuted}>
                    {formatDate(item.created_at ?? item.uploaded_at)}
                </Text>
            </View>
        </View>
    );
}

export default function LotTraceabilityScreen() {
    const params = useLocalSearchParams<{ lotId: string }>();
    const lotId = String(params.lotId ?? '');

    const [lot, setLot] = useState<AnyRecord | null>(null);
    const [events, setEvents] = useState<AnyRecord[]>([]);
    const [images, setImages] = useState<AnyRecord[]>([]);
    const [handovers, setHandovers] = useState<AnyRecord[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!lotId) {
            setError('No lot ID was provided.');
            return;
        }

        try {
            setError('');

            const collectorId =
                (await currentCollectorId()) ?? DEMO_COLLECTOR_ID;

            const [lotsResult, eventsResult, imagesResult, handoverResult] =
                await Promise.all([
                    getLotsByCollector(collectorId),
                    getLotEvents(lotId),
                    getLotImages(lotId).catch(() => ({ data: [] })),
                    getHandoversByLot(lotId).catch(() => ({ data: [] })),
                ]);

            const lots = unwrapArray(lotsResult);
            const selectedLot =
                lots.find((item) => String(item.lot_id) === lotId) ?? null;

            setLot(selectedLot);

            const eventPayload = eventsResult?.data ?? eventsResult;

            const loadedEvents = Array.isArray(eventPayload?.events)
                ? eventPayload.events
                : Array.isArray(eventPayload)
                    ? eventPayload
                    : [];

            const payloadLot = eventPayload?.lot ?? null;

            if (!selectedLot && payloadLot) {
                setLot(payloadLot);
            }

            setEvents(
                [...loadedEvents].sort((a, b) => {
                    const ta = new Date(getEventTime(a) ?? 0).getTime();
                    const tb = new Date(getEventTime(b) ?? 0).getTime();
                    return ta - tb;
                })
            );

            setImages(unwrapArray(imagesResult));
            setHandovers(unwrapArray(handoverResult));
        } catch (err: any) {
            console.error('Traceability load error:', err);
            setError(
                err?.message ||
                'Unable to load the traceability history for this lot.'
            );
        }
    }, [lotId]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
            setLoading(false);
        })();
    }, [load]);

    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const handover = handovers[0] ?? null;

    const completedTypes = useMemo(
        () => new Set(events.map(getEventType)),
        [events]
    );

    const status = String(
        lot?.transaction_status ??
        handover?.status ??
        'created'
    ).replaceAll('_', ' ');

    const lifecycle = [
        {
            title: 'Lot Created',
            done:
                completedTypes.has('LOT_CREATED') ||
                Boolean(lot?.created_at),
        },
        {
            title: 'Valuation Recorded',
            done:
                completedTypes.has('PRICE_ESTIMATED') ||
                lot?.estimated_value != null,
        },
        {
            title: 'Recycler Matched',
            done:
                completedTypes.has('RECYCLER_MATCHED') ||
                ['matched', 'accepted', 'handed_over', 'confirmed'].includes(
                    String(lot?.transaction_status ?? '').toLowerCase()
                ),
        },
        {
            title: 'Quote Accepted',
            done:
                completedTypes.has('QUOTE_ACCEPTED') ||
                ['accepted', 'handed_over', 'confirmed'].includes(
                    String(lot?.transaction_status ?? '').toLowerCase()
                ),
        },
        {
            title: 'Handover Initiated',
            done:
                completedTypes.has('HANDOVER_INITIATED') ||
                Boolean(
                    handover?.handover_reference_number ??
                    handover?.handover_reference
                ),
        },
        {
            title: 'Recycler Confirmed',
            done:
                completedTypes.has('HANDOVER_CONFIRMED') ||
                String(handover?.status ?? '').toLowerCase() === 'confirmed',
        },
        {
            title: 'Payment Completed',
            done:
                completedTypes.has('PAYMENT_COMPLETED') ||
                String(lot?.payment_status ?? '').toLowerCase() === 'paid',
        },
    ];

    const completedCount = lifecycle.filter((step) => step.done).length;
    const progress = Math.round(
        (completedCount / lifecycle.length) * 100
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={styles.loadingText}>
                    Loading traceability...
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={refresh}
                />
            }
        >
            <BrandedHeader
                showBack
                title="Lot Journey"
                subtitle={`Lot: ${lotId}`}
                rightElement={
                    <View style={styles.headerBadges}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>
                                {status}
                            </Text>
                        </View>
                        <View style={styles.progressBadge}>
                            <Text style={styles.progressText}>
                                {progress}% complete
                            </Text>
                        </View>
                    </View>
                }
            />

            {!!error && (
                <View style={styles.warning}>
                    <Text style={styles.warningTitle}>
                        ⚠️ Traceability data incomplete
                    </Text>
                    <Text style={styles.warningText}>
                        {error}
                    </Text>
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    Lifecycle Progress
                </Text>

                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progress}%` },
                        ]}
                    />
                </View>

                <Text style={styles.progressCaption}>
                    {completedCount} of {lifecycle.length} lifecycle stages completed
                </Text>

                <View style={styles.lifecycle}>
                    {lifecycle.map((step, index) => (
                        <View
                            style={styles.lifecycleRow}
                            key={step.title}
                        >
                            <View style={styles.lifecycleLineArea}>
                                <View
                                    style={[
                                        styles.lifecycleDot,
                                        step.done && styles.lifecycleDotDone,
                                    ]}
                                >
                                    <Text style={styles.lifecycleDotText}>
                                        {step.done ? '✓' : index + 1}
                                    </Text>
                                </View>

                                {index < lifecycle.length - 1 && (
                                    <View
                                        style={[
                                            styles.lifecycleLine,
                                            step.done && styles.lifecycleLineDone,
                                        ]}
                                    />
                                )}
                            </View>

                            <View style={styles.lifecycleBody}>
                                <Text
                                    style={[
                                        styles.lifecycleTitle,
                                        step.done && styles.lifecycleTitleDone,
                                    ]}
                                >
                                    {step.title}
                                </Text>
                                <Text style={styles.smallMuted}>
                                    {step.done ? 'Completed' : 'Pending'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    Lot Snapshot
                </Text>

                <InfoRow
                    label="Category"
                    value={lot?.category ?? '—'}
                />
                <InfoRow
                    label="Sub-category"
                    value={lot?.sub_category ?? '—'}
                />
                <InfoRow
                    label="Estimated weight"
                    value={
                        lot?.approx_weight_kg != null
                            ? `${lot.approx_weight_kg} kg`
                            : '—'
                    }
                />
                <InfoRow
                    label="Estimated value"
                    value={formatMoney(lot?.estimated_value)}
                />
                <InfoRow
                    label="Transaction status"
                    value={lot?.transaction_status ?? '—'}
                />
                <InfoRow
                    label="Payment status"
                    value={lot?.payment_status ?? '—'}
                />
                <InfoRow
                    label="Created"
                    value={formatDate(lot?.created_at)}
                />
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    Event History
                </Text>
                <Text style={styles.cardSubtitle}>
                    Backend-recorded events for this lot, shown in chronological order.
                </Text>

                {events.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>🕘</Text>
                        <Text style={styles.emptyTitle}>
                            No recorded events yet
                        </Text>
                        <Text style={styles.emptyText}>
                            Events will appear here as the lot progresses through valuation,
                            matching, handover and payment.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.eventList}>
                        {events.map((event, index) => {
                            const type = getEventType(event);
                            const meta = EVENT_META[type] ?? {
                                title: type
                                    .replaceAll('_', ' ')
                                    .toLowerCase()
                                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                                icon: '•',
                                description: 'Lot lifecycle event recorded.',
                            };

                            return (
                                <View
                                    style={styles.eventRow}
                                    key={String(
                                        event.id ??
                                        event.event_id ??
                                        `${type}-${index}`
                                    )}
                                >
                                    <View style={styles.eventRail}>
                                        <View style={styles.eventIcon}>
                                            <Text style={styles.eventIconText}>
                                                {meta.icon}
                                            </Text>
                                        </View>
                                        {index < events.length - 1 && (
                                            <View style={styles.eventLine} />
                                        )}
                                    </View>

                                    <View style={styles.eventBody}>
                                        <Text style={styles.eventTitle}>
                                            {meta.title}
                                        </Text>
                                        <Text style={styles.eventTime}>
                                            {formatDate(getEventTime(event))}
                                        </Text>
                                        <Text style={styles.eventDescription}>
                                            {getEventDescription(event, type)}
                                        </Text>

                                        {event.recycler_name && (
                                            <EventPill
                                                text={`Recycler: ${event.recycler_name}`}
                                            />
                                        )}

                                        {event.offered_price != null && (
                                            <EventPill
                                                text={`Offer: ${formatMoney(
                                                    event.offered_price
                                                )}/kg`}
                                            />
                                        )}

                                        {event.weight_kg != null && (
                                            <EventPill
                                                text={`Weight: ${event.weight_kg} kg`}
                                            />
                                        )}

                                        {(event.handover_reference_number ||
                                            event.handover_reference ||
                                            event.reference) && (
                                                <EventPill
                                                    text={`Ref: ${event.handover_reference_number ??
                                                        event.handover_reference ??
                                                        event.reference
                                                        }`}
                                                />
                                            )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            {(handover ||
                completedTypes.has('HANDOVER_INITIATED')) && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            Handover Record
                        </Text>

                        <InfoRow
                            label="Reference"
                            value={
                                handover?.handover_reference_number ??
                                handover?.handover_reference ??
                                '—'
                            }
                        />

                        <InfoRow
                            label="Status"
                            value={handover?.status ?? '—'}
                        />

                        <InfoRow
                            label="Recycler"
                            value={
                                handover?.recycler_name ??
                                lot?.recycler_name ??
                                '—'
                            }
                        />

                        <InfoRow
                            label="Quoted rate"
                            value={
                                handover?.quoted_price != null
                                    ? `${formatMoney(
                                        handover.quoted_price
                                    )}/kg`
                                    : '—'
                            }
                        />

                        <InfoRow
                            label="Final weight"
                            value={
                                handover?.weight_kg != null
                                    ? `${handover.weight_kg} kg`
                                    : '—'
                            }
                        />

                        <InfoRow
                            label="Final value"
                            value={formatMoney(
                                handover?.final_price
                            )}
                        />

                        <InfoRow
                            label="QR scan"
                            value={
                                handover?.scan_verified
                                    ? 'Verified'
                                    : 'Not recorded'
                            }
                        />

                        <InfoRow
                            label="Confirmed"
                            value={formatDate(
                                handover?.confirmation_timestamp ??
                                handover?.confirmed_at
                            )}
                        />
                    </View>
                )}

            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    Evidence Chain
                </Text>
                <Text style={styles.cardSubtitle}>
                    Collection and recycler-confirmation images linked to this lot.
                </Text>

                {images.length === 0 ? (
                    <Text style={styles.emptyText}>
                        No evidence photos are currently recorded for this lot.
                    </Text>
                ) : (
                    images.map((item, index) => (
                        <EvidenceImage
                            item={item}
                            index={index}
                            key={String(item.id ?? index)}
                        />
                    ))
                )}
            </View>

            <View style={styles.integrityCard}>
                <Text style={styles.integrityIcon}>
                    ✓
                </Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.integrityTitle}>
                        Traceability Record
                    </Text>
                    <Text style={styles.integrityText}>
                        This screen is generated from the lot's backend lifecycle events,
                        handover record and evidence images.
                    </Text>
                </View>
            </View>

            <Pressable
                style={styles.primaryButton}
                onPress={() => router.back()}
            >
                <Text style={styles.primaryButtonText}>
                    Back to Lot Details
                </Text>
            </Pressable>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: any;
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
                {label}
            </Text>
            <Text style={styles.infoValue}>
                {value ?? '—'}
            </Text>
        </View>
    );
}

function EventPill({
    text,
}: {
    text: string;
}) {
    return (
        <View style={styles.pill}>
            <Text style={styles.pillText}>
                {text}
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
        paddingHorizontal: 18,
        paddingTop: 24,
    },

    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
    },

    loadingText: {
        marginTop: 10,
        color: '#64748b',
        fontSize: 13,
    },

    back: {
        color: '#15803d',
        fontWeight: '800',
        marginBottom: 15,
    },

    header: {
        backgroundColor: '#14532d',
        borderRadius: 20,
        padding: 20,
        marginBottom: 14,
    },

    eyebrow: {
        color: '#bbf7d0',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.2,
    },

    title: {
        color: '#ffffff',
        fontSize: 29,
        fontWeight: '900',
        marginTop: 4,
    },

    lotId: {
        color: '#dcfce7',
        marginTop: 5,
        fontSize: 11,
    },

    headerBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 15,
    },

    statusBadge: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    statusText: {
        color: '#14532d',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'capitalize',
    },

    progressBadge: {
        backgroundColor: '#22c55e',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    progressText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '900',
    },

    warning: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        borderWidth: 1,
        borderRadius: 13,
        padding: 13,
        marginBottom: 13,
    },

    warningTitle: {
        color: '#92400e',
        fontWeight: '900',
        fontSize: 12,
    },

    warningText: {
        color: '#b45309',
        fontSize: 11,
        marginTop: 3,
    },

    card: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 17,
        padding: 16,
        marginTop: 13,
    },

    cardTitle: {
        color: '#111827',
        fontWeight: '900',
        fontSize: 17,
    },

    cardSubtitle: {
        color: '#64748b',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 4,
        marginBottom: 12,
    },

    progressTrack: {
        height: 9,
        backgroundColor: '#e5e7eb',
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 14,
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 20,
    },

    progressCaption: {
        marginTop: 7,
        color: '#64748b',
        fontSize: 10,
    },

    lifecycle: {
        marginTop: 18,
    },

    lifecycleRow: {
        flexDirection: 'row',
        minHeight: 61,
    },

    lifecycleLineArea: {
        width: 32,
        alignItems: 'center',
    },

    lifecycleDot: {
        width: 25,
        height: 25,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },

    lifecycleDotDone: {
        backgroundColor: '#16a34a',
        borderColor: '#16a34a',
    },

    lifecycleDotText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '900',
    },

    lifecycleLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#e2e8f0',
    },

    lifecycleLineDone: {
        backgroundColor: '#86efac',
    },

    lifecycleBody: {
        paddingLeft: 10,
        paddingBottom: 13,
        flex: 1,
    },

    lifecycleTitle: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '800',
    },

    lifecycleTitleDone: {
        color: '#166534',
    },

    smallMuted: {
        color: '#94a3b8',
        fontSize: 9,
        marginTop: 2,
    },

    infoRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },

    infoLabel: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
    },

    infoValue: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 3,
        textTransform: 'capitalize',
    },

    eventList: {
        marginTop: 4,
    },

    eventRow: {
        flexDirection: 'row',
        minHeight: 103,
    },

    eventRail: {
        width: 46,
        alignItems: 'center',
    },

    eventIcon: {
        width: 35,
        height: 35,
        borderRadius: 18,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#86efac',
    },

    eventIconText: {
        fontSize: 15,
    },

    eventLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#bbf7d0',
    },

    eventBody: {
        flex: 1,
        paddingLeft: 8,
        paddingBottom: 17,
    },

    eventTitle: {
        color: '#111827',
        fontWeight: '900',
        fontSize: 13,
    },

    eventTime: {
        color: '#64748b',
        fontSize: 9,
        marginTop: 3,
    },

    eventDescription: {
        color: '#475569',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
    },

    pill: {
        alignSelf: 'flex-start',
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginTop: 6,
    },

    pillText: {
        color: '#475569',
        fontSize: 9,
        fontWeight: '700',
    },

    empty: {
        alignItems: 'center',
        paddingVertical: 23,
    },

    emptyIcon: {
        fontSize: 28,
    },

    emptyTitle: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '800',
        marginTop: 7,
    },

    emptyText: {
        color: '#64748b',
        fontSize: 11,
        lineHeight: 16,
        marginTop: 5,
        textAlign: 'center',
    },

    imageCard: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
    },

    image: {
        width: '100%',
        height: 190,
        backgroundColor: '#e5e7eb',
    },

    imageMeta: {
        padding: 10,
    },

    imageType: {
        color: '#334155',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'capitalize',
    },

    integrityCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        marginTop: 13,
    },

    integrityIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#16a34a',
        color: '#ffffff',
        textAlign: 'center',
        textAlignVertical: 'center',
        fontWeight: '900',
    },

    integrityTitle: {
        color: '#166534',
        fontWeight: '900',
        fontSize: 12,
    },

    integrityText: {
        color: '#15803d',
        fontSize: 10,
        lineHeight: 15,
        marginTop: 3,
    },

    primaryButton: {
        backgroundColor: '#16a34a',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 14,
    },

    primaryButtonText: {
        color: '#ffffff',
        fontWeight: '900',
        fontSize: 12,
    },
});
