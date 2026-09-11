import {
  ActivityIndicator,
  Alert,
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
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getRecycler,
  updateRecycler,
} from '../../api/client';

import type {
  UpdateRecyclerPayload,
} from '../../api/client';

import {
  useAuth,
} from '../../services/auth';

import type {
  MaterialCategory,
  Recycler,
} from '../../types/auth';

import {
  MATERIAL_CATEGORIES,
} from '../../constants/materials';

import {
  useTranslation,
} from '../../../i18n/config';

import {
  StatusBadge,
} from '../../components/recycler/StatusBadge';

import {
  LanguageSelector,
} from '../../components/LanguageSelector';

export default function RecyclerProfileScreen() {
  const { t } = useTranslation();
  const {
    recyclerId,
    updateRecycler: updateStoredRecycler,
  } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [recycler, setRecycler] = useState<Recycler | null>(null);
  const [formData, setFormData] = useState<UpdateRecyclerPayload>({});

  const loadProfile = useCallback(async () => {
    if (!recyclerId) return;

    setIsLoading(true);

    try {
      const response = await getRecycler(recyclerId);
      
      setRecycler(response.data);
      
      setFormData({
        name: response.data.name,
        facility_location: response.data.facility_location ?? '',
        service_area: response.data.service_area ?? '',
        contact_details: response.data.contact_details ?? '',
        materials_accepted: response.data.materials_accepted ?? [],
        pickup_availability: response.data.pickup_availability ?? '',
      });
    } catch (error) {
      console.error('[RecyclerProfile]', error);
      Alert.alert(t('recyclerProfile.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [recyclerId, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!recyclerId || isSaving) return;

    setIsSaving(true);

    try {
      const response = await updateRecycler(recyclerId, formData);
      
      setRecycler(response.data);
      
      await updateStoredRecycler(response.data);
      
      setIsEditing(false);
      
      Alert.alert(t('recyclerProfile.saveSuccess'));
    } catch (error) {
      console.error('[RecyclerProfile]', error);
      Alert.alert(t('recyclerProfile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (recycler) {
      setFormData({
        name: recycler.name,
        facility_location: recycler.facility_location ?? '',
        service_area: recycler.service_area ?? '',
        contact_details: recycler.contact_details ?? '',
        materials_accepted: recycler.materials_accepted ?? [],
        pickup_availability: recycler.pickup_availability ?? '',
      });
    }
    setIsEditing(false);
  };

  const toggleMaterial = (matId: MaterialCategory) => {
    if (!isEditing) return;

    setFormData((prev) => {
      const current = prev.materials_accepted ?? [];
      
      if (current.includes(matId)) {
        return {
          ...prev,
          materials_accepted: current.filter((id) => id !== matId),
        };
      } else {
        return {
          ...prev,
          materials_accepted: [...current, matId],
        };
      }
    });
  };

  const getPickupLabel = (val: string | null | undefined) => {
    if (!val) return '—';
    const translated = t(`pickup.${val}` as any);
    if (translated && !translated.includes('pickup.')) {
      return translated;
    }
    return val.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16794B" />
        <Text style={styles.loadingText}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!recycler) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {t('recyclerProfile.loadError')}
        </Text>
        
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            {t('common.back')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const avatarLetter = recycler.name.charAt(0).toUpperCase() || 'R';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBack}
        >
          <Text style={styles.headerBackText}>
            ← {t('common.back')}
          </Text>
        </Pressable>

        <LanguageSelector />

        {!isEditing && (
          <Pressable
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>
              {t('common.edit')}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.pageTitle}>
        {t('recyclerProfile.title')}
      </Text>

      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {avatarLetter}
            </Text>
          </View>

          <View style={styles.badges}>
            <StatusBadge
              status={(recycler as any)?.account_status ?? 'active'}
            />
            
            <StatusBadge
              status={recycler.authorization_status}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t('recyclerDash.basicInfo')}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerDash.facilityName')}
          </Text>
          
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(val) => setFormData({ ...formData, name: val })}
              placeholder={t('recyclerDash.facilityName')}
            />
          ) : (
            <Text style={styles.value}>
              {recycler.name}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerDash.facilityLocation')}
          </Text>
          
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.facility_location}
              onChangeText={(val) => setFormData({ ...formData, facility_location: val })}
              placeholder={t('recyclerDash.facilityLocation')}
            />
          ) : (
            <Text style={styles.value}>
              {recycler.facility_location || '—'}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerDash.serviceArea')}
          </Text>
          
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.service_area}
              onChangeText={(val) => setFormData({ ...formData, service_area: val })}
              placeholder={t('recyclerDash.serviceArea')}
            />
          ) : (
            <Text style={styles.value}>
              {recycler.service_area || '—'}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerDash.contact')}
          </Text>
          
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={formData.contact_details}
              onChangeText={(val) => setFormData({ ...formData, contact_details: val })}
              placeholder={t('recyclerDash.contact')}
            />
          ) : (
            <Text style={styles.value}>
              {recycler.contact_details || '—'}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerProfile.pickupAvailability')}
          </Text>
          
          {isEditing ? (
            <View style={styles.chipsRow}>
              {['daily', 'weekly', 'on_request'].map((val) => {
                const isSelected = formData.pickup_availability === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => setFormData({ ...formData, pickup_availability: val })}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {getPickupLabel(val)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.value}>
              {getPickupLabel(recycler.pickup_availability)}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerProfile.authorizationNumber')}
          </Text>
          
          <Text style={styles.value}>
            {recycler.authorization_number || '—'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerProfile.authorizationIssueDate')}
          </Text>
          
          <Text style={styles.value}>
            {recycler.authorization_issue_date || '—'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {t('recyclerProfile.authorizationValidUntil')}
          </Text>
          
          <Text style={styles.value}>
            {recycler.authorization_valid_until || '—'}
          </Text>
        </View>

        <View style={styles.materialsSection}>
          <Text style={styles.sectionTitle}>
            {t('recyclerProfile.materials')}
          </Text>
          
          <Text style={styles.hintText}>
            {t('recyclerProfile.materialsHint')}
          </Text>

          <View style={styles.chipsRow}>
            {MATERIAL_CATEGORIES.map((mat) => {
              const isSelected = formData.materials_accepted?.includes(mat.id);

              const translatedLabel = t(`materials.${mat.id}` as any);
              const displayLabel = translatedLabel && !translatedLabel.includes('materials.') 
                ? translatedLabel 
                : mat.label;

              return (
                <Pressable
                  key={mat.id}
                  onPress={() => toggleMaterial(mat.id)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    !isEditing && !isSelected && styles.chipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                      !isEditing && !isSelected && styles.chipTextDisabled,
                    ]}
                  >
                    {mat.icon} {displayLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isEditing && (
          <View style={styles.actions}>
            <Pressable
              onPress={handleCancel}
              style={[styles.button, styles.cancelButton]}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>
                {t('common.cancel')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              style={[styles.button, styles.saveButton, isSaving && styles.saveButtonDisabled]}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? t('recyclerProfile.saving') : t('recyclerProfile.saveProfile')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F6',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 20,
  },
  headerBack: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  headerBackText: {
    fontSize: 16,
    color: '#16794B',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#16794B',
    fontWeight: '700',
    fontSize: 14,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#173D2D',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16794B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#173D2D',
    marginBottom: 16,
    marginTop: 10,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#68756D',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#173D2D',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1E0D7',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#173D2D',
    backgroundColor: '#FAFCFB',
  },
  materialsSection: {
    marginTop: 10,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E8F5EE',
  },
  hintText: {
    fontSize: 14,
    color: '#68756D',
    marginBottom: 16,
    marginTop: -8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#D1E0D7',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#16794B',
    borderColor: '#16794B',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#173D2D',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextDisabled: {
    color: '#68756D',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E8F5EE',
  },
  cancelButtonText: {
    color: '#16794B',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#16794B',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#68756D',
  },
  errorText: {
    fontSize: 16,
    color: '#E03E3E',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#16794B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
