import * as Location from 'expo-location';

import type {
  AppCoordinates,
} from '../types/device';

export class LocationPermissionError extends Error {
  constructor() {
    super(
      'Location permission denied',
    );

    this.name =
      'LocationPermissionError';
  }
}

export async function getCurrentCoordinates(): Promise<AppCoordinates> {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (
    permission.status !==
    'granted'
  ) {
    throw new LocationPermissionError();
  }

  const lastKnown =
    await Location.getLastKnownPositionAsync({
      maxAge: 60_000,
      requiredAccuracy: 500,
    });

  if (lastKnown) {
    return {
      latitude:
        lastKnown.coords
          .latitude,

      longitude:
        lastKnown.coords
          .longitude,
    };
  }

  const current =
    await Location.getCurrentPositionAsync({
      accuracy:
        Location.Accuracy.Balanced,
    });

  return {
    latitude:
      current.coords
        .latitude,

    longitude:
      current.coords
        .longitude,
  };
}