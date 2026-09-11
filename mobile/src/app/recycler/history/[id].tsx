import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getLotsByRecycler } from '../../../api/client';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { StatusBadge } from '../../../components/recycler/StatusBadge';
import { useAuth } from '../../../services/auth';
import type { RecyclerActivityLot } from '../../../types/recycler-activity';
import { useTranslation } from '../../../../i18n/config';

export default function RecyclerHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recyclerId } = useAuth();
  const { t } = useTranslation();

  const [lot, setLot] = useState<RecyclerActivityLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!recyclerId) {
        throw new Error('No Recycler ID');
      }

      const response = await getLotsByRecycler(recyclerId);

      const found = response.data.find(
        (candidate) => String(candidate.lot_id) === String(id)
      );

      if (!found) {
        setError(t('recyclerHistory.notFound'));
        return;
      }

      setLot(found);
    } catch (loadError) {
      console.error('[RecyclerHistoryDetail]', loadError);
      setError(t('recyclerHistory.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, recyclerId, t]);

  useEffect(() => {
    void loadLot();
  }, [loadLot]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!lot || error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          {t('recyclerHistory.notFound')}
        </Text>
        <Text style={styles.centerText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const location = lot.location ?? lot.collection_location ?? 'N/A';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LanguageSelector />

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← {t('common.back')}</Text>
      </Pressable>

      <Text style={styles.eyebrow}>
        {t('recyclerHistory.lot')} #{lot.lot_id}
      </Text>

      <Text style={styles.title}>{lot.category ?? 'N/A'}</Text>

      <View style={styles.badge}>
        <StatusBadge 
          status={lot.transaction_status} 
          label={
            lot.transaction_status === 'matched' ? t('recyclerActivity.matched') :
            lot.transaction_status === 'confirmed' ? t('recyclerActivity.confirmed') :
            lot.transaction_status === 'handed_over' ? t('recyclerActivity.handedOver') :
            undefined
          }
        />
      </View>

      <View style={styles.card}>
        <Detail
          label={t('recyclerHistory.weight')}
          value={`${lot.approx_weight_kg ?? 'N/A'} ${t('common.kg')}`}
        />

        <Detail
          label={t('recyclerHistory.location')}
          value={location}
        />

        <Detail
          label={t('recyclerHistory.value')}
          value={
            lot.estimated_value != null
              ? `₹${Number(lot.estimated_value).toLocaleString('en-IN')}`
              : 'N/A'
          }
        />

        <Detail
          label={t('recyclerHistory.status')}
          value={lot.transaction_status ?? 'N/A'}
        />

        <Detail
          label={t('recyclerHistory.handoverReference')}
          value={lot.handover_reference_number ?? 'N/A'}
        />

        <Detail
          label={t('recyclerHistory.traceability')}
          value={lot.traceability_status ?? 'N/A'}
        />

        {!!lot.description && (
          <Detail
            label={t('recyclerHistory.description')}
            value={lot.description}
          />
        )}

        {!!lot.notes && (
          <Detail
            label={t('recyclerHistory.notes')}
            value={lot.notes}
          />
        )}
      </View>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F6' },
  content: { padding: 20, paddingTop: 50, paddingBottom: 60 },
  center: {
    flex: 1,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8F6',
  },
  centerText: { marginTop: 10, textAlign: 'center', color: '#718078' },
  errorTitle: { fontSize: 20, fontWeight: '900', color: '#173D2D' },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#16794B',
  },
  backText: { fontWeight: '900', color: '#FFFFFF' },
  back: { marginTop: 20, fontWeight: '800', color: '#16794B' },
  eyebrow: { marginTop: 25, fontSize: 13, fontWeight: '900', color: '#16794B' },
  title: { marginTop: 5, fontSize: 30, fontWeight: '900', color: '#173D2D' },
  badge: { marginTop: 12, alignItems: 'flex-start' },
  card: { marginTop: 22, padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF' },
  detail: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF1EE' },
  detailLabel: { fontSize: 12, fontWeight: '700', color: '#7A8780' },
  detailValue: { marginTop: 5, fontSize: 16, fontWeight: '800', color: '#173D2D' },
});
