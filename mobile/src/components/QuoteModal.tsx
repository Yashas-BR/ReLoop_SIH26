import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useEffect, useState } from 'react';

interface QuoteModalProps {
  visible: boolean;

  loading: boolean;

  title: string;

  amountLabel: string;

  notesLabel: string;

  cancelLabel: string;

  submitLabel: string;

  invalidAmountMessage: string;

  onClose: () => void;

  onSubmit: (
    amount: number,
    notes: string,
  ) => Promise<void>;
}

export function QuoteModal({
  visible,
  loading,
  title,
  amountLabel,
  notesLabel,
  cancelLabel,
  submitLabel,
  invalidAmountMessage,
  onClose,
  onSubmit,
}: QuoteModalProps) {
  const [amount, setAmount] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!visible) {
      setAmount('');
      setNotes('');
      setError('');
    }
  }, [visible]);

  async function handleSubmit() {
    const parsed =
      Number(amount.trim());

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      setError(
        invalidAmountMessage,
      );

      return;
    }

    setError('');

    await onSubmit(
      parsed,
      notes.trim(),
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={
        loading
          ? undefined
          : onClose
      }
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.label}>
            {amountLabel}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.rupee}>
              ₹
            </Text>

            <TextInput
              editable={!loading}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              style={styles.amountInput}
            />
          </View>

          <Text style={styles.label}>
            {notesLabel}
          </Text>

          <TextInput
            editable={!loading}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            style={styles.notes}
          />

          {!!error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}

          <View style={styles.buttons}>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={styles.cancel}
            >
              <Text
                style={styles.cancelText}
              >
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={() =>
                void handleSubmit()
              }
              style={[
                styles.submit,
                loading &&
                styles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.submitText
                  }
                >
                  {submitLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,

    padding: 22,

    justifyContent: 'center',

    backgroundColor:
      'rgba(0,0,0,0.45)',
  },

  modal: {
    padding: 22,

    borderRadius: 24,

    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 22,

    fontWeight: '900',

    color: '#173D2D',
  },

  label: {
    marginTop: 18,

    marginBottom: 7,

    fontSize: 13,

    fontWeight: '800',

    color: '#54675C',
  },

  amountRow: {
    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,

    borderColor: '#D7E1DA',

    borderRadius: 14,

    backgroundColor: '#FAFCFB',
  },

  rupee: {
    paddingLeft: 14,

    fontSize: 20,

    fontWeight: '900',

    color: '#173D2D',
  },

  amountInput: {
    flex: 1,

    minHeight: 54,

    paddingHorizontal: 10,

    fontSize: 18,

    fontWeight: '800',

    color: '#173D2D',
  },

  notes: {
    minHeight: 100,

    padding: 13,

    borderWidth: 1,

    borderColor: '#D7E1DA',

    borderRadius: 14,

    textAlignVertical: 'top',

    backgroundColor: '#FAFCFB',

    color: '#173D2D',
  },

  error: {
    marginTop: 10,

    color: '#B3362D',

    fontWeight: '700',
  },

  buttons: {
    marginTop: 24,

    flexDirection: 'row',

    gap: 10,
  },

  cancel: {
    flex: 1,

    minHeight: 50,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#D7E1DA',

    borderRadius: 14,
  },

  cancelText: {
    fontWeight: '800',

    color: '#65736B',
  },

  submit: {
    flex: 1,

    minHeight: 50,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: 14,

    backgroundColor: '#16794B',
  },

  submitText: {
    fontWeight: '900',

    color: '#FFFFFF',
  },

  disabled: {
    opacity: 0.6,
  },
});