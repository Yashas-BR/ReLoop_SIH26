import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface StatusBadgeProps {
  status:
  | string
  | null
  | undefined;
  
  label?: string;
}

function normalizeStatus(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value
      ?.trim()
      .toLowerCase() ??
    'unknown'
  );
}

function getLabel(
  status: string,
): string {
  return status
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase(),
    );
}

import {
  useTranslation,
} from '../../../i18n/config';

export function StatusBadge({
  status,
  label,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = normalizeStatus(status);

  const positive = [
    'authorized',
    'active',
    'confirmed',
    'handed_over',
  ].includes(normalized);

  const warning = [
    'matched',
    'pending',
    'renewal_pending',
    'expiring_soon',
    'quoted',
  ].includes(normalized);

  const danger = [
    'expired',
    'unauthorized',
    'suspended',
    'rejected',
  ].includes(normalized);

  // Try to translate the status using the authorization.* namespace, 
  // fallback to generic getLabel(normalized) if not found.
  const translationKey = `authorization.${normalized}`;
  const translated = t(translationKey as any);
  const displayLabel = label ?? (translated && !translated.includes('authorization.') 
    ? translated 
    : getLabel(normalized));

  return (
    <View
      style={[
        styles.badge,
        positive && styles.positive,
        warning && styles.warning,
        danger && styles.danger,
      ]}
    >
      <Text
        style={[
          styles.text,
          positive && styles.positiveText,
          warning && styles.warningText,
          danger && styles.dangerText,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    badge: {
      alignSelf:
        'flex-start',

      paddingHorizontal: 10,

      paddingVertical: 5,

      borderRadius: 999,

      backgroundColor:
        '#EDF1EF',
    },

    text: {
      fontSize: 11,

      fontWeight: '800',

      color: '#55645C',
    },

    positive: {
      backgroundColor:
        '#E4F5EB',
    },

    positiveText: {
      color: '#16794B',
    },

    warning: {
      backgroundColor:
        '#FFF5D9',
    },

    warningText: {
      color: '#986900',
    },

    danger: {
      backgroundColor:
        '#FFE9E7',
    },

    dangerText: {
      color: '#AA3028',
    },
  });