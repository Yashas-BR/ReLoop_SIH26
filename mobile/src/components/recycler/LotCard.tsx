import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  StatusBadge,
} from './StatusBadge';

import type {
  RecyclerLot,
} from '../../types/recycler-dashboard';

import {
  formatAppDate,
  formatCurrency,
} from '../../utils/locale';

import { useTranslation } from '../../../i18n/config';

interface LotCardProps {
  lot: RecyclerLot;

  language: string;

  kgLabel: string;

  onPress:
  () => void;
}

export function LotCard({
  lot,
  language,
  kgLabel,
  onPress,
}: LotCardProps) {
  const { t } = useTranslation();
  const status = lot.transaction_status ?? 'quoted';
  const statusLabel = status === 'matched' ? t('recyclerActivity.matched') :
                      status === 'confirmed' ? t('recyclerActivity.confirmed') :
                      status === 'handed_over' ? t('recyclerActivity.handedOver') :
                      undefined;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
          styles.card,

          pressed &&
          styles.pressed,
        ]}
    >
      <View
        style={
          styles.top
        }
      >
        <View
          style={
            styles.main
          }
        >
          <Text
            style={
              styles.id
            }
          >
            {lot.lot_id}
          </Text>

          <Text
            style={
              styles.category
            }
          >
            {lot.category ??
              '—'}
          </Text>
        </View>

        <StatusBadge
          status={status}
          label={statusLabel}
        />
      </View>

      <View
        style={
          styles.meta
        }
      >
        <Text
          style={
            styles.metaText
          }
        >
          {lot.approx_weight_kg ??
            '?'}{' '}
          {kgLabel}
        </Text>

        <Text
          style={
            styles.metaText
          }
        >
          {formatAppDate(
            lot.created_at,
            language,
          )}
        </Text>
      </View>

      <View
        style={
          styles.bottom
        }
      >
        <Text
          style={
            styles.location
          }
          numberOfLines={1}
        >
          {lot.location ??
            lot.collection_location ??
            '—'}
        </Text>

        <Text
          style={
            styles.price
          }
        >
          {formatCurrency(
            lot.estimated_value,
          )}
        </Text>
      </View>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    card: {
      padding: 17,

      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        '#E1E7E3',

      backgroundColor:
        '#FFFFFF',
    },

    pressed: {
      opacity: 0.7,
    },

    top: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap: 12,
    },

    main: {
      flex: 1,
    },

    id: {
      fontSize: 13,

      fontWeight: '700',

      color: '#718078',
    },

    category: {
      marginTop: 4,

      fontSize: 18,

      fontWeight: '800',

      color: '#173D2D',
    },

    meta: {
      marginTop: 14,

      flexDirection:
        'row',

      gap: 16,
    },

    metaText: {
      fontSize: 13,

      color: '#718078',
    },

    bottom: {
      marginTop: 14,

      paddingTop: 14,

      borderTopWidth: 1,

      borderTopColor:
        '#EEF2EF',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap: 12,
    },

    location: {
      flex: 1,

      fontSize: 13,

      color: '#56645D',
    },

    price: {
      fontSize: 17,

      fontWeight: '900',

      color: '#16794B',
    },
  });