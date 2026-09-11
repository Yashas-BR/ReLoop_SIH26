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
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAvailableLots } from '../../api/client';
import { useAuth } from '../../services/auth';
import { useTranslation } from '../../../i18n/config';
import { LanguageSelector } from '../../components/LanguageSelector';
import type { RecyclerIncomingLot } from '../../types/recycler-lot';

export default function IncomingLotsScreen() {
  const { recyclerId } = useAuth();
  const { t } = useTranslation();

  const [lots, setLots] = useState<RecyclerIncomingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchLots = useCallback(async () => {
    if (!recyclerId) return;
    try {
      const response = await getAvailableLots(recyclerId);
      setLots(response.data || []);
      setError('');
    } catch (err) {
      console.error('[IncomingLots] Error loading lots:', err);
      setError(t('recyclerLot.loadError') || 'Failed to load lots');
    }
  }, [recyclerId, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLots();
    setRefreshing(false);
  }, [fetchLots]);

  useEffect(() => {
    setLoading(true);
    fetchLots().finally(() => setLoading(false));
  }, [fetchLots]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    lots.forEach(lot => {
      const c = lot.category ?? lot.material_category;
      if (c) cats.add(c);
    });
    return Array.from(cats).sort();
  }, [lots]);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const category = lot.category ?? lot.material_category ?? '';
      if (selectedCategory && category !== selectedCategory) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const lotIdStr = String(lot.lot_id).toLowerCase();
        const locStr = (lot.location ?? lot.collection_location ?? '').toLowerCase();
        const catStr = category.toLowerCase();
        if (
          !lotIdStr.includes(query) &&
          !locStr.includes(query) &&
          !catStr.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [lots, selectedCategory, searchQuery]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t('recyclerLot.incomingLots') || 'Incoming Lots'}</Text>
          <LanguageSelector />
        </View>
        <Text style={styles.headerSubtitle}>
          {t('recyclerLot.incomingLotsDesc') || 'Lots available for quoting'}
        </Text>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search') || 'Search...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#99A69F"
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
          <Pressable
            style={[styles.categoryPill, !selectedCategory && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
              {t('common.all') || 'All'}
            </Text>
          </Pressable>
          {availableCategories.map(cat => (
            <Pressable
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16794B" />
          <Text style={styles.centerText}>{t('common.loading') || 'Loading...'}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchLots}>
            <Text style={styles.retryText}>{t('common.retry') || 'Retry'}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredLots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t('recyclerLot.noLots') || 'No Lots Found'}</Text>
              <Text style={styles.emptyDesc}>
                {t('recyclerLot.noLotsDesc') || 'There are no incoming lots matching your criteria.'}
              </Text>
            </View>
          ) : (
            filteredLots.map(lot => (
              <LotCard key={lot.lot_id} lot={lot} t={t} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function LotCard({ lot, t }: { lot: RecyclerIncomingLot; t: any }) {
  const category = lot.category ?? lot.material_category ?? '—';
  const location = lot.location ?? lot.collection_location ?? '—';
  const weight = lot.approx_weight_kg ? `${lot.approx_weight_kg} ${t('common.kg') || 'kg'}` : '—';
  
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/recycler/lot/${lot.lot_id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardCategory}>{category}</Text>
        <Text style={styles.cardLotId}>#{lot.lot_id}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>{t('recyclerLot.weight') || 'Weight'}</Text>
          <Text style={styles.cardValue}>{weight}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>{t('recyclerLot.location') || 'Location'}</Text>
          <Text style={styles.cardValue}>{location}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#173D2D',
  },
  headerSubtitle: {
    marginTop: 5,
    fontSize: 15,
    color: '#68756D',
  },
  filters: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#173D2D',
    borderWidth: 1,
    borderColor: '#E5EBE7',
  },
  categoryScroll: {
    marginTop: 15,
    maxHeight: 40,
  },
  categoryScrollContent: {
    alignItems: 'center',
    paddingRight: 20,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5EBE7',
  },
  categoryPillActive: {
    backgroundColor: '#16794B',
    borderColor: '#16794B',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#68756D',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centerText: {
    marginTop: 10,
    color: '#718078',
    fontSize: 15,
  },
  errorText: {
    color: '#D93B3B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#16794B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173D2D',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#68756D',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F2',
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: '800',
    color: '#173D2D',
  },
  cardLotId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16794B',
    backgroundColor: '#E8F3EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBody: {
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 13,
    color: '#78877F',
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 14,
    color: '#173D2D',
    fontWeight: '700',
  },
});
