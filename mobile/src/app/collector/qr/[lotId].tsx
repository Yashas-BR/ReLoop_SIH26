import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';
import { useFocusEffect } from 'expo-router';

import QRCode from 'react-native-qrcode-svg';

import { getLotsByCollector } from '../../../api/client';
import { currentCollectorId } from '../../../../services/auth';
import { BrandedHeader } from '../../../components/branding/BrandedHeader';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { useTranslation } from '../../../../i18n/config';
import { getLotId } from '../../../utils/lot';

export default function CollectorQrScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { t } = useTranslation();

  const [lot, setLot] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLot = useCallback(async () => {
    if (!lotId) return;

    setLoading(true);
    setError('');

    try {
      const cid = await currentCollectorId();
      if (!cid) throw new Error('Not logged in');
      
      const response: any = await getLotsByCollector(cid);
      const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const found = data.find((l: any) => String(l.lot_id) === lotId);
      
      if (!found) {
        throw new Error('Lot not found');
      }
      setLot(found);
    } catch (err) {
      console.error('[CollectorQr]', err);
      setError(t('collectorLot.loadError') || 'Failed to load lot');
    } finally {
      setLoading(false);
    }
  }, [lotId, t]);

  useFocusEffect(
    useCallback(() => {
      void loadLot();
    }, [loadLot])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16794B" />
        <Text style={styles.centerText}>{t('common.loading') || 'Loading...'}</Text>
      </View>
    );
  }

  if (error || !lot) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{t('collectorQr.qrUnavailable') || 'QR unavailable'}</Text>
        <Text style={styles.centerText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{t('common.back') || 'Back'}</Text>
        </Pressable>
      </View>
    );
  }

  // Derive QR Payload according to src/services/qr.ts format
  // Handover references take priority if available, otherwise lot ID.
  const isHandover = !!(lot as any).handover_reference;
  const qrValue = isHandover
    ? `RELOOP:HANDOVER:${(lot as any).handover_reference}`
    : `RELOOP:LOT:${getLotId(lot)}`;
  
  const displayLabel = isHandover
    ? t('collectorQr.handoverReference') || 'Handover Reference'
    : t('collectorQr.lotId') || 'Lot ID';
  const displayValue = isHandover ? (lot as any).handover_reference : getLotId(lot);
  const title = isHandover 
    ? t('collectorQr.handoverQrCode') || 'Handover QR Code'
    : t('collectorQr.lotQrCode') || 'Lot QR Code';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandedHeader
        showBack
        title={title}
        subtitle={t('collectorQr.letRecyclerScan') || 'Let the Recycler scan this QR code'}
        rightElement={<LanguageSelector />}
      />

      <View style={styles.card}>
        <View style={styles.qrContainer}>
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={240}
              color="#173D2D"
              backgroundColor="#FFFFFF"
            />
          ) : (
            <Text style={styles.centerText}>{t('collectorQr.unableToGenerate') || 'Unable to generate QR code'}</Text>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailLabel}>{displayLabel}</Text>
          <Text style={styles.detailValue}>{displayValue}</Text>
        </View>

        <Pressable onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{t('collectorQr.back') || 'Back to Lot Detail'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },
  content: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8F6',
  },
  centerText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#718078',
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#173D2D',
  },
  primaryButton: {
    marginTop: 30,
    backgroundColor: '#16794B',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    marginTop: 30,
    padding: 30,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    marginTop: 25,
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
  },
  detailLabel: {
    fontSize: 13,
    color: '#78877F',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 20,
    color: '#173D2D',
    fontWeight: '800',
  },
});
