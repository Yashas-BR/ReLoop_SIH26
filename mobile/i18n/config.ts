/**
 * i18n — Lightweight translation system for ReLoop mobile.
 *
 * React Native / Expo version.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext } from 'react';
import { getSession } from '../services/auth';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import kn from './locales/kn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import ml from './locales/ml.json';
import bn from './locales/bn.json';

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'kn'
  | 'ta'
  | 'te'
  | 'ml'
  | 'bn'
  | 'mr';

export interface I18nContextValue {
  lang: LanguageCode;

  setLang: (
    language: LanguageCode
  ) => void | Promise<void>;

  t: (
    key: string,
    vars?: Record<string, string | number>
  ) => string;
}

const LOCALES: Record<string, any> = {
  en,
  hi,
  mr,
  kn,
  ta,
  te,
  ml,
  bn,
};

const SUPPORTED: LanguageCode[] = [
  'en',
  'hi',
  'kn',
  'ta',
  'te',
  'ml',
  'bn',
  'mr',
];

const STORAGE_KEY = 'kc_lang';

export const LANG_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

/**
 * Priority:
 * 1. Saved language from AsyncStorage
 * 2. User preferred language from session
 * 3. English
 */
async function detectInitialLang(): Promise<LanguageCode> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);

    if (
      stored &&
      SUPPORTED.includes(stored as LanguageCode)
    ) {
      return stored as LanguageCode;
    }
  } catch (error) {
    console.warn(
      '[i18n] Could not read stored language:',
      error
    );
  }

  try {
    const session = await getSession();

    const sessionLang =
      session?.preferred_language;

    if (
      sessionLang &&
      SUPPORTED.includes(sessionLang as LanguageCode)
    ) {
      return sessionLang as LanguageCode;
    }
  } catch (error) {
    console.warn(
      '[i18n] Could not read session language:',
      error
    );
  }

  return 'en';
}

function getKey(locale: any, key: string) {
  const parts = key.split('.');

  let node = locale;

  for (const part of parts) {
    if (
      node == null ||
      typeof node !== 'object'
    ) {
      return undefined;
    }

    node = node[part];
  }

  return (
    typeof node === 'string' ||
    Array.isArray(node)
  )
    ? node
    : undefined;
}

function interpolate(str: any, vars?: Record<string, string | number>) {
  if (
    !vars ||
    typeof str !== 'string'
  ) {
    return str;
  }

  return str.replace(
    /\{\{?(\w+)\}?\}/g,
    (match, key) =>
      vars[key] !== undefined
        ? String(vars[key])
        : match
  );
}

export const I18nContext =
  createContext<I18nContextValue | null>(null);

export function useTranslation(): I18nContextValue {
  const ctx =
    useContext(I18nContext);

  if (!ctx) {
    throw new Error(
      'useTranslation must be used inside <I18nProvider>'
    );
  }

  return ctx;
}

export function translate(
  locales: Record<string, any>,
  lang: string,
  key: string,
  vars?: Record<string, string | number>
) {
  const locale =
    locales[lang] || locales.en;

  let result =
    getKey(locale, key);

  if (
    result === undefined &&
    lang !== 'en'
  ) {
    result =
      getKey(locales.en, key);
  }

  if (Array.isArray(result)) {
    return result;
  }

  if (result === undefined) {
    console.warn(
      `[i18n] Missing key: "${key}" in "${lang}"`
    );

    return key;
  }

  return interpolate(
    result,
    vars
  );
}

export {
  LOCALES,
  SUPPORTED,
  STORAGE_KEY,
  detectInitialLang,
};