import { Stack } from 'expo-router';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AuthProvider } from '../services/auth';

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </AuthProvider>
    </I18nProvider>
  );
}