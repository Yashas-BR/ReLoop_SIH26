import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from '../../../i18n/config';
import { AppLogo } from '../branding/AppLogo';
import type { Recycler } from '../../app/collector/matched-recyclers';
import { hasValidCoordinates, toFiniteNumber } from '../../utils/coordinates';
import { LeafletMap, MapMarker } from '../LeafletMap';

const DEFAULT_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

interface MatchedRecyclersMapProps {
  recyclers: Recycler[];
  selectedRecyclerId: number | null;
  onRecyclerPress: (id: number) => void;
  currentLat: number | null;
  currentLng: number | null;
}

export function MatchedRecyclersMap({
  recyclers,
  selectedRecyclerId,
  onRecyclerPress,
  currentLat,
  currentLng,
}: MatchedRecyclersMapProps) {
  const { t } = useTranslation();

  const validRecyclers = recyclers.filter((rec) => hasValidCoordinates(rec));

  const validMarkers: MapMarker[] = validRecyclers
    .map((rec) => {
      const id = rec.id ?? rec.recycler_id;
      const lng = toFiniteNumber(rec.longitude);
      const lat = toFiniteNumber(rec.latitude);
      if (!id || lng === null || lat === null) return null;
      return {
        id,
        latitude: lat,
        longitude: lng,
        title: rec.name,
        selected: selectedRecyclerId === id,
      };
    })
    .filter(Boolean) as MapMarker[];

  if (validMarkers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>{t('matchedRecyclers.noMapRecyclers')}</Text>
      </View>
    );
  }

  // Determine a safe fallback center 
  const center = currentLat !== null && currentLng !== null 
    ? { latitude: currentLat, longitude: currentLng }
    : validMarkers.length > 0 
    ? { latitude: validMarkers[0].latitude, longitude: validMarkers[0].longitude }
    : DEFAULT_CENTER;

  return (
    <View style={styles.container}>
      <View style={styles.logoOverlay}>
        <AppLogo size="small" />
      </View>

      <LeafletMap 
        style={styles.map}
        center={center}
        markers={validMarkers}
        onMarkerPress={(id) => onRecyclerPress(Number(id))}
        fitToMarkers={true}
      />

      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>{t('matchedRecyclers.tapMarker')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 450,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: '#EDF1EF',
  },
  map: { flex: 1 },
  emptyContainer: {
    height: 400,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#EDF1EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    padding: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontSize: 16,
    color: '#55645C',
    textAlign: 'center',
    fontWeight: '600',
  },
  tipContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFFEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tipText: { color: '#173D2D' },
  logoOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
});
