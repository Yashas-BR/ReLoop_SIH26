import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps extends Omit<PressableProps, 'style'> {
  /** Button label text */
  title: string;
  /** Visual variant */
  variant?: AppButtonVariant;
  /** Shows a spinner and disables the button when true */
  loading?: boolean;
  /** Disables the button (also true when loading) */
  disabled?: boolean;
  /** Extra styles on the outer Pressable */
  style?: StyleProp<ViewStyle>;
}

/**
 * Standardized button component.
 * Replaces duplicated Save / Retry / Submit / Accept style buttons.
 *
 * Variants:
 * - primary: filled green (default)
 * - secondary: filled neutral
 * - danger: filled red
 * - ghost: transparent with border
 */
export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  onPress,
  ...rest
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`${variant}Text` as keyof typeof styles],
            isDisabled && styles.disabledText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  text: {
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: '#FFFFFF',
  },

  secondary: {
    backgroundColor: colors.surfaceAlt,
  },
  secondaryText: {
    color: colors.text,
  },

  danger: {
    backgroundColor: colors.danger,
  },
  dangerText: {
    color: '#FFFFFF',
  },

  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },

  // Disabled
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    // inherits from variant, just dimmed via opacity above
  },
});
