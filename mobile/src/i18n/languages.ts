export const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
  },
  {
    code: 'hi',
    label: 'हिंदी',
  },
  {
    code: 'kn',
    label: 'ಕನ್ನಡ',
  },
  {
    code: 'ta',
    label: 'தமிழ்',
  },
  {
    code: 'te',
    label: 'తెలుగు',
  },
  {
    code: 'ml',
    label: 'മലയാളം',
  },
  {
    code: 'bn',
    label: 'বাংলা',
  },
  {
    code: 'mr',
    label: 'मराठी',
  },
] as const;

export type LanguageCode =
  (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE:
  LanguageCode = 'en';

export function isLanguageCode(
  value: string,
): value is LanguageCode {
  return LANGUAGES.some(
    language =>
      language.code === value,
  );
}
