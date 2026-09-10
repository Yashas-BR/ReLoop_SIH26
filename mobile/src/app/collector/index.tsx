import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  DEMO_COLLECTOR_ID,
  getEarningsSummary,
  getLotsByCollector,
} from '../../../api/client';

import { currentCollectorId } from '../../../services/auth';

type Earnings = {
  total_earned?: number;
  total_paid?: number;
  total_pending?: number;
  total_transactions?: number;
};

type Lot = {
  lot_id: string | number;
  category?: string;
  approx_weight_kg?: number;
  weight_kg?: number;
  created_at?: string;
  estimated_value?: number;
  transaction_status?: string;
  payment_status?: string;
};

function fmt(value: number | null | undefined) {
  if (value == null) return '—';

  return `₹${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

function fmtDate(date?: string) {
  if (!date) return '';

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusStyle(status?: string) {
  const value = (status || '').toLowerCase();

  if (
    value === 'completed' ||
    value === 'paid' ||
    value === 'confirmed'
  ) {
    return {
      backgroundColor: '#dcfce7',
      color: '#15803d',
    };
  }

  if (
    value === 'pending' ||
    value === 'quoted' ||
    value === 'matched'
  ) {
    return {
      backgroundColor: '#fef3c7',
      color: '#b45309',
    };
  }

  if (
    value === 'cancelled' ||
    value === 'rejected'
  ) {
    return {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
    };
  }

  return {
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
  };
}

export default function CollectorDashboard() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);

  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [loadingLots, setLoadingLots] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadDashboard(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      setError('');

      const storedCollectorId = await currentCollectorId();

      const collectorId =
        storedCollectorId ?? DEMO_COLLECTOR_ID;

      const results = await Promise.allSettled([
        getEarningsSummary(collectorId),
        getLotsByCollector(collectorId),
      ]);

      const earningsResult = results[0];
      const lotsResult = results[1];

      if (earningsResult.status === 'fulfilled') {
        setEarnings(earningsResult.value?.data ?? null);
      } else {
        setError(
          'Could not load all dashboard information. Please check your connection.'
        );
      }

      if (lotsResult.status === 'fulfilled') {
        const data = lotsResult.value?.data;

        setLots(
          Array.isArray(data)
            ? data.slice(0, 6)
            : []
        );
      }
    } catch (err) {
      console.error('Dashboard load error:', err);

      setError(
        'Unable to connect to the backend. Please try again.'
      );
    } finally {
      setLoadingEarnings(false);
      setLoadingLots(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function comingSoon(feature: string) {
    Alert.alert(
      feature,
      'This screen will be migrated next.'
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
          onRefresh={() => loadDashboard(true)}
        />
      }
    >
      {/* Header */}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Collector Dashboard
          </Text>

          <Text style={styles.subtitle}>
            Manage your e-waste lots and earnings
          </Text>
        </View>

        <Pressable
          style={styles.createButton}
          onPress={() =>
            router.push('/collector/create-lot')
          }
        >
          <Text style={styles.createButtonText}>
            + Create New Lot
          </Text>
        </Pressable>
      </View>

      {/* Error */}

      {error ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>
            ⚠️
          </Text>

          <Text style={styles.warningText}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* Earnings */}

      <Text style={styles.sectionTitle}>
        Earnings
      </Text>

      {loadingEarnings ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="large"
            color="#16a34a"
          />

          <Text style={styles.loadingText}>
            Loading earnings...
          </Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard
            icon="₹"
            label="Total Earned"
            value={fmt(earnings?.total_earned)}
            sub="All time"
          />

          <StatCard
            icon="✓"
            label="Paid Out"
            value={fmt(earnings?.total_paid)}
            sub="Completed"
          />

          <StatCard
            icon="⏳"
            label="Pending"
            value={fmt(earnings?.total_pending)}
            sub="Pending payment"
          />

          <StatCard
            icon="📦"
            label="Total Lots"
            value={
              earnings?.total_transactions?.toString() ??
              '—'
            }
            sub="Created so far"
          />
        </View>
      )}

      {/* Quick Actions */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionsGrid}>
          <QuickAction
            icon="➕"
            label="Create Lot"
            description="Add new e-waste"
            onPress={() =>
              router.push('/collector/create-lot')
            }
          />

          <QuickAction
            icon="₹"
            label="Price Board"
            description="Check market prices"
            onPress={() =>
              comingSoon('Price Board')
            }
          />

          <QuickAction
            icon="♻️"
            label="Find Recyclers"
            description="View matched recyclers"
            onPress={() =>
              comingSoon('Find Recyclers')
            }
          />

          <QuickAction
            icon="💰"
            label="Earnings Ledger"
            description="View payment history"
            onPress={() =>
              comingSoon('Earnings Ledger')
            }
          />

          <QuickAction
            icon="🛡️"
            label="Safety Guidance"
            description="Safe e-waste handling"
            onPress={() =>
              comingSoon('Safety Guidance')
            }
          />
        </View>
      </View>

      {/* Recent Lots */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Recent Lots
        </Text>

        {loadingLots ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color="#16a34a"
            />

            <Text style={styles.loadingText}>
              Loading lots...
            </Text>
          </View>
        ) : lots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              No lots yet
            </Text>

            <Text style={styles.emptyDescription}>
              Create your first e-waste lot to get
              started.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() =>
                comingSoon('Create Lot')
              }
            >
              <Text style={styles.emptyButtonText}>
                Create First Lot
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.lotsList}>
            {lots.map((lot) => (
              <LotRow
                key={String(lot.lot_id)}
                lot={lot}
                onPress={() =>
                  comingSoon(
                    `Lot ${lot.lot_id}`
                  )
                }
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

/* -------------------------
   STAT CARD
-------------------------- */

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <View style={styles.statIcon}>
          <Text style={styles.statIconText}>
            {icon}
          </Text>
        </View>
      </View>

      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statSub}>
        {sub}
      </Text>
    </View>
  );
}

/* -------------------------
   QUICK ACTION
-------------------------- */

function QuickAction({
  icon,
  label,
  description,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.quickActionPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.quickActionIcon}>
        {icon}
      </Text>

      <Text style={styles.quickActionLabel}>
        {label}
      </Text>

      <Text
        style={styles.quickActionDescription}
        numberOfLines={2}
      >
        {description}
      </Text>
    </Pressable>
  );
}

/* -------------------------
   LOT ROW
-------------------------- */

function LotRow({
  lot,
  onPress,
}: {
  lot: Lot;
  onPress: () => void;
}) {
  const status =
    lot.transaction_status ||
    lot.payment_status ||
    'quoted';

  const statusStyle =
    getStatusStyle(status);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.lotRow,
        pressed && styles.lotRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>
          ♻️
        </Text>
      </View>

      <View style={styles.lotInfo}>
        <Text style={styles.lotId}>
          {lot.lot_id}
        </Text>

        <Text
          style={styles.lotCategory}
          numberOfLines={1}
        >
          {lot.category || 'E-Waste'}
        </Text>

        <Text style={styles.lotMeta}>
          {lot.approx_weight_kg ??
            lot.weight_kg ??
            '?'}{' '}
          kg
          {lot.created_at
            ? ` • ${fmtDate(lot.created_at)}`
            : ''}
        </Text>
      </View>

      <View style={styles.lotRight}>
        <Text style={styles.lotValue}>
          {fmt(lot.estimated_value)}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusStyle.backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusStyle.color,
              },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      <Text style={styles.chevron}>
        ›
      </Text>
    </Pressable>
  );
}

/* -------------------------
   STYLES
-------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 24,
  },

  header: {
    marginBottom: 28,
  },

  headerText: {
    marginBottom: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 15,
    color: '#6b7280',
  },

  createButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },

  createButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    marginBottom: 22,
  },

  warningIcon: {
    fontSize: 18,
  },

  warningText: {
    flex: 1,
    color: '#b45309',
    fontSize: 13,
    fontWeight: '500',
  },

  section: {
    marginTop: 30,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },

  loadingBox: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 13,
  },

  /* Stats */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,

    elevation: 2,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  statIconText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#15803d',
  },

  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  statValue: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  statSub: {
    marginTop: 4,
    fontSize: 11,
    color: '#9ca3af',
  },

  /* Quick actions */

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  quickAction: {
    width: '31%',
    minHeight: 125,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickActionPressed: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },

  quickActionIcon: {
    fontSize: 25,
    marginBottom: 8,
  },

  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },

  quickActionDescription: {
    marginTop: 5,
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },

  /* Empty */

  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  emptyDescription: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Lots */

  lotsList: {
    gap: 10,
  },

  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 15,
    padding: 14,

    elevation: 1,

    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  lotRowPressed: {
    backgroundColor: '#f9fafb',
  },

  categoryBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  categoryBadgeText: {
    fontSize: 21,
  },

  lotInfo: {
    flex: 1,
  },

  lotId: {
    fontSize: 10,
    color: '#9ca3af',
  },

  lotCategory: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  lotMeta: {
    marginTop: 4,
    fontSize: 10,
    color: '#6b7280',
  },

  lotRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  lotValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 5,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  chevron: {
    marginLeft: 7,
    color: '#9ca3af',
    fontSize: 23,
  },

  bottomSpace: {
    height: 50,
  },
});