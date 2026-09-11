import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface StatCardProps {
  label: string;

  value:
  | string
  | number;

  subtitle?: string;

  accent?: boolean;
}

export function StatCard({
  label,
  value,
  subtitle,
  accent = false,
}: StatCardProps) {
  return (
    <View
      style={[
        styles.card,

        accent &&
        styles.accentCard,
      ]}
    >
      <Text
        style={[
          styles.label,

          accent &&
          styles.accentLabel,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.value,

          accent &&
          styles.accentValue,
        ]}
      >
        {value}
      </Text>

      {!!subtitle && (
        <Text
          numberOfLines={1}
          style={[
            styles.subtitle,

            accent &&
            styles.accentSubtitle,
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      width: '48%',

      minHeight: 126,

      padding: 16,

      borderRadius: 18,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E3E9E5',
    },

    accentCard: {
      backgroundColor:
        '#173D2D',

      borderColor:
        '#173D2D',
    },

    label: {
      fontSize: 13,

      fontWeight: '700',

      color: '#718078',
    },

    value: {
      marginTop: 10,

      fontSize: 30,

      fontWeight: '900',

      color: '#173D2D',
    },

    subtitle: {
      marginTop: 6,

      fontSize: 12,

      color: '#8A958F',
    },

    accentLabel: {
      color: '#C9DBD1',
    },

    accentValue: {
      color: '#FFFFFF',
    },

    accentSubtitle: {
      color: '#B8CEC2',
    },
  });