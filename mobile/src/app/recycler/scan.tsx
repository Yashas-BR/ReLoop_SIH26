import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import { ScannerOverlay } from '../../components/recycler/ScannerOverlay';

import { parseReLoopQr } from '../../services/qr';

import { useTranslation } from '../../../i18n/config';

export default function RecyclerScanScreen() {
  const [
    permission,
    requestPermission,
  ] =
    useCameraPermissions();

  const { t } =
    useTranslation();

  const [
    scanned,
    setScanned,
  ] =
    useState(false);

  const [
    cameraActive,
    setCameraActive,
  ] =
    useState(true);

  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      setScanned(false);

      return () => {
        setCameraActive(false);
      };
    }, []),
  );

  const handleBarcodeScanned =
    useCallback(
      ({
        data,
      }: {
        data: string;
      }) => {
        if (scanned) {
          return;
        }

        setScanned(true);

        const parsed =
          parseReLoopQr(
            data,
          );

        if (
          parsed.type ===
            'lot' &&
          parsed.lotId
        ) {
          router.push({
            pathname:
              '/recycler/lot/[id]',

            params: {
              id:
                parsed.lotId,
            },
          });

          return;
        }

        if (
          parsed.type ===
          'handover'
        ) {
          Alert.alert(
            t(
              'recyclerScan.handoverTitle',
            ),

            parsed.reference ??
              parsed.raw,

            [
              {
                text: t(
                  'common.ok',
                ),

                onPress: () =>
                  setScanned(
                    false,
                  ),
              },
            ],
          );

          return;
        }

        Alert.alert(
          t(
            'recyclerScan.invalidTitle',
          ),

          t(
            'recyclerScan.invalidMessage',
          ),

          [
            {
              text: t(
                'recyclerScan.scanAgain',
              ),

              onPress: () =>
                setScanned(
                  false,
                ),
            },
          ],
        );
      },
      [
        scanned,
        t,
      ],
    );

  if (!permission) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text>
          {t(
            'common.loading',
          )}
        </Text>
      </View>
    );
  }

  if (
    !permission.granted
  ) {
    return (
      <View
        style={
          styles.permissionScreen
        }
      >
        <Text
          style={
            styles.permissionTitle
          }
        >
          {t(
            'recyclerScan.permissionTitle',
          )}
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          {t(
            'recyclerScan.permissionDescription',
          )}
        </Text>

        <Pressable
          onPress={() =>
            void requestPermission()
          }
          style={
            styles.permissionButton
          }
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            {t(
              'recyclerScan.allowCamera',
            )}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.back()
          }
          style={
            styles.secondaryButton
          }
        >
          <Text
            style={
              styles.secondaryText
            }
          >
            {t(
              'common.back',
            )}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      {cameraActive && (
        <CameraView
          style={
            StyleSheet.absoluteFill
          }
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
            ],
          }}
          onBarcodeScanned={
            scanned
              ? undefined
              : handleBarcodeScanned
          }
        />
      )}

      <ScannerOverlay
        title={t(
          'recyclerScan.title',
        )}
        instruction={t(
          'recyclerScan.instruction',
        )}
      />

      <Pressable
        onPress={() =>
          router.back()
        }
        style={
          styles.close
        }
      >
        <Text
          style={
            styles.closeText
          }
        >
          ×
        </Text>
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor:
        '#000000',
    },

    center: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    permissionScreen: {
      flex: 1,

      padding: 30,

      justifyContent:
        'center',

      backgroundColor:
        '#F5F8F6',
    },

    permissionTitle: {
      fontSize: 27,

      fontWeight: '900',

      color: '#173D2D',
    },

    permissionText: {
      marginTop: 12,

      lineHeight: 22,

      color: '#718078',
    },

    permissionButton: {
      marginTop: 25,

      minHeight: 54,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 15,

      backgroundColor:
        '#16794B',
    },

    permissionButtonText: {
      fontWeight: '900',

      color: '#FFFFFF',
    },

    secondaryButton: {
      marginTop: 12,

      minHeight: 48,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    secondaryText: {
      fontWeight: '800',

      color: '#617168',
    },

    close: {
      position: 'absolute',

      top: 50,

      right: 20,

      width: 45,

      height: 45,

      borderRadius: 23,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.55)',
    },

    closeText: {
      fontSize: 30,

      lineHeight: 32,

      color: '#FFFFFF',
    },
  });