import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LeafletMap } from '../components/LeafletMap';

export default function MapTestScreen() {
  return (
    <View style={styles.container}>
      <LeafletMap 
        center={{ latitude: 12.9716, longitude: 77.5946 }}
        zoom={12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
