import {
  ActivityIndicator,
  Alert,
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

import {
  getAvailableLots,
  getLotsByRecycler,
  quoteLot,
  acceptOffer,
  rejectOffer,
} from '../../../api/client';
import { BrandedHeader } from '../../../components/branding/BrandedHeader';
import { getMaterialDisplayLabel, getRecyclerStatusLabel } from '../../../utils/lot-helpers';

import { QuoteModal } from '../../../components/QuoteModal';

import { LanguageSelector } from '../../../components/LanguageSelector';

import { useAuth } from '../../../services/auth';

import type { RecyclerIncomingLot } from '../../../types/recycler-lot';
import { getLotId } from '../../../utils/lot';

import { useTranslation } from '../../../../i18n/config';

export default function RecyclerLotDetailScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const { recyclerId } =
    useAuth();

  const { t } =
    useTranslation();

  const [lot, setLot] =
    useState<RecyclerIncomingLot | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [
    quoteVisible,
    setQuoteVisible,
  ] = useState(false);

  const [error, setError] =
    useState('');

  const loadLot =
    useCallback(async () => {
      if (
        !recyclerId ||
        !id
      ) {
        return;
      }

      setLoading(true);

      setError('');

      try {
        const [
          availableRes,
          recyclerRes
        ] = await Promise.all([
          getAvailableLots(recyclerId),
          getLotsByRecycler(recyclerId),
        ]);

        const allLots = [
          ...(Array.isArray(availableRes.data) ? availableRes.data : []),
          ...(Array.isArray(recyclerRes.data) ? recyclerRes.data : []),
        ];

        // Deduplicate by lot_id and find the specific lot
        const uniqueLots = new Map();
        for (const item of allLots) {
          const itemId = getLotId(item);
          if (itemId && !uniqueLots.has(String(itemId))) {
            uniqueLots.set(String(itemId), item);
          }
        }

        const found = uniqueLots.get(String(id));

        if (!found) {
          setLot(null);

          setError(
            t(
              'recyclerLot.notFound',
            ),
          );

          return;
        }

        setLot(found);
      } catch (loadError) {
        console.error(
          '[RecyclerLot]',
          loadError,
        );

        setError(
          t(
            'recyclerLot.loadError',
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [
      id,
      recyclerId,
      t,
    ]);

  useFocusEffect(
    useCallback(() => {
      void loadLot();
    }, [loadLot])
  );



  async function handleQuote(
    amount: number,
    notes: string,
  ) {
    if (
      !recyclerId ||
      !lot
    ) {
      return;
    }

    setActionLoading(true);

    try {
      await quoteLot({
        recyclerId:
          recyclerId,

        lotId:
          lot.lot_id,

        offeredPrice:
          amount,

        existingOfferId:
          lot.offer_id ?? undefined,
      });

      setQuoteVisible(false);

      Alert.alert(
        t(
          'recyclerLot.success',
        ),

        t(
          'recyclerLot.quoteSuccess',
        ),
      );

      await loadLot();
    } catch (actionError) {
      console.error(
        '[RecyclerLot Quote]',
        actionError,
      );

      Alert.alert(
        t(
          'common.error',
        ),

        t(
          'recyclerLot.quoteError',
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAccept() {
    const lotAny = lot as any;
    if (!lotAny?.offer_id && !lotAny?.id) return;
    const offerId = lotAny.offer_id ?? lotAny.id;
    setActionLoading(true);
    try {
      await acceptOffer(offerId!);
      Alert.alert(t('recyclerLot.success'), t('recyclerLot.acceptSuccess'));
      await loadLot();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), t('recyclerLot.acceptError'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    const lotAny = lot as any;
    if (!lotAny?.offer_id && !lotAny?.id) return;
    const offerId = lotAny.offer_id ?? lotAny.id;
    Alert.alert(
      t('recyclerLot.rejectTitle'),
      t('recyclerLot.rejectConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('recyclerLot.reject'), 
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await rejectOffer(offerId!);
              Alert.alert(t('recyclerLot.success'), t('recyclerLot.rejectSuccess'));
              await loadLot();
            } catch (err) {
              console.error(err);
              Alert.alert(t('common.error'), t('recyclerLot.rejectError'));
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.centerText
          }
        >
          {t(
            'common.loading',
          )}
        </Text>
      </View>
    );
  }

  if (
    error ||
    !lot
  ) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          {t(
            'recyclerLot.notFound',
          )}
        </Text>

        <Text
          style={
            styles.centerText
          }
        >
          {error}
        </Text>

        <Pressable
          onPress={() =>
            router.back()
          }
          style={
            styles.primaryButton
          }
        >
          <Text
            style={
              styles.primaryText
            }
          >
            {t(
              'common.back',
            )}
          </Text>
        </Pressable>
      </View>
    );
  }

  const rawCategory =
    lot.category ??
    lot.material_category ??
    '—';

  const category = getMaterialDisplayLabel(rawCategory, t);

  const location =
    lot.location ??
    lot.collection_location ??
    '—';

  return (
    <>
      <ScrollView
        style={
          styles.screen
        }
        contentContainerStyle={
          styles.content
        }
      >
        <BrandedHeader
          showBack
          title={category}
          subtitle={`${t('recyclerLot.lot')} #${lot.lot_id}`}
          rightElement={<LanguageSelector />}
        />

        <View
          style={
            styles.card
          }
        >
          <Detail
            label={t(
              'recyclerLot.category',
            )}
            value={
              category
            }
          />

          <Detail
            label={t(
              'recyclerLot.weight',
            )}
            value={`${lot.approx_weight_kg ??
              '—'
              } ${t(
                'common.kg',
              )}`}
          />

          <Detail
            label={t(
              'recyclerLot.location',
            )}
            value={
              location
            }
          />

          <Detail
            label={t(
              'recyclerLot.estimatedValue',
            )}
            value={
              lot.estimated_value !=
                null
                ? `₹${Number(
                  lot.estimated_value,
                ).toLocaleString(
                  'en-IN',
                )}`
                : '—'
            }
          />

          <Detail
            label={t(
              'recyclerLot.status',
            )}
            value={
              getRecyclerStatusLabel(lot.transaction_status, t)
            }
          />

          {!!lot.description && (
            <Detail
              label={t(
                'recyclerLot.description',
              )}
              value={
                lot.description
              }
            />
          )}
        </View>

        <Text
          style={
            styles.actionHeading
          }
        >
          {t(
            'recyclerLot.actions',
          )}
        </Text>

        {(lot.transaction_status === 'available' || lot.transaction_status === 'quoted') && (
          <Pressable
            disabled={actionLoading}
            onPress={() => setQuoteVisible(true)}
            style={styles.quoteButton}
          >
            <Text style={styles.quoteText}>{t('recyclerLot.submitQuote')}</Text>
          </Pressable>
        )}

        {lot.transaction_status === 'matched' && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
            <Pressable
              disabled={actionLoading}
              onPress={handleAccept}
              style={[styles.quoteButton, { flex: 1, backgroundColor: '#16794B' }]}
            >
              <Text style={styles.quoteText}>{t('recyclerLot.accept')}</Text>
            </Pressable>
            <Pressable
              disabled={actionLoading}
              onPress={handleReject}
              style={[styles.quoteButton, { flex: 1, backgroundColor: '#D93B3B' }]}
            >
              <Text style={styles.quoteText}>{t('recyclerLot.reject')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <QuoteModal
        visible={
          quoteVisible
        }
        loading={
          actionLoading
        }
        title={t(
          'recyclerLot.quoteTitle',
        )}
        amountLabel={t(
          'recyclerLot.quoteAmount',
        )}
        notesLabel={t(
          'recyclerLot.quoteNotes',
        )}
        cancelLabel={t(
          'common.cancel',
        )}
        submitLabel={t(
          'recyclerLot.submitQuote',
        )}
        invalidAmountMessage={t(
          'recyclerLot.invalidQuote',
        )}
        onClose={() =>
          setQuoteVisible(
            false,
          )
        }
        onSubmit={
          handleQuote
        }
      />
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.detail
      }
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        '#F5F8F6',
    },

    content: {
      padding: 20,

      paddingTop: 50,

      paddingBottom: 60,
    },

    center: {
      flex: 1,

      padding: 25,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F5F8F6',
    },

    centerText: {
      marginTop: 10,

      textAlign:
        'center',

      color: '#718078',
    },

    errorTitle: {
      fontSize: 21,

      fontWeight: '900',

      color: '#173D2D',
    },

    back: {
      marginTop: 20,

      fontWeight: '800',

      color: '#16794B',
    },

    eyebrow: {
      marginTop: 25,

      fontSize: 13,

      fontWeight: '900',

      color: '#16794B',
    },

    title: {
      marginTop: 5,

      fontSize: 31,

      fontWeight: '900',

      color: '#173D2D',
    },

    card: {
      marginTop: 22,

      padding: 20,

      borderRadius: 20,

      backgroundColor:
        '#FFFFFF',
    },

    detail: {
      paddingVertical: 14,

      borderBottomWidth: 1,

      borderBottomColor:
        '#EDF1EE',
    },

    detailLabel: {
      fontSize: 12,

      fontWeight: '700',

      color: '#78877F',
    },

    detailValue: {
      marginTop: 5,

      fontSize: 16,

      fontWeight: '800',

      color: '#173D2D',
    },

    actionHeading: {
      marginTop: 28,

      fontSize: 19,

      fontWeight: '900',

      color: '#173D2D',
    },

    quoteButton: {
      marginTop: 14,

      minHeight: 55,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 15,

      backgroundColor:
        '#16794B',
    },

    quoteText: {
      fontSize: 16,

      fontWeight: '900',

      color: '#FFFFFF',
    },

    actionRow: {
      marginTop: 11,

      flexDirection:
        'row',

      gap: 10,
    },

    accept: {
      flex: 1,

      minHeight: 51,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 14,

      backgroundColor:
        '#E5F5EB',
    },

    acceptText: {
      fontWeight: '900',

      color: '#16794B',
    },

    reject: {
      flex: 1,

      minHeight: 51,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 14,

      backgroundColor:
        '#FFF0EE',
    },

    rejectText: {
      fontWeight: '900',

      color: '#A93830',
    },

    primaryButton: {
      marginTop: 20,

      paddingHorizontal: 25,

      paddingVertical: 13,

      borderRadius: 13,

      backgroundColor:
        '#16794B',
    },

    primaryText: {
      fontWeight: '900',

      color: '#FFFFFF',
    },
  });