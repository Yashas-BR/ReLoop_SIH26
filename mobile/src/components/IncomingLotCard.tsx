import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RecyclerIncomingLot } from '../types/recycler-lot';

interface IncomingLotCardProps {
  lot: RecyclerIncomingLot;

  kgLabel: string;

  currencySymbol?: string;

  onPress: () => void;
}

export function IncomingLotCard({
  lot,
  kgLabel,
  currencySymbol = '₹',
  onPress,
}: IncomingLotCardProps) {
  const category =
    lot.category ??
    lot.material_category ??
    '—';

  const location =
    lot.location ??
    lot.collection_location ??
    '—';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.main}>
          <Text style={styles.lotId}>
            #{lot.lot_id}
          </Text>

          <Text style={styles.category}>
            {category}
          </Text>
        </View>

        {!!lot.transaction_status && (
          <View style={styles.status}>
            <Text style={styles.statusText}>
              {lot.transaction_status
                .replace(/_/g, ' ')
                .toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.detail}>
          {lot.approx_weight_kg ?? '—'} {kgLabel}
        </Text>

        {lot.estimated_value != null && (
          <Text style={styles.value}>
            {currencySymbol}
            {Number(
              lot.estimated_value,
            ).toLocaleString('en-IN')}
          </Text>
        )}
      </View>

      <Text
        numberOfLines={2}
        style={styles.location}
      >
        {location}
      </Text>

      <Text style={styles.arrow}>
        →
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',

    padding: 18,

    borderRadius: 20,

    borderWidth: 1,

    borderColor: '#E1E8E3',

    backgroundColor: '#FFFFFF',
  },

  pressed: {
    opacity: 0.7,
  },

  top: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    gap: 12,
  },

  main: {
    flex: 1,
  },

  lotId: {
    fontSize: 12,

    fontWeight: '700',

    color: '#718078',
  },

  category: {
    marginTop: 4,

    fontSize: 19,

    fontWeight: '900',

    color: '#173D2D',
  },

  status: {
    alignSelf: 'flex-start',

    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: '#E8F5ED',
  },

  statusText: {
    fontSize: 10,

    fontWeight: '900',

    color: '#16794B',
  },

  details: {
    marginTop: 16,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 18,
  },

  detail: {
    fontSize: 14,

    fontWeight: '700',

    color: '#596B61',
  },

  value: {
    fontSize: 16,

    fontWeight: '900',

    color: '#16794B',
  },

  location: {
    marginTop: 12,

    marginRight: 30,

    fontSize: 13,

    lineHeight: 19,

    color: '#718078',
  },

  arrow: {
    position: 'absolute',

    right: 18,

    bottom: 18,

    fontSize: 21,

    color: '#16794B',
  },
});