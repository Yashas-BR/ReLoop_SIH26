import { StyleSheet, Text, View } from 'react-native';

export default function CollectorHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Collector Dashboard</Text>
      <Text style={styles.subtitle}>Login successful ✅</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
});