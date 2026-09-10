import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function IncomingLotsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>
          Incoming Lots
        </Text>

        <Text style={styles.subtitle}>
          Recycler lot management will be implemented
          in the next phase.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F4F7F5',
    },

    container: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#173D2D',
    },

    subtitle: {
      marginTop: 10,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      color: '#68756D',
    },
  });
