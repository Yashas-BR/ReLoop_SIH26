import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { getCurrentCoordinates, LocationPermissionError } from '../../services/location';
import { LanguageSelector } from '../../components/LanguageSelector';
import { AppLogo } from '../../components/branding/AppLogo';
import { useAuth } from '../../services/auth';
import { useTranslation } from '../../../i18n/config';
import { hasValidCoordinates, toFiniteNumber } from '../../utils/coordinates';
import { LeafletMap, MapMarker } from '../../components/LeafletMap';

// Safe default center (Bengaluru)
const DEFAULT_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

export default function RecyclerMapScreen() {
  const { recycler } = useAuth();
  const { t } = useTranslation();

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadLocation();
  }, []);

  async function loadLocation() {
    setLoading(true);
    setError('');

    try {
      const coordinates = await getCurrentCoordinates();
      setCurrentLocation(coordinates);
    } catch (loadError) {
      console.warn('[RecyclerMap]', loadError);

      if (loadError instanceof LocationPermissionError) {
        setError(t('recyclerMap.permissionDenied'));
      } else {
        setError(t('recyclerMap.locationError'));
      }
    } finally {
      setLoading(false);
    }
  }

  // Validate coordinates for the marker
  const validMarker: MapMarker | null =
    hasValidCoordinates(recycler?.latitude, recycler?.longitude)
      ? {
          id: 'recycler',
          latitude: toFiniteNumber(recycler!.latitude)!,
          longitude: toFiniteNumber(recycler!.longitude)!,
          title: recycler?.name ?? t('recyclerMap.recycler'),
        }
      : null;

  // Determine center priority: User Location -> Recycler -> Default
  const center = currentLocation 
    ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
    : validMarker 
    ? { latitude: validMarker.latitude, longitude: validMarker.longitude }
    : DEFAULT_CENTER;

  const markers: MapMarker[] = [];
  
  if (validMarker) {
    markers.push(validMarker);
  } else {
    // If the recycler doesn't have coordinates, show a marker for the current location or default center
    // so the map isn't completely empty!
    markers.push({
      id: 'fallback',
      latitude: center.latitude,
      longitude: center.longitude,
      title: currentLocation ? t('recyclerMap.myLocation') : 'Bengaluru (Default)',
    });
  }

  return (
    <View style={styles.screen}>
      <LeafletMap 
        style={styles.map}
        center={center}
        zoom={14}
        markers={markers}
      />

      {/* Logo overlay */}
      <View style={styles.logoOverlay}>
        <AppLogo size="small" />
      </View>

      {/* Top panel */}
      <View style={styles.topPanel}>
        <LanguageSelector />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← {t('common.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('recyclerMap.title')}</Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {loading ? (
          <ActivityIndicator color="#16794B" />
        ) : (
          <Pressable
            onPress={() => void loadLocation()}
            style={styles.locationButton}
          >
            <Text style={styles.locationButtonText}>
              {t('recyclerMap.myLocation')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
  logoOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
  topPanel: {
    position: 'absolute',
    top: 45,
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  headerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontWeight: '800', color: '#16794B' },
  title: { fontSize: 18, fontWeight: '900', color: '#173D2D' },
  bottomPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 30,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  error: { marginBottom: 10, color: '#AA352D', fontWeight: '700' },
  locationButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#16794B',
  },
  locationButtonText: { fontWeight: '900', color: '#FFFFFF' },
});