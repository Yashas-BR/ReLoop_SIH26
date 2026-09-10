import {
  Redirect,
  Stack,
} from 'expo-router';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  useAuth,
} from '../../services/auth';

export default function RecyclerLayout() {
  const {
    isLoading,
    isAuthenticated,
  } = useAuth();

  if (isLoading) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Redirect
        href="/login/recycler"
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle:
          'Back',

        animation:
          'slide_from_right',
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown:
            false,
        }}
      />

      <Stack.Screen
        name="incoming-lots"
        options={{
          title:
            'Incoming Lots',
        }}
      />

      <Stack.Screen
        name="lot/[id]"
        options={{
          title:
            'Lot Details',
        }}
      />

      <Stack.Screen
        name="profile"
        options={{
          title:
            'Profile',
        }}
      />

      <Stack.Screen
        name="scan"
        options={{
          title:
            'Scan QR',
        }}
      />

      <Stack.Screen
        name="map"
        options={{
          title:
            'Map',
        }}
      />
    </Stack>
  );
}

const styles =
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#FFFFFF',
    },
  });
