import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LanguageSelector } from '../../components/LanguageSelector';
import { AppLogo } from '../../components/branding/AppLogo';
import { useTranslation } from '../../../i18n/config';

export default function RecyclerMapScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <View style={styles.mapFallback}>
        <Text style={styles.fallbackText}>Maps are not supported on Web. Please use Expo Go on your mobile device.</Text>
      </View>

      <View style={styles.logoOverlay}>
        <AppLogo size="small" />
      </View>

      <View style={styles.topPanel}>
        <LanguageSelector />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← {t('common.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('recyclerMap.title')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EDF1EF' },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fallbackText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#55645C',
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
});
