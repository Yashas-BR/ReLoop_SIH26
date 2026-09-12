import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  useMemo,
  useState,
} from 'react';

import {
  ApiError,
  NetworkError,
  loginRecycler,
  onboardRecycler,
  DEFAULT_LAT,
  DEFAULT_LNG,
} from '../../api/client';

import {
  MATERIAL_CATEGORIES,
} from '../../constants/materials';

import {
  LanguageSelector,
} from '../../components/LanguageSelector';

import {
  useAuth,
} from '../../services/auth';

import {
  useTranslation,
} from '../../../i18n/config';

import { AppLogo } from '../../components/branding/AppLogo';

import type {
  MaterialCategory,
  PickupAvailability,
  RecyclerApplication,
  RecyclerSession,
} from '../../types/auth';

type ScreenMode =
  | 'login'
  | 'apply';

interface ApplicationFormState {
  name: string;
  facilityLocation: string;
  contactDetails: string;
  serviceArea: string;

  materialsAccepted:
    MaterialCategory[];

  pickupAvailability:
    PickupAvailability;

  authorizationNumber: string;

  authorizationIssueDate: string;

  authorizationValidUntil: string;

  authorizationDocumentUrl: string;

  authorizationDetails: string;
}

const INITIAL_FORM:
  ApplicationFormState = {
    name: '',
    facilityLocation: '',
    contactDetails: '',
    serviceArea: '',

    materialsAccepted: [],

    pickupAvailability:
      'on_request',

    authorizationNumber: '',
    authorizationIssueDate: '',
    authorizationValidUntil: '',
    authorizationDocumentUrl: '',
    authorizationDetails: '',
  };

export default function RecyclerLoginScreen() {
  const {
    signIn,
  } = useAuth();

  const { t } = useTranslation();

  const [
    mode,
    setMode,
  ] =
    useState<ScreenMode>(
      'login',
    );

  const [
    recyclerId,
    setRecyclerId,
  ] = useState('');

  const [
    loginBusy,
    setLoginBusy,
  ] = useState(false);

  const [
    loginError,
    setLoginError,
  ] = useState('');

  const [
    applicationBusy,
    setApplicationBusy,
  ] = useState(false);

  const [
    applicationError,
    setApplicationError,
  ] = useState('');

  const [
    appliedRecyclerId,
    setAppliedRecyclerId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<ApplicationFormState>(
      INITIAL_FORM,
    );

  const recyclerIdNumber =
    useMemo(() => {
      const value =
        Number(
          recyclerId.trim(),
        );

      return Number.isInteger(
        value,
      ) && value > 0
        ? value
        : null;
    }, [recyclerId]);

  function changeMode(
    nextMode: ScreenMode,
  ) {
    setMode(nextMode);

    setLoginError('');
    setApplicationError('');
  }

  function updateForm<
    K extends keyof ApplicationFormState,
  >(
    key: K,
    value:
      ApplicationFormState[K],
  ) {
    setForm(previous => ({
      ...previous,
      [key]: value,
    }));
  }

  function toggleMaterial(
    material: MaterialCategory,
  ) {
    setForm(previous => {
      const selected =
        previous.materialsAccepted.includes(
          material,
        );

      return {
        ...previous,

        materialsAccepted:
          selected
            ? previous.materialsAccepted.filter(
                item =>
                  item !==
                  material,
              )
            : [
                ...previous.materialsAccepted,
                material,
              ],
      };
    });
  }

  async function handleLogin() {
    if (!recyclerIdNumber) {
      setLoginError(
        'Enter a valid Recycler ID.',
      );

      return;
    }

    setLoginError('');
    setLoginBusy(true);

    try {
      const response =
        await loginRecycler(
          recyclerIdNumber,
        );

      const {
        recycler,
        token,
      } = response.data;

      const session:
        RecyclerSession = {
          role: 'recycler',

          userId:
            recycler.id,

          name:
            recycler.name,

          facility_location:
            recycler.facility_location,

          materials_accepted:
            recycler.materials_accepted,

          token,
        };

      await signIn(
        session,
        recycler,
      );

      router.replace(
        '/recycler/dashboard',
      );
    } catch (error) {
      if (
        error instanceof ApiError
      ) {
        if (
          error.status === 403
        ) {
          setLoginError(
            error.message,
          );
        } else if (
          error.status === 404
        ) {
          setLoginError(
            'Recycler ID not found.',
          );
        } else {
          setLoginError(
            error.message,
          );
        }

        return;
      }

      setLoginError(
        'Unable to sign in.',
      );
    } finally {
      setLoginBusy(false);
    }
  }

  function validateApplication():
    string | null {
    if (!form.name.trim()) {
      return 'Enter your recycler or facility name.';
    }

    if (
      !form.facilityLocation.trim()
    ) {
      return 'Enter your facility location.';
    }

    if (
      form.materialsAccepted
        .length === 0
    ) {
      return 'Select at least one material category.';
    }

    return null;
  }

  async function handleApply() {
    // Prevent duplicate submissions while a request is already in-flight.
    if (applicationBusy) {
      return;
    }

    const validationError = validateApplication();

    if (validationError) {
      setApplicationError(validationError);
      return;
    }

    setApplicationError('');
    setApplicationBusy(true);

    const payload: RecyclerApplication = {
      name: form.name.trim(),

      latitude: Number(DEFAULT_LAT),
      longitude: Number(DEFAULT_LNG),

      // facility_location is required by the backend – always include it.
      facility_location: form.facilityLocation.trim(),

      contact_details:
        form.contactDetails.trim() || undefined,

      service_area:
        form.serviceArea.trim() || undefined,

      materials_accepted: form.materialsAccepted,

      pickup_availability: form.pickupAvailability,

      authorization_number:
        form.authorizationNumber.trim() || undefined,

      authorization_issue_date:
        form.authorizationIssueDate.trim() || undefined,

      authorization_valid_until:
        form.authorizationValidUntil.trim() || undefined,

      authorization_document_url:
        form.authorizationDocumentUrl.trim() || undefined,

      authorization_details:
        form.authorizationDetails.trim() || undefined,
    };

    try {
      const response = await onboardRecycler(payload);
      setAppliedRecyclerId(response.data.id);
    } catch (error) {
      // ── Expo Web: CORS / network failure ──────────────────────────────────
      // When the backend's CORS policy blocks localhost the browser throws a
      // TypeError which our client converts to NetworkError.  Give the user a
      // clear, actionable message instead of a generic network error.
      if (Platform.OS === 'web' && error instanceof NetworkError) {
        setApplicationError(
          t('login.corsWebError')
        );
        return;
      }

      // ── Native: NetworkError (no connectivity / timeout) ──────────────────
      if (error instanceof NetworkError) {
        setApplicationError(t('login.networkError'));
        return;
      }

      // ── HTTP error responses from the backend ─────────────────────────────
      if (error instanceof ApiError) {
        switch (error.status) {
          case 400:
            setApplicationError(
              error.message || 'Invalid application data. Please check your inputs.'
            );
            break;
          case 409:
            setApplicationError(
              error.message || 'A recycler with this name or facility already exists.'
            );
            break;
          case 422:
            setApplicationError(
              error.message || 'Validation failed. Please check required fields.'
            );
            break;
          case 403:
            setApplicationError(
              error.message || 'You are not authorized to submit this application.'
            );
            break;
          case 404:
            setApplicationError(
              'Onboarding endpoint not found. Please contact support.'
            );
            break;
          case 500:
            setApplicationError(
              'Server error. Please try again in a few moments.'
            );
            break;
          default:
            setApplicationError(
              error.message || 'Could not submit your application.'
            );
        }
        return;
      }

      // ── Unexpected error ──────────────────────────────────────────────────
      setApplicationError('Could not submit your application. Please try again.');
    } finally {
      // Always reset loading state – success or failure.
      setApplicationBusy(false);
    }
  }

  if (appliedRecyclerId) {
    return (
      <View
        style={
          styles.successContainer
        }
      >
        <Text
          style={
            styles.successIcon
          }
        >
          ✓
        </Text>

        <Text
          style={
            styles.successTitle
          }
        >
          Application Submitted
        </Text>

        <Text
          style={
            styles.successText
          }
        >
          Your application has
          been received and is
          waiting for verification.
        </Text>

        <View
          style={
            styles.recyclerIdCard
          }
        >
          <Text
            style={
              styles.recyclerIdLabel
            }
          >
            YOUR RECYCLER ID
          </Text>

          <Text
            selectable
            style={
              styles.recyclerIdValue
            }
          >
            {
              appliedRecyclerId
            }
          </Text>
        </View>

        <Text
          style={
            styles.saveIdText
          }
        >
          Save this ID. Once your
          profile is authorized,
          use it to sign in.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setRecyclerId(
              String(
                appliedRecyclerId,
              ),
            );

            setAppliedRecyclerId(
              null,
            );

            setMode(
              'login',
            );
          }}
          style={({ pressed }) => [
            styles.primaryButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Back to Sign In
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <AppLogo size="large" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>♻️</Text>
            <Text
              style={
                styles.brand
              }
            >
              E-Setu
            </Text>
          </View>

          <Text
            style={
              styles.title
            }
          >
            {t('nav.recyclerPortal')}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Manage verified
            e-waste collection and
            recycling workflows.
          </Text>
        </View>

        <LanguageSelector />

        <View
          style={
            styles.modeContainer
          }
        >
          <ModeButton
            label={t('login.signIn')}
            active={
              mode === 'login'
            }
            onPress={() =>
              changeMode(
                'login',
              )
            }
          />

          <ModeButton
            label={t('login.applyMode')}
            active={
              mode === 'apply'
            }
            onPress={() =>
              changeMode(
                'apply',
              )
            }
          />
        </View>

        {mode === 'login' ? (
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {t('login.recyclerSignIn')}
            </Text>

            <Text
              style={
                styles.fieldLabel
              }
            >
              {t('login.recyclerIdLabel')}
            </Text>

            <TextInput
              value={
                recyclerId
              }
              onChangeText={
                setRecyclerId
              }
              keyboardType="number-pad"
              placeholder={t('login.recyclerIdPlaceholder')}
              returnKeyType="done"
              onSubmitEditing={
                handleLogin
              }
              editable={
                !loginBusy
              }
              style={
                styles.input
              }
            />

            {!!loginError && (
              <ErrorMessage
                message={
                  loginError
                }
              />
            )}

            <Pressable
              accessibilityRole="button"
              disabled={
                loginBusy
              }
              onPress={
                handleLogin
              }
              style={({ pressed }) => [
                styles.primaryButton,

                loginBusy &&
                  styles.disabled,

                pressed &&
                  !loginBusy &&
                  styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {loginBusy
                  ? t('login.signingIn')
                  : t('login.signIn')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {t('login.applyAsRecycler')}
            </Text>

            <FormField
              label={t('login.facilityNameLabel')}
              value={
                form.name
              }
              placeholder={t('login.facilityNamePlaceholder')}
              onChangeText={
                value =>
                  updateForm(
                    'name',
                    value,
                  )
              }
            />

            <FormField
              label={t('login.facilityLocationLabel')}
              value={
                form.facilityLocation
              }
              placeholder={t('login.facilityLocationPlaceholder')}
              onChangeText={
                value =>
                  updateForm(
                    'facilityLocation',
                    value,
                  )
              }
            />

            <FormField
              label={t('login.contactDetailsLabel')}
              value={
                form.contactDetails
              }
              placeholder={t('login.contactDetailsPlaceholder')}
              onChangeText={
                value =>
                  updateForm(
                    'contactDetails',
                    value,
                  )
              }
            />

            <FormField
              label={t('login.serviceAreaLabel')}
              value={
                form.serviceArea
              }
              placeholder={t('login.serviceAreaPlaceholder')}
              onChangeText={
                value =>
                  updateForm(
                    'serviceArea',
                    value,
                  )
              }
            />

            <Text
              style={
                styles.fieldLabel
              }
            >
              {t('login.materialsAcceptedLabel')}
            </Text>

            <View
              style={
                styles.materialGrid
              }
            >
              {MATERIAL_CATEGORIES.map(
                material => {
                  const selected =
                    form.materialsAccepted.includes(
                      material.id,
                    );

                  return (
                    <Pressable
                      key={
                        material.id
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected,
                      }}
                      onPress={() =>
                        toggleMaterial(
                          material.id,
                        )
                      }
                      style={({ pressed }) => [
                        styles.materialChip,

                        selected &&
                          styles.materialChipSelected,

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.materialText,

                          selected &&
                            styles.materialTextSelected,
                        ]}
                      >
                        {
                          material.label
                        }
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            <Text
              style={
                styles.fieldLabel
              }
            >
              {t('login.pickupAvailabilityLabel')}
            </Text>

            <View
              style={
                styles.pickupContainer
              }
            >
              <PickupButton
                label={t('login.pickupDaily')}
                active={
                  form.pickupAvailability ===
                  'daily'
                }
                onPress={() =>
                  updateForm(
                    'pickupAvailability',
                    'daily',
                  )
                }
              />

              <PickupButton
                label={t('login.pickupWeekly')}
                active={
                  form.pickupAvailability ===
                  'weekly'
                }
                onPress={() =>
                  updateForm(
                    'pickupAvailability',
                    'weekly',
                  )
                }
              />

              <PickupButton
                label={t('login.pickupOnRequest')}
                active={
                  form.pickupAvailability ===
                  'on_request'
                }
                onPress={() =>
                  updateForm(
                    'pickupAvailability',
                    'on_request',
                  )
                }
              />
            </View>

            <Text
              style={
                styles.subheading
              }
            >
              Authorization
            </Text>

            <FormField
              label="Authorization Number"
              value={
                form.authorizationNumber
              }
              placeholder="Authorization number"
              onChangeText={
                value =>
                  updateForm(
                    'authorizationNumber',
                    value,
                  )
              }
            />

            <FormField
              label="Issue Date"
              value={
                form.authorizationIssueDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={
                value =>
                  updateForm(
                    'authorizationIssueDate',
                    value,
                  )
              }
            />

            <FormField
              label="Valid Until"
              value={
                form.authorizationValidUntil
              }
              placeholder="YYYY-MM-DD"
              onChangeText={
                value =>
                  updateForm(
                    'authorizationValidUntil',
                    value,
                  )
              }
            />

            <FormField
              label="Authorization Document URL"
              value={
                form.authorizationDocumentUrl
              }
              placeholder="https://..."
              autoCapitalize="none"
              onChangeText={
                value =>
                  updateForm(
                    'authorizationDocumentUrl',
                    value,
                  )
              }
            />

            <FormField
              label="Authorization Details"
              value={
                form.authorizationDetails
              }
              placeholder="Additional authorization information"
              multiline
              onChangeText={
                value =>
                  updateForm(
                    'authorizationDetails',
                    value,
                  )
              }
            />

            {!!applicationError && (
              <ErrorMessage
                message={
                  applicationError
                }
              />
            )}

            <Pressable
              accessibilityRole="button"
              disabled={
                applicationBusy
              }
              onPress={
                handleApply
              }
              style={({ pressed }) => [
                styles.primaryButton,

                applicationBusy &&
                  styles.disabled,

                pressed &&
                  !applicationBusy &&
                  styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {applicationBusy
                  ? t('login.applyingButton')
                  : t('login.applyButton')}
              </Text>
            </Pressable>

            <Text
              style={
                styles.pendingNotice
              }
            >
              New recycler
              applications remain
              pending until they
              are verified.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface ModeButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ModeButton({
  label,
  active,
  onPress,
}: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeButton,

        active &&
          styles.modeButtonActive,
      ]}
    >
      <Text
        style={[
          styles.modeButtonText,

          active &&
            styles.modeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface PickupButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function PickupButton({
  label,
  active,
  onPress,
}: PickupButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pickupButton,

        active &&
          styles.pickupButtonActive,
      ]}
    >
      <Text
        style={[
          styles.pickupText,

          active &&
            styles.pickupTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface FormFieldProps {
  label: string;

  value: string;

  placeholder?: string;

  multiline?: boolean;

  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';

  onChangeText:
    (value: string) => void;
}

function FormField({
  label,
  value,
  placeholder,
  multiline = false,
  autoCapitalize = 'sentences',
  onChangeText,
}: FormFieldProps) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TextInput
        value={value}
        placeholder={
          placeholder
        }
        multiline={
          multiline
        }
        autoCapitalize={
          autoCapitalize
        }
        onChangeText={
          onChangeText
        }
        style={[
          styles.input,

          multiline &&
            styles.textArea,
        ]}
      />
    </View>
  );
}

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <View
      style={
        styles.errorBox
      }
    >
      <Text
        style={
          styles.errorText
        }
      >
        {message}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#F4F7F5',
    },

    scrollContent: {
      flexGrow: 1,
      padding: 20,
      paddingTop: 56,
      paddingBottom: 60,
    },

    header: {
      marginBottom: 22,
    },

    brand: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 2,
      color: '#16794B',
    },

    title: {
      marginTop: 8,
      fontSize: 34,
      fontWeight: '800',
      color: '#14271E',
    },

    subtitle: {
      marginTop: 8,
      fontSize: 16,
      lineHeight: 24,
      color: '#66736C',
    },

    modeContainer: {
      flexDirection: 'row',
      marginTop: 22,
      marginBottom: 16,
      borderRadius: 14,
      padding: 4,
      backgroundColor:
        '#E7ECE9',
    },

    modeButton: {
      flex: 1,
      minHeight: 46,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius: 11,
    },

    modeButtonActive: {
      backgroundColor:
        '#FFFFFF',
    },

    modeButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#69766F',
    },

    modeButtonTextActive: {
      color: '#173D2D',
    },

    card: {
      borderRadius: 20,
      padding: 20,
      backgroundColor:
        '#FFFFFF',

      shadowColor:
        '#000000',
      shadowOpacity: 0.07,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: 5,
      },

      elevation: 3,
    },

    sectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#173D2D',
      marginBottom: 20,
    },

    subheading: {
      marginTop: 24,
      marginBottom: 6,
      fontSize: 18,
      fontWeight: '800',
      color: '#173D2D',
    },

    field: {
      marginBottom: 16,
    },

    fieldLabel: {
      marginBottom: 7,
      fontSize: 14,
      fontWeight: '700',
      color: '#354B40',
    },

    input: {
      minHeight: 52,

      borderWidth: 1,
      borderColor:
        '#D9E1DC',

      borderRadius: 13,

      paddingHorizontal: 14,

      fontSize: 16,

      backgroundColor:
        '#FAFCFB',

      color: '#17251E',
    },

    textArea: {
      minHeight: 100,
      paddingTop: 14,
      textAlignVertical:
        'top',
    },

    primaryButton: {
      minHeight: 54,

      marginTop: 18,

      paddingHorizontal: 20,

      alignItems: 'center',
      justifyContent:
        'center',

      borderRadius: 14,

      backgroundColor:
        '#16794B',
    },

    primaryButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
    },

    pressed: {
      opacity: 0.75,
    },

    disabled: {
      opacity: 0.55,
    },

    errorBox: {
      borderRadius: 12,
      padding: 12,
      marginTop: 4,

      backgroundColor:
        '#FFF1F0',
    },

    errorText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#A12821',
    },

    materialGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 18,
    },

    materialChip: {
      minHeight: 42,

      paddingHorizontal: 13,

      alignItems: 'center',
      justifyContent:
        'center',

      borderRadius: 21,

      borderWidth: 1,
      borderColor:
        '#D6E0DA',

      backgroundColor:
        '#FFFFFF',
    },

    materialChipSelected: {
      backgroundColor:
        '#173D2D',
      borderColor:
        '#173D2D',
    },

    materialText: {
      fontWeight: '700',
      color: '#40564B',
    },

    materialTextSelected: {
      color: '#FFFFFF',
    },

    pickupContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    pickupButton: {
      minHeight: 42,

      paddingHorizontal: 13,

      justifyContent:
        'center',

      borderRadius: 12,

      borderWidth: 1,

      borderColor:
        '#D6E0DA',
    },

    pickupButtonActive: {
      backgroundColor:
        '#E5F5EC',

      borderColor:
        '#16794B',
    },

    pickupText: {
      fontWeight: '700',
      color: '#5B6861',
    },

    pickupTextActive: {
      color: '#16794B',
    },

    pendingNotice: {
      marginTop: 15,

      fontSize: 13,
      lineHeight: 19,

      textAlign: 'center',

      color: '#748078',
    },

    successContainer: {
      flex: 1,

      padding: 28,

      justifyContent:
        'center',
      alignItems: 'center',

      backgroundColor:
        '#F4F7F5',
    },

    successIcon: {
      fontSize: 48,
      color: '#16794B',
      fontWeight: '900',
    },

    successTitle: {
      marginTop: 16,

      fontSize: 28,

      fontWeight: '800',

      textAlign: 'center',

      color: '#173D2D',
    },

    successText: {
      marginTop: 10,

      fontSize: 16,
      lineHeight: 24,

      textAlign: 'center',

      color: '#68756D',
    },

    recyclerIdCard: {
      width: '100%',

      marginTop: 26,

      padding: 22,

      borderRadius: 18,

      alignItems: 'center',

      backgroundColor:
        '#FFFFFF',
    },

    recyclerIdLabel: {
      fontSize: 12,

      fontWeight: '800',

      letterSpacing: 1.6,

      color: '#728078',
    },

    recyclerIdValue: {
      marginTop: 7,

      fontSize: 36,

      fontWeight: '900',

      color: '#16794B',
    },

    saveIdText: {
      marginTop: 18,

      fontSize: 14,
      lineHeight: 21,

      textAlign: 'center',

      color: '#68756D',
    },
  });