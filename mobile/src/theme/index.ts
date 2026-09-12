/**
 * E-Setu Design System — Central Theme
 * Use these tokens across all screens instead of hardcoded values.
 */

export const colors = {
  // Brand palette
  primary: '#16794B',
  primaryDark: '#173D2D',

  // E-Setu brand accents (blue/teal from logo)
  brandBlue: '#08738A',
  brandTeal: '#07988D',
  brandGreen: '#2F8F2F',

  // Backgrounds
  background: '#F5F8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1EF',

  // Text
  text: '#173D2D',
  textSecondary: '#718078',
  textMuted: '#9CA3AF',

  // Border
  border: '#E1E8E3',
  borderLight: '#F0F4F2',

  // Status — success
  success: '#16794B',
  successBg: '#E5F5EB',
  successText: '#15803D',

  // Status — warning
  warning: '#986900',
  warningBg: '#FFF5D9',
  warningText: '#92400E',

  // Status — danger
  danger: '#AA352D',
  dangerBg: '#FFF0EE',
  dangerText: '#B91C1C',

  // Status — info
  info: '#08738A',
  infoBg: '#E0F2FE',
  infoText: '#075985',

  // Disabled / neutral
  disabled: '#A8B2AC',
  disabledBg: '#F3F4F6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  small: 12,
  body: 14,
  medium: 16,
  heading: 20,
  title: 28,
  display: 36,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
