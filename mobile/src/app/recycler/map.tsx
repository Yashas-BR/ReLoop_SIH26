import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MapView, {
  Marker,
  type Region,
} from 'react-native-maps';

import {
  router,
} from 'expo-router';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getCurrentCoordinates,
  LocationPermissionError,
} from '../../services/location';

import { LanguageSelector } from '../../components/LanguageSelector';

import { useAuth } from '../../services/auth';

import type {
  AppCoordinates,
} from '../../types/device';

import {
  useTranslation,
} from '../../../i18n/config';

const DEFAULT_REGION: Region = {
  latitude: 12.9716,

  longitude: 77.5946,

  latitudeDelta: 0.1,

  longitudeDelta: 0.1,
};

export default function RecyclerMapScreen() {
  const {
    recycler,
  } = useAuth();

  const {
    t,
  } =
    useTranslation();

  const mapRef =
    useRef<MapView | null>(
      null,
    );

  const [
    currentLocation,
    setCurrentLocation,
  ] =
    useState<AppCoordinates | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    void loadLocation();
  }, []);

  async function loadLocation() {
    setLoading(true);
    setError('');

    try {
      const coordinates =
        await getCurrentCoordinates();

      setCurrentLocation(
        coordinates,
      );

      mapRef.current?.animateToRegion(
        {
          ...coordinates,

          latitudeDelta:
            0.04,

          longitudeDelta:
            0.04,
        },

        500,
      );
    } catch (loadError) {
      console.warn(
        '[RecyclerMap]',
        loadError,
      );

      if (
        loadError instanceof
        LocationPermissionError
      ) {
        setError(
          t(
            'recyclerMap.permissionDenied',
          ),
        );
      } else {
        setError(
          t(
            'recyclerMap.locationError',
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const recyclerCoordinates =
    recycler?.latitude != null &&
      recycler?.longitude != null
      ? {
        latitude:
          Number(
            recycler.latitude,
          ),

        longitude:
          Number(
            recycler.longitude,
          ),
      }
      : null;

  const initialRegion: Region =
    recyclerCoordinates
      ? {
        ...recyclerCoordinates,

        latitudeDelta:
          0.08,

        longitudeDelta:
          0.08,
      }
      : DEFAULT_REGION;

  return (
    <View
      style={
        styles.screen
      }
    >
      <MapView
        ref={mapRef}
        style={
          StyleSheet.absoluteFill
        }
        initialRegion={
          initialRegion
        }
        showsUserLocation={
          Boolean(
            currentLocation,
          )
        }
        showsMyLocationButton={
          true
        }
      >
        {recyclerCoordinates && (
          <Marker
            coordinate={
              recyclerCoordinates
            }
            title={
              recycler?.name ??
              t(
                'recyclerMap.recycler',
              )
            }
            description={
              recycler?.facility_location ??
              undefined
            }
          />
        )}
      </MapView>

      <View
        style={
          styles.topPanel
        }
      >
        <LanguageSelector />

        <View
          style={
            styles.headerRow
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.back
              }
            >
              ←{' '}
              {t(
                'common.back',
              )}
            </Text>
          </Pressable>

          <Text
            style={
              styles.title
            }
          >
            {t(
              'recyclerMap.title',
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.bottomPanel
        }
      >
        {!!error && (
          <Text
            style={
              styles.error
            }
          >
            {error}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator />
        ) : (
          <Pressable
            onPress={() =>
              void loadLocation()
            }
            style={
              styles.locationButton
            }
          >
            <Text
              style={
                styles.locationButtonText
              }
            >
              {t(
                'recyclerMap.myLocation',
              )}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    topPanel: {
      position:
        'absolute',

      top: 45,

      left: 16,

      right: 16,

      padding: 14,

      borderRadius: 18,

      backgroundColor:
        'rgba(255,255,255,0.95)',
    },

    headerRow: {
      marginTop: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    back: {
      fontWeight: '800',

      color: '#16794B',
    },

    title: {
      fontSize: 18,

      fontWeight: '900',

      color: '#173D2D',
    },

    bottomPanel: {
      position:
        'absolute',

      left: 16,

      right: 16,

      bottom: 30,

      padding: 15,

      borderRadius: 18,

      backgroundColor:
        '#FFFFFF',
    },

    error: {
      marginBottom: 10,

      color: '#AA352D',

      fontWeight: '700',
    },

    locationButton: {
      minHeight: 50,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 14,

      backgroundColor:
        '#16794B',
    },

    locationButtonText: {
      fontWeight: '900',

      color: '#FFFFFF',
    },
  });