import { Image, type StyleProp, StyleSheet, type ImageStyle } from 'react-native';

const LOGO_ASSET = require('../../../assets/images/logo.jpeg');

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ImageStyle>;
}

export function AppLogo({ size = 'medium', style }: AppLogoProps) {
  let width = 80;
  let height = 80;

  if (size === 'small') {
    width = 40;
    height = 40;
  } else if (size === 'large') {
    width = 150;
    height = 150;
  }

  return (
    <Image
      source={LOGO_ASSET}
      style={[
        {
          width,
          height,
          resizeMode: 'contain',
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="E-Setu Logo"
    />
  );
}
