import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface LoadingStateProps {
  /** Optional message displayed beneath the spinner. Defaults to 'Loading…' */
  message?: string;
  /** Size of the spinner. Defaults to 'large' */
  size?: 'small' | 'large';
  /** Fills entire parent if true (default), or inlines if false */
  fullScreen?: boolean;
}

/**
 * Standardized loading state component.
 * Use instead of repeating ActivityIndicator + Text patterns across screens.
 */
export function LoadingState({
  message,
  size = 'large',
  fullScreen = true,
}: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    minHeight: 200,
  },
  message: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
