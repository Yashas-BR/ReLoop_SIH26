/**
 * I18nProvider — React Native / Expo multilingual provider.
 *
 * Provides:
 * - lang
 * - setLang
 * - t(key, vars?)
 * - ready
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  I18nContext,
  LOCALES,
  STORAGE_KEY,
  SUPPORTED,
  detectInitialLang,
  translate,
} from './config.js';

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLanguage() {
      const initialLang = await detectInitialLang();

      if (!active) {
        return;
      }

      setLangState(initialLang);
      setReady(true);
    }

    loadLanguage();

    return () => {
      active = false;
    };
  }, []);

  const setLang = useCallback(async (code) => {
    if (!SUPPORTED.includes(code)) {
      return;
    }

    // Update UI immediately.
    setLangState(code);

    // Persist language for next app launch.
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        code
      );
    } catch (error) {
      console.warn(
        '[i18n] Could not save language:',
        error
      );
    }
  }, []);

  const t = useCallback(
    (key, vars) =>
      translate(
        LOCALES,
        lang,
        key,
        vars
      ),
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      ready,
    }),
    [lang, setLang, t, ready]
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
