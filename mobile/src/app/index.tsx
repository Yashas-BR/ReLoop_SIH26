import { router } from 'expo-router';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  LANG_OPTIONS,
  useTranslation,
} from '../../i18n/config';

import { AppLogo } from '../components/branding/AppLogo';

export default function LandingScreen() {
  const { t, lang, setLang } = useTranslation();

  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const spinAnim1 = useRef(new Animated.Value(0)).current;
  const spinAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse: 4s loop (circle 1)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    
    // Spin: 20s loop (circle 2)
    const spin1 = Animated.loop(
      Animated.timing(spinAnim1, { toValue: 1, duration: 20000, useNativeDriver: true })
    );

    // Spin Reverse: 30s loop (circle 3)
    const spin2 = Animated.loop(
      Animated.timing(spinAnim2, { toValue: 1, duration: 30000, useNativeDriver: true })
    );

    const makeFloat = (anim: Animated.Value) => Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );

    const f1 = makeFloat(floatAnim1);
    const f2 = makeFloat(floatAnim2);
    const f3 = makeFloat(floatAnim3);

    pulse.start();
    spin1.start();
    spin2.start();

    // Start with delays to offset the loop phases (like CSS animation-delay)
    f1.start();
    const t1 = setTimeout(() => { f3.start(); }, 500); // rupee (0.5s)
    const t2 = setTimeout(() => { f2.start(); }, 1000); // box (1s)

    return () => {
      pulse.stop();
      spin1.stop();
      spin2.stop();
      f1.stop();
      f2.stop();
      f3.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [floatAnim1, floatAnim2, floatAnim3, pulseAnim, spinAnim1, spinAnim2]);

  const spin1Interpolate = spinAnim1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2Interpolate = spinAnim2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const scaleInterpolate = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const opacityInterpolate = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.4] });

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      {/* LANGUAGE SELECTOR */}
      <View style={styles.languageWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.languageList}
        >
          {LANG_OPTIONS.map((option) => (
            <Pressable
              key={option.code}
              onPress={() => setLang(option.code)}
              style={[
                styles.languageButton,
                lang === option.code && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageText,
                  lang === option.code && styles.languageTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* HERO SECTION */}
      <View style={styles.hero}>
        <View style={styles.heroVisual}>
          {/* Animated Circles */}
          <Animated.View style={[styles.heroCircle3, { transform: [{ rotate: spin2Interpolate }] }]} />
          <Animated.View style={[styles.heroCircle2, { transform: [{ rotate: spin1Interpolate }] }]} />
          <Animated.View style={[styles.heroCircle1, { opacity: opacityInterpolate, transform: [{ scale: scaleInterpolate }] }]} />

          {/* Animated Floating Icons */}
          <Animated.Text style={[styles.heroIcon, styles.recyclerIcon, { transform: [{ translateY: floatAnim1 }] }]}>♻️</Animated.Text>
          <Animated.Text style={[styles.heroIcon, styles.boxIcon, { transform: [{ translateY: floatAnim2 }] }]}>📦</Animated.Text>
          <Animated.Text style={[styles.heroIcon, styles.rupeeIcon, { transform: [{ translateY: floatAnim3 }] }]}>₹</Animated.Text>
        </View>

        <View style={styles.heroText}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <AppLogo size="large" />
          </View>
          <Text style={styles.heroTitleMain}>E-Setu</Text>
          <Text style={styles.heroTitleSub}>{t('landing.taglineShort')}</Text>

          <Text style={styles.tagline}>
            {t('landing.tagline')}
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              style={styles.accentButton}
              onPress={() => router.push('/login/collector')}
            >
              <Text style={styles.accentButtonText}>
                {t('landing.getStarted')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.outlineButton}
              onPress={() => router.push('/collector/safety')}
            >
              <Text style={styles.outlineButtonText}>
                {t('landing.learnMore')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* FEATURES SECTION */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>
          {t('landing.featuresTitle')}
        </Text>

        <FeatureCard
          icon="📱"
          title={t('landing.feature1Title')}
          description={t('landing.feature1Desc')}
        />

        <FeatureCard
          icon="💰"
          title={t('landing.feature2Title')}
          description={t('landing.feature2Desc')}
        />

        <FeatureCard
          icon="🔍"
          title={t('landing.feature3Title')}
          description={t('landing.feature3Desc')}
        />

        <FeatureCard
          icon="📍"
          title={t('landing.feature4Title')}
          description={t('landing.feature4Desc')}
        />
      </View>

      {/* USER TYPES SECTION */}
      <View style={styles.userTypesSection}>
        <Text style={styles.sectionTitle}>
          {t('landing.whoAreYou')}
        </Text>

        <UserTypeCard
          icon="📦"
          title={t('landing.collector')}
          description={t('landing.collectorDesc')}
          buttonText={t('landing.loginAsCollector')}
          onPress={() => router.push('/login/collector')}
        />

        <UserTypeCard
          icon="♻️"
          title={t('landing.recycler')}
          description={t('landing.recyclerDesc')}
          buttonText={t('landing.loginAsRecycler')}
          onPress={() => router.push('/login/recycler')}
        />
      </View>

      {/* CTA SECTION */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>
          {t('landing.ctaTitle')}
        </Text>

        <Text style={styles.ctaDescription}>
          {t('landing.ctaDesc')}
        </Text>

        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/login/collector')}
        >
          <Text style={styles.ctaButtonText}>
            {t('landing.getStarted')}
          </Text>
        </Pressable>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 E-Setu. {t('landing.footer')}
        </Text>
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------
   FEATURE CARD
------------------------------------------------------- */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureIcon}>{icon}</Text>

      <Text style={styles.featureTitle}>
        {title}
      </Text>

      <Text style={styles.featureDescription}>
        {description}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------
   USER TYPE CARD
------------------------------------------------------- */

function UserTypeCard({
  icon,
  title,
  description,
  buttonText,
  onPress,
  secondary = false,
}: {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <View style={styles.userCard}>
      <Text style={styles.userIcon}>
        {icon}
      </Text>

      <Text style={styles.userTitle}>
        {title}
      </Text>

      <Text style={styles.userDescription}>
        {description}
      </Text>

      <Pressable
        style={
          secondary
            ? styles.outlineButton
            : styles.primaryButton
        }
        onPress={onPress}
      >
        <Text
          style={
            secondary
              ? styles.outlineButtonText
              : styles.primaryButtonText
          }
        >
          {buttonText}
        </Text>
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  pageContent: {
    paddingBottom: 0,
  },

  /* LANGUAGE */

  languageWrapper: {
    paddingTop: 18,
    paddingHorizontal: 18,
    alignItems: 'flex-end',
  },

  languageList: {
    gap: 8,
  },

  languageButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },

  languageButtonActive: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },

  languageText: {
    color: '#111827',
    fontSize: 13,
  },

  languageTextActive: {
    color: '#15803d',
    fontWeight: '600',
  },

  /* HERO */

  hero: {
    minHeight: 560,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  heroVisual: {
    width: 260,
    height: 260,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },

  heroCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(34,197,94,0.45)',
  },

  heroCircle2: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#22c55e',
  },

  heroCircle3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  heroIcon: {
    position: 'absolute',
    fontSize: 36,
  },

  recyclerIcon: {
    top: 45,
    right: 45,
  },

  boxIcon: {
    left: 45,
    bottom: 60,
  },

  rupeeIcon: {
    right: 55,
    bottom: 45,
    fontSize: 40,
    fontWeight: '700',
    color: '#166534',
  },

  heroText: {
    alignItems: 'center',
  },

  heroTitleMain: {
    fontSize: 44,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },

  heroTitleSub: {
    fontSize: 30,
    fontWeight: '300',
    color: '#22c55e',
    marginBottom: 18,
  },

  tagline: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 380,
    marginBottom: 26,
  },

  heroActions: {
    width: '100%',
    gap: 12,
  },

  /* BUTTONS */

  accentButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  accentButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },

  primaryButton: {
    width: '100%',
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },

  outlineButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  outlineButtonText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 15,
  },

  /* FEATURES */

  featuresSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 45,
  },

  sectionTitle: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 28,
  },

  featureCard: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },

  featureIcon: {
    fontSize: 42,
    marginBottom: 14,
  },

  featureTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
  },

  /* USER TYPES */

  userTypesSection: {
    paddingHorizontal: 20,
    paddingVertical: 45,
    backgroundColor: '#f8fafc',
  },

  userCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 18,
  },

  userIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  userTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },

  userDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },

  /* CTA */

  cta: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 55,
    alignItems: 'center',
  },

  ctaTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },

  ctaDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },

  ctaButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  ctaButtonText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 16,
  },

  /* FOOTER */

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 24,
    backgroundColor: '#ffffff',
  },

  footerText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
  },
});