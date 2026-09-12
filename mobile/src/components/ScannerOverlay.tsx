import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppLogo } from './branding/AppLogo';

interface ScannerOverlayProps {
  title: string;

  instruction: string;
}

export function ScannerOverlay({
  title,
  instruction,
}: ScannerOverlayProps) {
  return (
    <View
      pointerEvents="none"
      style={
        styles.overlay
      }
    >
      <View style={styles.logoOverlay}>
        <AppLogo size="small" />
      </View>
      <View
        style={
          styles.header
        }
      >
        <Text
          style={
            styles.title
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.instruction
          }
        >
          {instruction}
        </Text>
      </View>

      <View
        style={
          styles.frame
        }
      />

      <Text
        style={
          styles.bottomText
        }
      >
        {instruction}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    logoOverlay: {
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: 8,
      borderRadius: 8,
    },

    header: {
      position: 'absolute',

      top: 70,

      left: 24,

      right: 24,

      alignItems:
        'center',
    },

    title: {
      fontSize: 24,

      fontWeight: '900',

      color: '#FFFFFF',
    },

    instruction: {
      marginTop: 8,

      textAlign: 'center',

      color: '#E6EEE9',
    },

    frame: {
      width: 250,

      height: 250,

      borderWidth: 3,

      borderRadius: 24,

      borderColor:
        '#FFFFFF',

      backgroundColor:
        'transparent',
    },

    bottomText: {
      position: 'absolute',

      bottom: 70,

      left: 30,

      right: 30,

      textAlign: 'center',

      color: '#FFFFFF',

      fontWeight: '700',
    },
  });