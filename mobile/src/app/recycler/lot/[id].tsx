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
  useEffect,
  useState,
} from 'react';

import {
  acceptRecyclerLot,
  getAvailableLots,
  rejectRecyclerLot,
  submitRecyclerQuote,
} from '../../../api/client';
import { BrandedHeader } from '../../../components/branding/BrandedHeader';

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
        const response =
          await getAvailableLots(
            recyclerId,
          );

        const found =
          response.data.find(
            candidate =>
              getLotId(candidate) === String(id),
          );

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

  useEffect(() => {
    void loadLot();
  }, [loadLot]);



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
      await submitRecyclerQuote({
        recycler_id:
          recyclerId,

        lot_id:
          lot.lot_id,

        amount,

        notes:
          notes ||
          undefined,
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

  const category =
    lot.category ??
    lot.material_category ??
    '—';

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
              lot.transaction_status ??
              '—'
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

        {(lot.transaction_status === 'quoted' && (!lot.recycler_offer_status || lot.recycler_offer_status === 'requested')) && (
          <Pressable
            disabled={
              actionLoading
            }
            onPress={() =>
              setQuoteVisible(
                true,
              )
            }
            style={
              styles.quoteButton
            }
          >
            <Text
              style={
                styles.quoteText
              }
            >
              {t(
                'recyclerLot.submitQuote',
              )}
            </Text>
          </Pressable>
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