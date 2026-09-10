/**
 * ReLoop Mobile Language Selector Component
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  LANG_OPTIONS,
  useTranslation,
  type LanguageCode,
} from '../../i18n/config';

export interface LanguageSelectorProps {
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  activeButtonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
  onSelect?: (code: LanguageCode) => void;
  showScrollIndicator?: boolean;
}

export function LanguageSelector({
  style,
  containerStyle,
  buttonStyle,
  activeButtonStyle,
  textStyle,
  activeTextStyle,
  onSelect,
  showScrollIndicator = false,
}: LanguageSelectorProps) {
  const { lang, setLang } = useTranslation();

  const handleSelect = (code: LanguageCode) => {
    setLang(code);
    if (onSelect) {
      onSelect(code);
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={showScrollIndicator}
        contentContainerStyle={[styles.list, containerStyle]}
      >
        {LANG_OPTIONS.map((option) => {
          const isActive = lang === option.code;

          return (
            <Pressable
              key={option.code}
              accessibilityRole="button"
              accessibilityLabel={`Select ${option.label}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => handleSelect(option.code)}
              style={[
                styles.button,
                buttonStyle,
                isActive && styles.buttonActive,
                isActive && activeButtonStyle,
              ]}
            >
              <Text
                style={[
                  styles.text,
                  textStyle,
                  isActive && styles.textActive,
                  isActive && activeTextStyle,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
  },

  list: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },

  button: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },

  buttonActive: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },

  text: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '500',
  },

  textActive: {
    color: '#15803d',
    fontWeight: '700',
  },
});

export default LanguageSelector;
