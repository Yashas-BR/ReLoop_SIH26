import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from '../../../i18n/config';
import { AppLogo } from '../branding/AppLogo';

export function MatchedRecyclersMap() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.logoOverlay}>
        <AppLogo size="small" />
      </View>

      <View style={styles.fallbackContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.fallbackText}>Maps are not supported on Web. Please use Expo Go on your mobile device.</Text>
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
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  fallbackText: {
    fontSize: 16,
    color: '#55645C',
    textAlign: 'center',
    fontWeight: '600',
  },
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
