import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Linking, Modal, Pressable,
    RefreshControl, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';

import {
    DEMO_COLLECTOR_ID, acceptOffer, cancelLot, deleteLot,
    getHandoversByLot, getLotEvents, getLotImages, getLotsByCollector,
    getOffersByLot, rejectOffer
} from '../../../../api/client';
import { currentCollectorId } from '../../../../services/auth';
import { BrandedHeader } from '../../../components/branding/BrandedHeader';

const money = (v: any) => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const date = (v: any) => !v ? '—' : new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const arr = (r: any) => Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];

function Badge({ value }: { value?: string }) {
    const s = String(value || 'pending').toLowerCase();
    const good = ['paid', 'confirmed', 'accepted', 'completed'].includes(s);
    const bad = ['cancelled', 'rejected'].includes(s);
    return <View style={[styles.badge, good && styles.badgeGood, bad && styles.badgeBad]}>
        <Text style={[styles.badgeText, good && styles.goodText, bad && styles.badText]}>{s.replaceAll('_', ' ')}</Text>
    </View>;
}

function Card({ title, children }: any) {
    return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;
}

function Row({ label, value }: any) {
    return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value ?? '—'}</Text></View>;
}

export default function CollectorLotDetail() {
    const p = useLocalSearchParams<{ lotId: string }>();
    const lotId = String(p.lotId || '');
    const [lot, setLot] = useState<any>(null);
    const [handovers, setHandovers] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [events, setEvents] = useState<Set<string>>(new Set());
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState<any>(null);
    const [error, setError] = useState('');
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            const cid = (await currentCollectorId()) ?? DEMO_COLLECTOR_ID;
            const [lr, hr, or, er, ir] = await Promise.all([
                getLotsByCollector(cid),
                getHandoversByLot(lotId),
                getOffersByLot(lotId),
                getLotEvents(lotId).catch(() => null),
                getLotImages(lotId).catch(() => ({ data: [] })),
            ]);
            const lots = arr(lr);
            setLot(lots.find((x: any) => String(x.lot_id) === lotId) || null);
            setHandovers(arr(hr)); setOffers(arr(or)); setImages(arr(ir));
            const ed = er?.data ?? er;
            const fired = Array.isArray(ed?.events) ? ed.events : [];
            setEvents(new Set(fired.map((x: any) => x.event_type)));
        } catch (e: any) { setError(e?.message || 'Could not load lot details.'); }
    }, [lotId]);

    useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false) })() }, [load]);
    const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) };

    const handover = handovers[0] || null;
    const accepted = offers.find((x: any) => x.offer_status === 'accepted') || null;
    const openOffers = offers.filter((x: any) => x.offer_status === 'offered');
    const collectionImages = images.filter((x: any) => x.image_type === 'COLLECTION');
    const confirmationImages = images.filter((x: any) => x.image_type === 'RECYCLER_CONFIRMATION');

    const approx = Number(lot?.approx_weight_kg || 0);
    const rawRate = accepted?.offered_price ?? handover?.quoted_price ?? null;
    const rate = rawRate != null ? Number(rawRate) : null;
    const acceptedEstimate = rate != null && approx > 0 ? Math.round(rate * approx) : null;
    const scaleWeight = handover?.weight_kg != null ? Number(handover.weight_kg) : null;
    const finalValue = handover?.final_price != null ? Number(handover.final_price) :
        scaleWeight != null && rate != null ? Math.round(scaleWeight * rate * 100) / 100 : null;

    const checklist = useMemo(() => [
        ['Lot collected', events.has('LOT_CREATED') || !!lot?.created_at],
        ['Collection photo uploaded', events.has('IMAGE_UPLOADED') || !!lot?.image_ref],
        ['Price estimated', events.has('PRICE_ESTIMATED') || lot?.estimated_value != null],
        ['Recycler matched', events.has('RECYCLER_MATCHED') || ['matched', 'accepted', 'handed_over', 'confirmed'].includes(lot?.transaction_status)],
        ['Quote accepted', events.has('QUOTE_ACCEPTED') || !!accepted],
        ['QR scanned', events.has('QR_SCANNED') || handover?.scan_verified === true],
        ['Final weight recorded', events.has('FINAL_WEIGHT_RECORDED') || handover?.weight_kg != null],
        ['Handover recorded', events.has('HANDOVER_CONFIRMED') || !!(handover?.handover_reference_number || handover?.handover_reference)],
        ['Recycler confirmed', events.has('HANDOVER_CONFIRMED') || handover?.status === 'confirmed'],
        ['Payment completed', events.has('PAYMENT_COMPLETED') || lot?.payment_status === 'paid'],
    ], [events, lot, accepted, handover]);
    const done = checklist.filter(x => x[1]).length;

    async function offerAction(id: any, decision: 'accept' | 'reject') {
        try { setBusy(id); decision === 'accept' ? await acceptOffer(id) : await rejectOffer(id); await load(); }
        catch (e: any) { Alert.alert('Quote action failed', e?.message || 'Please try again.'); }
        finally { setBusy(null); }
    }

    async function doDelete() {
        try {
            setBusy('delete'); const cid = (await currentCollectorId()) ?? DEMO_COLLECTOR_ID;
            await deleteLot(lotId, { collector_id: cid }); router.replace('/collector');
        } catch (e: any) { Alert.alert('Delete failed', e?.message || 'Please try again.'); }
        finally { setBusy(null) }
    }

    async function doCancel() {
        if (!cancelReason.trim()) { Alert.alert('Reason required', 'Enter a cancellation reason.'); return }
        try {
            setBusy('cancel'); const cid = (await currentCollectorId()) ?? DEMO_COLLECTOR_ID;
            await cancelLot(lotId, { collector_id: cid, reason: cancelReason.trim() });
            setCancelOpen(false); setCancelReason(''); await load();
        } catch (e: any) { Alert.alert('Cancel failed', e?.message || 'Please try again.') }
        finally { setBusy(null) }
    }

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.muted}>Loading lot...</Text></View>;

    if (!lot) return <View style={styles.center}><Text style={styles.big}>Lot not found</Text><Text style={styles.muted}>{error || lotId}</Text><Pressable style={styles.primary} onPress={() => router.push('/collector/create-lot')}><Text style={styles.primaryText}>Create Lot</Text></Pressable></View>;

    const locked = handovers.length > 0 || ['handed_over', 'confirmed'].includes(lot.transaction_status) || lot.payment_status === 'paid';
    const canCancel = !locked && (offers.length > 0 || ['matched', 'accepted'].includes(lot.transaction_status));
    const canDelete = !locked && !canCancel && !lot.is_cancelled && lot.transaction_status !== 'cancelled';

    const currentStep = handover?.status === 'confirmed' ? 4 :
        handover?.handover_reference_number || handover?.handover_reference ? 3 :
            ['matched', 'accepted'].includes(lot.transaction_status) ? 2 :
                lot.estimated_value != null ? 1 : 0;
    const timeline = [
        ['Lot Created', date(lot.created_at)],
        ['Valuation', lot.estimated_value != null ? `Estimated ${money(lot.estimated_value)}` : 'No data'],
        ['Recycler Matched', handover?.recycler_name || lot.recycler_name || 'Pending'],
        ['Handover Initiated', handover?.handover_reference_number || handover?.handover_reference || 'Pending'],
        ['Handover Confirmed', handover?.confirmation_timestamp ? date(handover.confirmation_timestamp) : 'Pending'],
    ];

    return <ScrollView style={styles.screen} contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <BrandedHeader showBack title="Lot Details" subtitle={lotId} rightElement={<Badge value={lot.transaction_status} />} />


        {locked ? <Text style={styles.lock}>🔒 Lot locked — handover/payment activity exists.</Text> :
            canCancel ? <Pressable style={styles.dangerOutline} onPress={() => setCancelOpen(true)}><Text style={styles.dangerText}>⚠️ Cancel Lot</Text></Pressable> :
                canDelete ? <Pressable style={styles.dangerOutline} onPress={() => Alert.alert('Delete lot?', 'This draft will be permanently deleted.', [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }])}><Text style={styles.dangerText}>🗑️ Delete Lot</Text></Pressable> : null}

        {(lot.is_cancelled || lot.transaction_status === 'cancelled') && <View style={styles.cancelled}><Text style={styles.cancelledTitle}>⊘ Lot Cancelled</Text><Text style={styles.cancelledText}>{lot.cancellation_reason || 'Cancelled by collector'}</Text></View>}
        {!!error && <View style={styles.warning}><Text>{error}</Text></View>}

        <Card title={`Handover Checklist  ${done}/${checklist.length}`}>
            {checklist.map(([name, ok]: any) => <View style={styles.check} key={name}><View style={[styles.dot, ok && styles.dotDone]}><Text style={styles.dotText}>{ok ? '✓' : ''}</Text></View><Text style={[styles.checkText, ok && styles.checkDone]}>{name}</Text></View>)}
            {done === checklist.length && <Text style={styles.complete}>✓ Handover lifecycle complete</Text>}
        </Card>

        <Card title="Lot Information">
            <Row label="Category" value={lot.category} />
            {lot.sub_category && <Row label="Sub-category" value={lot.sub_category} />}
            <Row label="Estimated Weight" value={`${lot.approx_weight_kg ?? '—'} kg`} />
            {scaleWeight != null && <Row label="Final Weight" value={`${scaleWeight} kg`} />}
            <Row label="Estimated Value" value={money(lot.estimated_value)} />
            <Row label="Transaction Status" value={<Badge value={lot.transaction_status} />} />
            <Row label="Payment Status" value={<Badge value={lot.payment_status} />} />
            {lot.recycler_name && <Row label="Recycler" value={lot.recycler_name} />}
            <Row label="Created" value={date(lot.created_at)} />
            {(collectionImages.length ? collectionImages : lot.image_ref ? [{ id: 'fallback', image_url: lot.image_ref }] : []).map((im: any, i: number) =>
                <View key={String(im.id || i)} style={{ marginTop: 12 }}><Image source={{ uri: im.image_url }} style={styles.photo} /><Text style={styles.caption}>Collection photo {i + 1}</Text></View>)}
        </Card>

        <Card title="⚖️ Pricing & Settlement Traceability">
            <Text style={styles.subheading}>Transparent 4-stage valuation</Text>
            <View style={styles.priceBox}><Text style={styles.label}>1. Estimated Value at Creation</Text><Text style={styles.price}>{money(lot.estimated_value)}</Text><Text style={styles.muted}>{approx ? `${approx} kg estimated` : 'Market benchmark reference'}</Text></View>
            <View style={styles.priceBox}><Text style={styles.label}>2. Accepted Recycler Offer</Text><Text style={styles.price}>{rate != null ? `₹${rate} / kg` : 'Awaiting quote'}</Text><Text style={styles.muted}>{acceptedEstimate ? `Est. payout ${money(acceptedEstimate)}` : 'No quote accepted yet'}</Text></View>
            <View style={styles.priceBox}><Text style={styles.label}>3. Physical Scale Weight</Text><Text style={styles.price}>{scaleWeight != null ? `${scaleWeight} kg` : 'Pending weigh-in'}</Text><Text style={styles.muted}>Weighed at physical handover</Text></View>
            <View style={[styles.priceBox, finalValue != null && styles.finalBox]}><Text style={styles.label}>4. Final Sale Value</Text><Text style={[styles.price, finalValue != null && styles.green]}>{finalValue != null ? money(finalValue) : 'Pending handover'}</Text><Text style={styles.muted}>Final Scale Weight × Accepted Rate</Text></View>
        </Card>

        <Card title="Recycler Quotes">
            {accepted ? <View><Text style={styles.complete}>✓ Accepted: {accepted.recycler_name} — ₹{rate}/kg</Text>
                <Row label="Facility" value={accepted.recycler_name} />
                <Row label="Phone" value={accepted.contact_details || accepted.recycler_contact_details || 'Available in dispatch'} />
                {!!(accepted.contact_details || accepted.recycler_contact_details) && <Pressable onPress={() => Linking.openURL(`tel:${accepted.contact_details || accepted.recycler_contact_details}`)}><Text style={styles.link}>📞 Call recycler</Text></Pressable>}
                <Row label="Pickup" value={accepted.pickup_availability || 'Daily / On Request'} />
            </View> : openOffers.length ? openOffers.map((o: any) => {
                const total = approx > 0 ? Math.round(Number(o.offered_price) * approx) : null;
                return <View key={String(o.id)} style={styles.offer}><Text style={styles.offerName}>{o.recycler_name}</Text><Text style={styles.price}>₹{Number(o.offered_price)} / kg</Text>{total && <Text style={styles.muted}>Est. payout {money(total)}</Text>}<View style={styles.actions}><Pressable disabled={!!busy} style={styles.accept} onPress={() => offerAction(o.id, 'accept')}><Text style={styles.primaryText}>{busy === o.id ? 'Working...' : 'Accept'}</Text></Pressable><Pressable disabled={!!busy} style={styles.reject} onPress={() => offerAction(o.id, 'reject')}><Text style={styles.dangerText}>Reject</Text></Pressable></View></View>
            }) : <View><Text style={styles.muted}>No recycler quotes yet.</Text><Pressable style={styles.primary} onPress={() => router.push({ pathname: '/collector/matched-recyclers', params: { lotId, category: String(lot.category || ''), location: String(lot.location || lot.collection_location || ''), weight: String(lot.approx_weight_kg || '') } })}><Text style={styles.primaryText}>Find Recyclers</Text></Pressable></View>}
        </Card>

        <Card title="Traceability Timeline">
            {timeline.map((x: any, i) => <View style={styles.timeline} key={i}><View style={[styles.timelineDot, i <= currentStep && styles.dotDone]}><Text style={styles.dotText}>{i <= currentStep ? '✓' : ''}</Text></View><View style={{ flex: 1 }}><Text style={styles.timelineTitle}>{x[0]}</Text><Text style={styles.muted}>{x[1]}</Text></View></View>)}
            <Pressable style={styles.secondary} onPress={() => router.push(`/collector/lots/trace/${lotId}` as any)}><Text style={styles.secondaryText}>View Full Traceability →</Text></Pressable>
        </Card>

        {(handover?.handover_reference_number || handover?.handover_reference) && <Card title="Handover Reference">
            <Text style={styles.reference}>{handover.handover_reference_number || handover.handover_reference}</Text>
            <Row label="Status" value={<Badge value={handover.status} />} /><Row label="Initiated" value={date(handover.event_timestamp)} />
            {handover.confirmation_timestamp && <Row label="Confirmed" value={date(handover.confirmation_timestamp)} />}
            {handover.weight_kg != null && <Row label="Final Weight" value={`${handover.weight_kg} kg`} />}
        </Card>}

        {handover?.status === 'confirmed' && <Card title="Digital Handover Record">
            <Row label="Reference" value={handover.handover_reference_number || handover.handover_reference} />
            <Row label="Collection Weight" value={`${handover.approx_weight_kg ?? '—'} kg`} />
            <Row label="Final Weight" value={`${handover.weight_kg ?? '—'} kg`} />
            <Row label="Confirmed" value={date(handover.confirmed_at || handover.confirmation_timestamp)} />
            <Row label="GPS" value={handover.gps_lat != null && handover.gps_lng != null ? `${handover.gps_lat}, ${handover.gps_lng}` : 'Not recorded'} />
            <Row label="QR Scan" value={handover.scan_verified ? 'Verified' : 'Manual / not recorded'} />
            {confirmationImages.length > 0 && <Image source={{ uri: confirmationImages[confirmationImages.length - 1].image_url }} style={styles.photo} />}
            <Text style={styles.complete}>✓ Digital handover record complete</Text>
        </Card>}

        <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
            <View style={styles.overlay}><View style={styles.modal}><Text style={styles.cardTitle}>⚠️ Cancel Lot</Text><Text style={styles.muted}>Tell us why you are cancelling this lot.</Text><TextInput multiline value={cancelReason} onChangeText={setCancelReason} placeholder="Cancellation reason" style={styles.input} /><View style={styles.actions}><Pressable style={styles.secondary} onPress={() => setCancelOpen(false)}><Text style={styles.secondaryText}>Keep Lot</Text></Pressable><Pressable style={styles.dangerButton} onPress={doCancel}><Text style={styles.primaryText}>{busy === 'cancel' ? 'Cancelling...' : 'Cancel Lot'}</Text></Pressable></View></View></View>
        </Modal>
        <View style={{ height: 40 }} />
    </ScrollView>;
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' }, container: { padding: 18, paddingTop: 24 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
    back: { color: '#15803d', fontWeight: '800', marginBottom: 14 }, headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }, title: { fontSize: 28, fontWeight: '900', color: '#111827' }, id: { fontSize: 11, color: '#64748b', marginTop: 3 },
    big: { fontSize: 20, fontWeight: '800', color: '#111827' }, muted: { fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 16 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 15, marginTop: 13 }, cardTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 12 },
    row: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }, label: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 }, value: { fontSize: 13, color: '#111827', fontWeight: '700' }, badge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 }, badgeGood: { backgroundColor: '#dcfce7' }, badgeBad: { backgroundColor: '#fee2e2' }, badgeText: { fontSize: 9, fontWeight: '900', color: '#b45309', textTransform: 'capitalize' }, goodText: { color: '#15803d' }, badText: { color: '#b91c1c' },
    lock: { backgroundColor: '#f1f5f9', padding: 11, borderRadius: 10, color: '#475569', fontSize: 11 }, dangerOutline: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 11, alignSelf: 'flex-start' }, dangerText: { color: '#b91c1c', fontWeight: '800', fontSize: 11 }, cancelled: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 13, borderRadius: 12, marginTop: 12 }, cancelledTitle: { fontWeight: '900', color: '#b91c1c' }, cancelledText: { fontSize: 11, color: '#991b1b', marginTop: 4 }, warning: { backgroundColor: '#fef3c7', padding: 11, borderRadius: 10, marginTop: 10 },
    check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }, dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }, dotDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' }, dotText: { color: '#fff', fontSize: 11, fontWeight: '900' }, checkText: { fontSize: 12, color: '#64748b' }, checkDone: { color: '#166534', fontWeight: '700' }, complete: { marginTop: 10, backgroundColor: '#dcfce7', color: '#166534', fontWeight: '800', fontSize: 11, padding: 10, borderRadius: 9 },
    photo: { width: '100%', height: 190, borderRadius: 12, backgroundColor: '#e5e7eb' }, caption: { fontSize: 10, color: '#64748b', marginTop: 4 }, subheading: { fontSize: 10, color: '#64748b', marginTop: -7, marginBottom: 8 }, priceBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginTop: 8 }, finalBox: { backgroundColor: '#f0fdf4', borderColor: '#86efac' }, price: { fontSize: 17, fontWeight: '900', color: '#111827', marginTop: 3 }, green: { color: '#15803d' },
    offer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 11, padding: 12, marginTop: 9 }, offerName: { fontWeight: '900', color: '#111827' }, actions: { flexDirection: 'row', gap: 8, marginTop: 12 }, accept: { backgroundColor: '#16a34a', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 16 }, reject: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 16 }, primary: { backgroundColor: '#16a34a', borderRadius: 10, padding: 12, marginTop: 12, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 11 }, secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 9, padding: 10, marginTop: 12, alignItems: 'center' }, secondaryText: { fontWeight: '800', fontSize: 11, color: '#334155' }, link: { color: '#15803d', fontWeight: '800', marginTop: 9 },
    timeline: { flexDirection: 'row', gap: 11, paddingVertical: 9 }, timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }, timelineTitle: { fontSize: 12, fontWeight: '800', color: '#111827' }, reference: { fontSize: 16, fontWeight: '900', color: '#15803d', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 9 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 20 }, modal: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 11, minHeight: 90, textAlignVertical: 'top', marginTop: 14 }, dangerButton: { backgroundColor: '#dc2626', borderRadius: 9, padding: 11, alignItems: 'center', flex: 1 }
});
