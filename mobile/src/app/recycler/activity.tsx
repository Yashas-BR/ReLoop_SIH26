import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getLotsByRecycler } from '../../api/client';

import { LanguageSelector } from '../../components/LanguageSelector';

import { RecyclerActivityCard } from '../../components/recycler/RecyclerActivityCard';

import { useAuth } from '../../services/auth';

import type { RecyclerActivityLot } from '../../types/recycler-activity';

import { useTranslation } from '../../../i18n/config';

type ActivityFilter =
  | 'all'
  | 'matched'
  | 'confirmed'
  | 'handed_over';

export default function RecyclerActivityScreen() {
  const { recyclerId } = useAuth();

  const { t } = useTranslation();

  const [lots, setLots] =
    useState<RecyclerActivityLot[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<ActivityFilter>('all');

  const loadActivity = useCallback(
    async (refresh = false) => {
      if (!recyclerId) {
        return;
      }

      refresh
        ? setRefreshing(true)
        : setLoading(true);

      setError('');

      try {
        const response =
          await getLotsByRecycler(
            recyclerId,
          );

        setLots(
          Array.isArray(response.data)
            ? response.data
            : [],
        );
      } catch (loadError) {
        console.error(
          '[RecyclerActivity]',
          loadError,
        );

        setError(
          t(
            'recyclerActivity.loadError',
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [recyclerId, t],
  );

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const filteredLots =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return lots.filter(lot => {
        const status =
          lot.transaction_status ??
          '';

        const location =
          lot.location ??
          lot.collection_location ??
          '';

        const category =
          lot.category ?? '';

        const matchesStatus =
          filter === 'all' ||
          status === filter;

        const matchesSearch =
          !query ||
          String(lot.lot_id)
            .toLowerCase()
            .includes(query) ||
          category
            .toLowerCase()
            .includes(query) ||
          location
            .toLowerCase()
            .includes(query) ||
          String(
            lot.handover_reference_number ??
              '',
          )
            .toLowerCase()
            .includes(query);

        return (
          matchesStatus &&
          matchesSearch
        );
      });
    }, [
      lots,
      filter,
      search,
    ]);

  const filters: ActivityFilter[] = [
    'all',
    'matched',
    'confirmed',
    'handed_over',
  ];

  function getFilterLabel(
    value: ActivityFilter,
  ) {
    switch (value) {
      case 'matched':
        return t(
          'recyclerActivity.matched',
        );

      case 'confirmed':
        return t(
          'recyclerActivity.confirmed',
        );

      case 'handed_over':
        return t(
          'recyclerActivity.handedOver',
        );

      default:
        return t(
          'common.all',
        );
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() =>
            void loadActivity(true)
          }
        />
      }
    >
      <LanguageSelector />

      <Pressable
        onPress={() =>
          router.back()
        }
      >
        <Text style={styles.back}>
          ← {t('common.back')}
        </Text>
      </Pressable>

      <Text style={styles.title}>
        {t(
          'recyclerActivity.title',
        )}
      </Text>

      <Text style={styles.subtitle}>
        {t(
          'recyclerActivity.subtitle',
        )}
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t(
          'recyclerActivity.search',
        )}
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filters
        }
      >
        {filters.map(value => {
          const selected =
            value === filter;

          return (
            <Pressable
              key={value}
              onPress={() =>
                setFilter(value)
              }
              style={[
                styles.filter,
                selected &&
                  styles.filterSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterText,

                  selected &&
                    styles.filterTextSelected,
                ]}
              >
                {getFilterLabel(
                  value,
                )}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.count}>
        {filteredLots.length}{' '}
        {t(
          'recyclerActivity.records',
        )}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
          />

          <Text
            style={styles.centerText}
          >
            {t('common.loading')}
          </Text>
        </View>
      ) : error ? (
        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>

          <Pressable
            onPress={() =>
              void loadActivity()
            }
          >
            <Text style={styles.retry}>
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      ) : filteredLots.length ===
        0 ? (
        <View style={styles.empty}>
          <Text
            style={styles.emptyTitle}
          >
            {t(
              'recyclerActivity.empty',
            )}
          </Text>

          <Text
            style={styles.emptyText}
          >
            {t(
              'recyclerActivity.emptyDesc',
            )}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredLots.map(lot => (
            <RecyclerActivityCard
              key={lot.lot_id}
              lot={lot}
              kgLabel={t(
                'common.kg',
              )}
              onPress={() =>
                router.push({
                  pathname:
                    '/recycler/history/[id]',

                  params: {
                    id: lot.lot_id,
                  },
                } as any)
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
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

    back: {
      marginTop: 20,

      fontWeight: '800',

      color: '#16794B',
    },

    title: {
      marginTop: 20,

      fontSize: 30,

      fontWeight: '900',

      color: '#173D2D',
    },

    subtitle: {
      marginTop: 6,

      lineHeight: 21,

      color: '#718078',
    },

    search: {
      marginTop: 20,

      minHeight: 52,

      paddingHorizontal: 15,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        '#DDE5E0',

      backgroundColor:
        '#FFFFFF',

      color: '#173D2D',
    },

    filters: {
      paddingVertical: 15,

      gap: 8,
    },

    filter: {
      paddingHorizontal: 15,

      paddingVertical: 9,

      borderRadius: 999,

      borderWidth: 1,

      borderColor:
        '#D7E0DA',

      backgroundColor:
        '#FFFFFF',
    },

    filterSelected: {
      borderColor:
        '#16794B',

      backgroundColor:
        '#16794B',
    },

    filterText: {
      fontWeight: '700',

      color: '#637269',
    },

    filterTextSelected: {
      color: '#FFFFFF',
    },

    count: {
      marginBottom: 12,

      fontSize: 13,

      fontWeight: '700',

      color: '#74827A',
    },

    list: {
      gap: 12,
    },

    center: {
      paddingVertical: 50,

      alignItems: 'center',
    },

    centerText: {
      marginTop: 10,

      color: '#718078',
    },

    errorCard: {
      padding: 18,

      borderRadius: 16,

      backgroundColor:
        '#FFF0EE',
    },

    errorText: {
      color: '#AA352D',

      fontWeight: '700',
    },

    retry: {
      marginTop: 10,

      fontWeight: '900',

      color: '#16794B',
    },

    empty: {
      padding: 35,

      alignItems: 'center',

      borderRadius: 18,

      backgroundColor:
        '#FFFFFF',
    },

    emptyTitle: {
      fontSize: 18,

      fontWeight: '900',

      color: '#173D2D',
    },

    emptyText: {
      marginTop: 7,

      textAlign: 'center',

      lineHeight: 20,

      color: '#718078',
    },
  });
