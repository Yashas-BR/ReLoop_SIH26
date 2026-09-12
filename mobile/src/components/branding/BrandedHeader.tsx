import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppLogo } from './AppLogo';
import { colors, spacing, typography } from '../../theme';

interface BrandedHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export function BrandedHeader({ title, subtitle, showBack = false, rightElement }: BrandedHeaderProps) {
  return (
    <View style={styles.container}>
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
      )}
      
      <AppLogo size="small" style={styles.logo} />
      
      <View style={styles.textContainer}>
        {typeof title === 'string' ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle && (
          typeof subtitle === 'string' ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        )}
      </View>
      
      {rightElement && (
        <View style={styles.rightElement}>
          {rightElement}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.medium,
    color: colors.text,
  },
  logo: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightElement: {
    marginLeft: spacing.sm,
  }
});
