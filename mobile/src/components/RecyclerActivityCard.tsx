import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  RecyclerActivityItem,
  RecyclerActivityLot,
} from '../types/recycler-activity';
import { StatusBadge } from './recycler/StatusBadge';
import { formatAppDate, formatCurrency } from '../utils/locale';
import { useTranslation } from '../../i18n/config';
import { getStatusLabel } from '../utils/status';
import { getMaterialDisplayLabel } from '../utils/lot-helpers';

export interface RecyclerActivityCardProps {
  activity?: RecyclerActivityItem;
  lot?: RecyclerActivityLot;
  onPress?: () => void;
  language?: string;
  kgLabel?: string;
  currencySymbol?: string;
}

function getCategoryIcon(category?: string | null, activityType?: string | null): string {
  const normCat = (category || '').toLowerCase();
  const normType = (activityType || '').toLowerCase();

  if (normType.includes('confirm') || normCat === 'verification') {
    return '✅';
  }
  if (normType.includes('quote') || normCat === 'quote') {
    return '🏷️';
  }
  if (normType.includes('pay') || normCat === 'payment') {
    return '💳';
  }
  if (normType.includes('handover') || normCat === 'handover') {
    return '🤝';
  }
  if (normType.includes('match') || normCat === 'match') {
    return '⚡';
  }
  return '📦';
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const RecyclerActivityCard = memo(function RecyclerActivityCard({
  activity,
  lot,
  onPress,
  language = 'en',
  kgLabel = 'kg',
}: RecyclerActivityCardProps) {
  const { t } = useTranslation();
  
  // Normalize either activity item or raw lot
  const item: RecyclerActivityItem = activity ?? {
    id: lot?.lot_id ?? 'activity-id',
    lot_id: lot?.lot_id,
    display_lot_id: lot?.lot_id ? `LOT-${lot.lot_id.slice(0, 8).toUpperCase()}` : undefined,
    activity_type: lot?.transaction_status ?? 'lot_activity',
    category: 'lot',
    title: lot?.category ? `${lot.category} Lot` : 'Recycling Lot',
    description: lot?.description ?? lot?.notes ?? null,
    timestamp: lot?.updated_at ?? lot?.created_at ?? new Date().toISOString(),
    status: lot?.transaction_status ?? 'quoted',
    amount: lot?.estimated_value ?? null,
    weight_kg: lot?.approx_weight_kg ?? null,
    material_category: lot?.category ?? null,
    location: lot?.location ?? lot?.collection_location ?? null,
    reference_number: lot?.handover_reference_number ?? null,
  };

  const icon = getCategoryIcon(item.category, item.activity_type);
  const relativeTime = formatRelativeTime(item.timestamp);
  const formattedDate = formatAppDate(item.timestamp, language);
  const displayId = item.display_lot_id || (item.lot_id ? `#${item.lot_id}` : null);

  const hasMetrics =
    item.weight_kg != null ||
    item.amount != null ||
    item.collector_name != null;

  const statusLabel = getStatusLabel(item.status, t);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      {/* Header Row: Icon + Title + Status */}
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.titleArea}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {item.status ? (
              <StatusBadge status={item.status} label={statusLabel} />
            ) : null}
          </View>

          <View style={styles.subTitleRow}>
            {displayId ? (
              <Text style={styles.lotIdBadge}>{displayId}</Text>
            ) : null}
            {item.material_category ? (
              <Text style={styles.categoryBadge}>{getMaterialDisplayLabel(item.material_category, t)}</Text>
            ) : null}
            <Text style={styles.timeText}>
              {relativeTime ? `${relativeTime} • ` : ''}{formattedDate}
            </Text>
          </View>
        </View>
      </View>

      {/* Description / Notes */}
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      {/* Metrics Row */}
      {hasMetrics ? (
        <View style={styles.metricsContainer}>
          {item.weight_kg != null ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('recyclerActivity.weight')}</Text>
              <Text style={styles.metricValue}>
                {item.weight_kg} {kgLabel}
              </Text>
            </View>
          ) : null}

          {item.amount != null ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('recyclerActivity.amount')}</Text>
              <Text style={styles.metricValueHighlight}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ) : null}

          {item.collector_name ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('recyclerActivity.collector')}</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {item.collector_name}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Footer Row: Reference or Location + Tap indicator */}
      {(item.reference_number || item.location) ? (
        <View style={styles.footer}>
          <Text style={styles.footerText} numberOfLines={1}>
            {item.reference_number
              ? `${t('recyclerActivity.reference')}: ${item.reference_number}`
              : item.location || ''}
          </Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E7E3',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.995 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  titleArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#173D2D',
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  lotIdBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16794B',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#55645D',
    backgroundColor: '#EDF1EF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#829188',
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#4A5952',
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F1',
  },
  metricItem: {
    flexShrink: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#829188',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#173D2D',
    marginTop: 1,
  },
  metricValueHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16794B',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F7F6',
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#718078',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 14,
    color: '#16794B',
    fontWeight: '700',
    marginLeft: 8,
  },
});