import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface ScreenProps {
  /** Screen content */
  children: React.ReactNode;
  /** Enable ScrollView wrapping. Default true. */
  scroll?: boolean;
  /** Background color. Defaults to theme background. */
  backgroundColor?: string;
  /** Extra padding at bottom. Useful for tab bars. */
  bottomPadding?: number;
  /** Called when user pulls down to refresh. Shows refresh spinner. */
  onRefresh?: () => void;
  /** Controls the pull-to-refresh spinner state */
  refreshing?: boolean;
  /** Extra container styles */
  style?: StyleProp<ViewStyle>;
  /** Extra scroll content container styles */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Standard screen wrapper providing safe area, keyboard avoidance, and optional scroll.
 *
 * Do NOT use for map or camera screens — those need native full-screen layouts.
 * This is for regular list/form/detail screens only.
 */
export function Screen({
  children,
  scroll = true,
  backgroundColor = colors.background,
  bottomPadding,
  onRefresh,
  refreshing = false,
  style,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const paddingBottom =
    bottomPadding ?? insets.bottom + spacing.lg;

  if (scroll) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={[styles.flex, { backgroundColor }, style]}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom, paddingTop: insets.top },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor, paddingBottom, paddingTop: insets.top },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
});
