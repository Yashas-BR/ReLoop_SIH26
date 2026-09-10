import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
];

export default function LandingScreen() {
  const [lang, setLang] = useState('en');

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
        {/* Hero illustration */}
        <View style={styles.heroVisual}>
          <View style={styles.heroCircle3} />
          <View style={styles.heroCircle2} />
          <View style={styles.heroCircle1} />

          <Text style={[styles.heroIcon, styles.recyclerIcon]}>♻️</Text>

          <Text style={[styles.heroIcon, styles.boxIcon]}>📦</Text>

          <Text style={[styles.heroIcon, styles.rupeeIcon]}>₹</Text>
        </View>

        {/* Hero text */}
        <View style={styles.heroText}>
          <Text style={styles.heroTitleMain}>Kabadiwala</Text>

          <Text style={styles.heroTitleSub}>Connect</Text>

          <Text style={styles.tagline}>
            Smart recycling. Fair prices. Trusted connections.
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              style={styles.accentButton}
              onPress={() => router.push('/login/collector')}
            >
              <Text style={styles.accentButtonText}>Get Started</Text>
            </Pressable>

            <Pressable
              style={styles.outlineButton}
              onPress={() => router.push('/safety')}
            >
              <Text style={styles.outlineButtonText}>Learn More</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* FEATURES SECTION */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>
          Why Kabadiwala Connect?
        </Text>

        <FeatureCard
          icon="📱"
          title="Easy to Use"
          description="Simple digital tools designed for collectors and recyclers."
        />

        <FeatureCard
          icon="💰"
          title="Fair Pricing"
          description="Discover transparent and competitive market prices."
        />

        <FeatureCard
          icon="🔍"
          title="Traceability"
          description="Track every stage of the recycling journey."
        />

        <FeatureCard
          icon="📍"
          title="Nearby Recyclers"
          description="Find trusted recyclers near your location."
        />
      </View>

      {/* USER TYPES SECTION */}
      <View style={styles.userTypesSection}>
        <Text style={styles.sectionTitle}>Who are you?</Text>

        <UserTypeCard
          icon="📦"
          title="Collector"
          description="Create lots, discover prices and connect with recyclers."
          buttonText="Login as Collector"
          onPress={() => router.push('/login/collector')}
        />

        <UserTypeCard
          icon="♻️"
          title="Recycler"
          description="View incoming lots, quote prices and manage recycling."
          buttonText="Login as Recycler"
          onPress={() => router.push('/login/recycler')}
        />

        <UserTypeCard
          icon="⚙️"
          title="Admin"
          description="Monitor activity and manage platform operations."
          buttonText="Login as Admin"
          secondary
          onPress={() => router.push('/login/admin')}
        />
      </View>

      {/* CTA SECTION */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>
          Ready to get started?
        </Text>

        <Text style={styles.ctaDescription}>
          Join Kabadiwala Connect and make e-waste recycling smarter,
          transparent and efficient.
        </Text>

        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/login/collector')}
        >
          <Text style={styles.ctaButtonText}>
            Get Started
          </Text>
        </Pressable>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 Kabadiwala Connect.
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