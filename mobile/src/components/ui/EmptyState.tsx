import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface EmptyStateProps {
  /** Emoji icon displayed above title */
  icon?: string;
  /** Bold title text. Required. */
  title: string;
  /** Secondary description text. */
  message?: string;
  /** Label for the action button. */
  actionLabel?: string;
  /** Callback when the action button is pressed. Shows button only when provided. */
  onAction?: () => void;
  /** Fills entire parent if true (default), or inlines if false */
  fullScreen?: boolean;
}

/**
 * Standardized empty state component.
 * Use for: no lots, no recyclers, no earnings, no activity, no search results.
 */
export function EmptyState({
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
  fullScreen = true,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <View style={styles.card}>
        <Text style={styles.icon}>{icon}</Text>

        <Text style={styles.title}>{title}</Text>

        {message ? (
          <Text style={styles.message}>{message}</Text>
        ) : null}

        {onAction && actionLabel ? (
          <Pressable
            style={styles.actionButton}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.medium,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  actionButton: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
