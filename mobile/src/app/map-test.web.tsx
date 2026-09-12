import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function MapTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Maps are not supported on Web. Please use Expo Go on your mobile device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  }
});
