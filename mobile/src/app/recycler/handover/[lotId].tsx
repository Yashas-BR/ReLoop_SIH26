import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import {
  getLotsByRecycler,
  getHandoversByLot,
  getHandoverByRef,
  initiateHandover,
  confirmHandover,
  updatePayment,
} from '../../../api/client';

import { currentRecyclerId } from '../../../services/auth';
import { useTranslation } from '../../../../i18n/config';
import { BrandedHeader } from '../../../components/branding/BrandedHeader';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { getLotId, getMaterialDisplayLabel } from '../../../utils/lot-helpers';

export default function RecyclerHandoverScreen() {
  const { t } = useTranslation();
  const { lotId, isRef } = useLocalSearchParams<{ lotId: string; isRef?: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [lot, setLot] = useState<any>(null);
  const [handover, setHandover] = useState<any>(null);

  // Modals for Weight & Payment
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [finalWeight, setFinalWeight] = useState('');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const loadData = useCallback(async () => {
    if (!lotId) return;
    setLoading(true);
    setError('');
    try {
      const rid = await currentRecyclerId();
      if (!rid) throw new Error('Not logged in');

      let resolvedLot: any = null;
      let resolvedHandover: any = null;

      if (isRef === 'true') {
        const hRes = await getHandoverByRef(lotId);
        resolvedHandover = (hRes as any)?.data ?? hRes;
        if (resolvedHandover?.lot_id) {
          const lRes = await getLotsByRecycler(rid);
          const lots = Array.isArray((lRes as any)?.data) ? (lRes as any).data : [];
          resolvedLot = lots.find((l: any) => String(getLotId(l)) === String(resolvedHandover.lot_id));
        }
      } else {
        const lRes = await getLotsByRecycler(rid);
        const lots = Array.isArray((lRes as any)?.data) ? (lRes as any).data : [];
        resolvedLot = lots.find((l: any) => String(getLotId(l)) === lotId);
        
        if (resolvedLot) {
          const hRes = await getHandoversByLot(lotId).catch(() => ({ data: [] }));
          const hList = Array.isArray((hRes as any)?.data) ? (hRes as any).data : [];
          if (hList.length > 0) resolvedHandover = hList[0];
        }
      }

      if (!resolvedLot && !resolvedHandover) {
        throw new Error(t('recyclerLot.loadError') || 'Not found');
      }

      setLot(resolvedLot);
      setHandover(resolvedHandover);
    } catch (err) {
      console.error('[Handover]', err);
      setError(t('common.error') || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [lotId, isRef, t]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const handleStartPickup = async () => {
    if (!lot) return;
    setActionLoading(true);
    try {
      const rid = await currentRecyclerId();
      await initiateHandover({
        lot_id: getLotId(lot),
        collector_id: lot.collector_id,
        recycler_id: rid,
        weight_kg: Number(lot.approx_weight_kg || 0),
        gps_lat: 0, // Fallback; actual implementation should use real GPS if available
        gps_lng: 0,
        photo_refs: [],
      });
      Alert.alert(t('common.success') || 'Success', t('recyclerActivity.handoverInitiated') || 'Pickup started.');
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to start pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWeight = async () => {
    const weightNum = Number(finalWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert(t('common.error'), t('verify.validWeight') || 'Enter valid weight');
      return;
    }
    if (!handover?.handover_reference_number && !handover?.handover_reference) return;
    const ref = handover.handover_reference_number || handover.handover_reference;

    setActionLoading(true);
    try {
      const rid = await currentRecyclerId();
      await confirmHandover(ref, {
        recycler_id: rid,
        final_weight_kg: weightNum,
        scan_verified: true, // We successfully parsed the QR to get here
      });
      setWeightModalVisible(false);
      Alert.alert(t('common.success') || 'Success', t('recyclerActivity.confirmed') || 'Handover confirmed.');
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to confirm');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    const priceNum = Number(paymentAmount);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t('common.error'), t('lotDetail.payInvalid') || 'Enter valid amount');
      return;
    }
    const id = lot?.lot_id || handover?.lot_id;
    if (!id) return;

    setActionLoading(true);
    try {
      await updatePayment(id, {
        payment_status: 'paid',
        final_price: priceNum,
        payment_method: 'cash',
      });
      setPaymentModalVisible(false);
      Alert.alert(t('common.success') || 'Success', t('lotDetail.paySuccess') || 'Payment recorded.');
      await loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16794B" />
      </View>
    );
  }

  if (error || (!lot && !handover)) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const categoryLabel = getMaterialDisplayLabel(lot?.category || handover?.category, t);
  const status = handover?.status || lot?.transaction_status || 'unknown';
  const isPaid = lot?.payment_status === 'paid' || handover?.payment_status === 'paid' || (lot?.transaction_status === 'completed');

  return (
    <View style={styles.screen}>
      <BrandedHeader
        showBack
        title={t('collectorQr.pickupVerified') || 'Pickup Actions'}
        rightElement={<LanguageSelector />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('common.summary')}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('collectorQr.lotId') || 'Lot ID'}</Text>
            <Text style={styles.value}>{getLotId(lot) || handover?.lot_id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('lotDetail.category')}</Text>
            <Text style={styles.value}>{categoryLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('traceability.weight') || 'Approx Weight'}</Text>
            <Text style={styles.value}>{lot?.approx_weight_kg || handover?.approx_weight_kg || '—'} kg</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('lotDetail.status')}</Text>
            <Text style={styles.value}>{status}</Text>
          </View>
          {handover?.weight_kg && (
            <View style={styles.row}>
              <Text style={styles.label}>{t('traceability.details.weight') || 'Final Weight'}</Text>
              <Text style={styles.value}>{handover.weight_kg} kg</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsBox}>
          <Text style={styles.cardTitle}>{t('lotDetail.traceability') || 'Workflow Actions'}</Text>
          
          {(!handover) && (
            <Pressable style={styles.button} disabled={actionLoading} onPress={handleStartPickup}>
              <Text style={styles.buttonText}>{actionLoading ? t('common.loading') : (t('recyclers.initiateHandover') || 'Start Pickup')}</Text>
            </Pressable>
          )}

          {(handover?.status === 'pending_confirmation') && (
            <Pressable style={styles.button} disabled={actionLoading} onPress={() => setWeightModalVisible(true)}>
              <Text style={styles.buttonText}>{actionLoading ? t('common.loading') : (t('collectorQr.enterFinalWeight') || 'Enter Final Weight')}</Text>
            </Pressable>
          )}

          {(handover?.status === 'confirmed' && !isPaid) && (
            <Pressable style={styles.button} disabled={actionLoading} onPress={() => setPaymentModalVisible(true)}>
              <Text style={styles.buttonText}>{actionLoading ? t('common.loading') : (t('collectorQr.recordPayment') || 'Record Payment')}</Text>
            </Pressable>
          )}

          {isPaid && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ {t('collectorQr.paymentCompleted') || 'Payment Completed'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Final Weight Modal */}
      <Modal visible={weightModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('collectorQr.enterFinalWeight') || 'Enter Final Weight (kg)'}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={finalWeight}
              onChangeText={setFinalWeight}
              placeholder="e.g. 5.5"
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.button, styles.cancelBtn]} onPress={() => setWeightModalVisible(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.confirmBtn]} disabled={actionLoading} onPress={handleConfirmWeight}>
                <Text style={styles.buttonText}>{actionLoading ? '...' : (t('collectorQr.recordFinalWeight') || 'Record')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('collectorQr.completePayment') || 'Record Payment (₹)'}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="e.g. 1500"
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.button, styles.cancelBtn]} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.confirmBtn]} disabled={actionLoading} onPress={handleRecordPayment}>
                <Text style={styles.buttonText}>{actionLoading ? '...' : (t('common.submit') || 'Submit')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#173D2D', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 14, color: '#666', fontWeight: '600' },
  value: { fontSize: 14, color: '#111', fontWeight: '700' },
  actionsBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  button: { backgroundColor: '#16794B', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: '#D93B3B', marginBottom: 20 },
  successBox: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  successText: { color: '#2E7D32', fontWeight: 'bold' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', padding: 25, borderRadius: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#f0f0f0' },
  cancelText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
  confirmBtn: { flex: 1 },
});
