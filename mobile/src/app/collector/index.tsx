import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getEarningsSummary,
  getLotsByCollector,
} from '../../../api/client';

import { useTranslation } from '../../../i18n/config';
import { currentCollectorId } from '../../../services/auth';
import { BrandedHeader } from '../../components/branding/BrandedHeader';

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

/* --------------------------------
   CURRENCY
-------------------------------- */

function fmt(value: number | null | undefined) {
  if (value == null) return '—';

  return `₹${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/* --------------------------------
   DATE
-------------------------------- */

function fmtDate(date?: string, lang = 'en') {
  if (!date) return '';

  const localeMap: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
    kn: 'kn-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    ml: 'ml-IN',
    bn: 'bn-IN',
  };

  return new Date(date).toLocaleDateString(
    localeMap[lang] || 'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

/* --------------------------------
   STATUS STYLE
-------------------------------- */

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

/* --------------------------------
   DASHBOARD
-------------------------------- */

export default function CollectorDashboard() {
  const { t, lang } = useTranslation();

  const [earnings, setEarnings] =
    useState<Earnings | null>(null);

  const [lots, setLots] =
    useState<Lot[]>([]);

  const [loadingEarnings, setLoadingEarnings] =
    useState(true);

  const [loadingLots, setLoadingLots] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState(false);

  async function loadDashboard(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      setError(false);

      const storedCollectorId =
        await currentCollectorId();

      const collectorId = storedCollectorId;
      if (!collectorId) {
        router.replace('/login/collector');
        return;
      }

      const results =
        await Promise.allSettled([
          getEarningsSummary(collectorId),
          getLotsByCollector(collectorId),
        ]);

      const earningsResult = results[0];
      const lotsResult = results[1];

      if (earningsResult.status === 'fulfilled') {
        setEarnings(
          earningsResult.value?.data ?? null
        );
      } else {
        setError(true);
      }

      if (lotsResult.status === 'fulfilled') {
        const data = lotsResult.value?.data;

        setLots(
          Array.isArray(data)
            ? data.slice(0, 6)
            : []
        );
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(
        'Dashboard load error:',
        err
      );

      setError(true);
    } finally {
      setLoadingEarnings(false);
      setLoadingLots(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() =>
            loadDashboard(true)
          }
        />
      }
    >
      {/* HEADER */}

      <BrandedHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        rightElement={
          <Pressable
            style={styles.createButton}
            onPress={() =>
              router.push(
                '/collector/create-lot'
              )
            }
          >
            <Text
              style={styles.createButtonText}
            >
              + {t('dashboard.createNewLot')}
            </Text>
          </Pressable>
        }
      />

      {/* ERROR */}

      {error ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>
            ⚠️
          </Text>

          <Text style={styles.warningText}>
            {t('dashboard.backendError')}
          </Text>
        </View>
      ) : null}

      {/* EARNINGS */}

      <Text style={styles.sectionTitle}>
        {t('dashboard.earnings')}
      </Text>

      {loadingEarnings ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="large"
            color="#16a34a"
          />

          <Text style={styles.loadingText}>
            {t('common.loading')}
          </Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard
            icon="₹"
            label={t(
              'dashboard.totalEarned'
            )}
            value={fmt(
              earnings?.total_earned
            )}
            sub={t('common.allTime')}
          />

          <StatCard
            icon="✓"
            label={t(
              'dashboard.paidOut'
            )}
            value={fmt(
              earnings?.total_paid
            )}
            sub={t('common.completed')}
          />

          <StatCard
            icon="⏳"
            label={t(
              'dashboard.pending'
            )}
            value={fmt(
              earnings?.total_pending
            )}
            sub={t(
              'common.pendingPayment'
            )}
          />

          <StatCard
            icon="📦"
            label={t(
              'dashboard.totalLots'
            )}
            value={
              earnings?.total_transactions?.toString() ??
              '—'
            }
            sub={t(
              'common.createdSoFar'
            )}
          />
        </View>
      )}

      {/* QUICK ACTIONS */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('dashboard.quickActions')}
        </Text>

        <View style={styles.actionsGrid}>
          <QuickAction
            icon="➕"
            label={t(
              'dashboard.createLot'
            )}
            description={t(
              'dashboard.createLotDesc'
            )}
            onPress={() =>
              router.push(
                '/collector/create-lot'
              )
            }
          />

          <QuickAction
            icon="₹"
            label={t(
              'dashboard.priceBoard'
            )}
            description={t(
              'dashboard.priceBoardDesc'
            )}
            onPress={() =>
              router.push(
                '/collector/price-discovery'
              )
            }
          />

          <QuickAction
            icon="♻️"
            label={t(
              'dashboard.findRecyclers'
            )}
            description={t(
              'dashboard.findRecyclersDesc'
            )}
            onPress={() =>
              router.push(
                '/collector/find-recyclers'
              )
            }
          />

          <QuickAction
            icon="💰"
            label={t(
              'dashboard.earningsLedger'
            )}
            description={t(
              'dashboard.earningsLedgerDesc'
            )}
            onPress={() =>
              router.push(
                '/collector/earnings'
              )
            }
          />

          <QuickAction
            icon="🛡️"
            label={t(
              'dashboard.safetyGuidance'
            )}
            description={t(
              'dashboard.safetyGuidanceDesc'
            )}
            onPress={() =>
              router.push(
                '/collector/safety'
              )
            }
          />
        </View>
      </View>

      {/* RECENT LOTS */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('dashboard.recentLots')}
        </Text>

        {loadingLots ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color="#16a34a"
            />

            <Text style={styles.loadingText}>
              {t('common.loading')}
            </Text>
          </View>
        ) : lots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              {t('dashboard.noLots')}
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              {t('dashboard.noLotsDesc')}
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() =>
                router.push(
                  '/collector/create-lot'
                )
              }
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                {t(
                  'dashboard.createFirstLot'
                )}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.lotsList}>
            {lots.map((lot) => (
              <LotRow
                key={String(
                  lot.lot_id
                )}
                lot={lot}
                lang={lang}
                t={t}
                onPress={() =>
                  router.push({
                    pathname:
                      '/collector/lots/[lotId]',
                    params: {
                      lotId: String(
                        lot.lot_id
                      ),
                    },
                  })
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

/* --------------------------------
   STAT CARD
-------------------------------- */

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
          <Text
            style={styles.statIconText}
          >
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

/* --------------------------------
   QUICK ACTION
-------------------------------- */

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
        pressed &&
        styles.quickActionPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={styles.quickActionIcon}
      >
        {icon}
      </Text>

      <Text
        style={styles.quickActionLabel}
      >
        {label}
      </Text>

      <Text
        style={
          styles.quickActionDescription
        }
        numberOfLines={2}
      >
        {description}
      </Text>
    </Pressable>
  );
}

/* --------------------------------
   LOT ROW
-------------------------------- */

function LotRow({
  lot,
  onPress,
  t,
  lang,
}: {
  lot: Lot;
  onPress: () => void;
  t: (key: string) => string;
  lang: string;
}) {
  const status =
    lot.transaction_status ||
    lot.payment_status ||
    'quoted';

  const normalizedStatus =
    status.toLowerCase();

  const statusStyle =
    getStatusStyle(status);

  function translatedStatus() {
    /*
      "completed" does not exist inside
      status.* in the provided JSON.
    */

    if (
      normalizedStatus === 'completed'
    ) {
      return t('common.completed');
    }

    return t(
      `status.${normalizedStatus}`
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.lotRow,
        pressed &&
        styles.lotRowPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={styles.categoryBadge}
      >
        <Text
          style={
            styles.categoryBadgeText
          }
        >
          ♻️
        </Text>
      </View>

      <View style={styles.lotInfo}>
        <Text style={styles.lotId}>
          {t('dashboard.lotId')}:{' '}
          {lot.lot_id}
        </Text>

        <Text
          style={styles.lotCategory}
          numberOfLines={1}
        >
          {lot.category || '—'}
        </Text>

        <Text style={styles.lotMeta}>
          {lot.approx_weight_kg ??
            lot.weight_kg ??
            '?'}{' '}
          {t('common.kg')}

          {lot.created_at
            ? ` • ${fmtDate(
              lot.created_at,
              lang
            )}`
            : ''}
        </Text>
      </View>

      <View style={styles.lotRight}>
        <Text style={styles.lotValue}>
          {fmt(
            lot.estimated_value
          )}
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
                color:
                  statusStyle.color,
              },
            ]}
          >
            {translatedStatus()}
          </Text>
        </View>
      </View>

      <Text style={styles.chevron}>
        ›
      </Text>
    </Pressable>
  );
}

/* --------------------------------
   STYLES
-------------------------------- */

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