import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

export default function RecyclerLotDetailScreen() {
  const {
    id,
  } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>
        Lot Details
      </Text>

      <Text style={styles.label}>
        Lot ID
      </Text>

      <Text style={styles.value}>
        {id ?? '—'}
      </Text>

      <Text style={styles.message}>
        Full Recycler lot details will be implemented in the next phase.
      </Text>

      <Pressable
        onPress={() =>
          router.back()
        }
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          Back
        </Text>
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      padding: 24,

      paddingTop: 60,

      backgroundColor:
        '#F5F8F6',
    },

    title: {
      fontSize: 28,

      fontWeight: '900',

      color: '#173D2D',
    },

    label: {
      marginTop: 28,

      fontSize: 13,

      fontWeight: '700',

      color: '#718078',
    },

    value: {
      marginTop: 6,

      fontSize: 20,

      fontWeight: '800',

      color: '#173D2D',
    },

    message: {
      marginTop: 24,

      fontSize: 15,

      lineHeight: 22,

      color: '#68756D',
    },

    button: {
      marginTop: 30,

      minHeight: 50,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        '#16794B',
    },

    buttonText: {
      fontWeight: '800',

      color: '#FFFFFF',
    },
  });
