import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface ErrorStateProps {
  /** Optional title above the message. Defaults to nothing. */
  title?: string;
  /** The error message to display. Required. */
  message: string;
  /** Label for the retry button. Defaults to 'Try Again'. */
  retryLabel?: string;
  /** If provided, shows a retry button that calls this callback. */
  onRetry?: () => void;
  /** Fills entire parent if true (default), or inlines if false */
  fullScreen?: boolean;
}

/**
 * Standardized error state component.
 * Use instead of repeating error-card JSX patterns across screens.
 */
export function ErrorState({
  title,
  message,
  retryLabel = 'Try Again',
  onRetry,
  fullScreen = true,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <View style={styles.card}>
        <Text style={styles.icon}>⚠️</Text>

        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : null}

        <Text style={styles.message}>{message}</Text>

        {onRetry ? (
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={retryLabel}
          >
            <Text style={styles.retryText}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    minHeight: 200,
  },
  card: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.medium,
    fontWeight: '700',
    color: colors.dangerText,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body,
    color: colors.dangerText,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
  },
});
