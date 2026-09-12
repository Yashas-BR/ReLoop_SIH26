import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useTranslation } from '../../../i18n/config';
import type { Recycler } from '../../app/collector/matched-recyclers';
import { hasValidCoordinates, toFiniteCoordinate } from '../../utils/coordinates';

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
  const mapRef = useRef<MapView>(null);

  const validRecyclers = recyclers.filter(hasValidCoordinates);

  useEffect(() => {
    if (validRecyclers.length === 0) return;

    if (validRecyclers.length === 1) {
      const rec = validRecyclers[0];
      const lat = toFiniteCoordinate(rec.latitude)!;
      const lng = toFiniteCoordinate(rec.longitude)!;
      
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    } else {
      const coordinates = validRecyclers.map((rec) => ({
        latitude: toFiniteCoordinate(rec.latitude)!,
        longitude: toFiniteCoordinate(rec.longitude)!,
      }));
      
      if (currentLat != null && currentLng != null) {
        coordinates.push({ latitude: currentLat, longitude: currentLng });
      }

      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [validRecyclers, currentLat, currentLng]);

  if (validRecyclers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>{t('matchedRecyclers.noMapRecyclers')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {validRecyclers.map((recycler) => {
          const id = recycler.id ?? recycler.recycler_id;
          if (!id) return null;
          
          const lat = toFiniteCoordinate(recycler.latitude)!;
          const lng = toFiniteCoordinate(recycler.longitude)!;
          
          return (
            <Marker
              key={`recycler-${id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={recycler.name || t('matchedRecyclers.facility')}
              description={recycler.service_area || recycler.facility_location || undefined}
              pinColor={selectedRecyclerId === id ? '#16794B' : undefined}
              onCalloutPress={() => onRecyclerPress(id)}
            />
          );
        })}
      </MapView>
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173D2D',
  }
});
