import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { checkApiKey } from '@/helpers/checkApiKey';
import { alertBookApiFailure } from '@/helpers/bookSearchAlert';
import { deleteData, setData } from '@/helpers/storage';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import { useApiKeyContext } from '@/providers/apiKeyProvider';

const MASK = '*********************';

/**
 * Per-source settings, kept off the settings page so it does not grow by a
 * whole section every time a provider is added.
 *
 * Only sources whose `hasSettings` is true ever open this.
 */
export default function BookSourceConfigModal({ sourceId, onClose }: { sourceId: BookSourceId | null; onClose: () => void }) {
  const [apiKey, setApiKey] = useApiKeyContext();
  const [accentColor] = useAccentColorContext();
  const { t } = useTranslation();

  const [draft, setDraft] = useState('');
  const [hidden, setHidden] = useState(true);

  const isVisible = sourceId !== null;

  useEffect(() => {
    if (isVisible) {
      setDraft(apiKey);
      setHidden(true);
    }
  }, [isVisible]);

  function save() {
    const candidate = draft.trim();
    checkApiKey(candidate).then((result) => {
      if (!result.ok) {
        alertBookApiFailure(result.kind, t);
        return;
      }
      setApiKey(candidate);
      setData('apiKey', candidate);
      onClose();
      Alert.alert(t('success'), t('api-key-updated'));
    });
  }

  function remove() {
    Alert.alert(t('confirm-delete-api-key'), t('confirm-delete-api-key-msg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'default',
        onPress: () => {
          setApiKey('');
          deleteData('apiKey');
          setDraft('');
        },
      },
    ]);
  }

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Google Books</Text>

        <Text style={styles.label}>{t('my-api-key')}</Text>
        <View style={styles.keyBox}>
          <Text style={styles.keyText}>{apiKey === '' ? t('no-api-key') : hidden ? MASK : apiKey}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setHidden(!hidden)}
          style={[styles.btn, { backgroundColor: accentColor }]}
        >
          <Text style={styles.btnText}>{hidden ? t('show') : t('hide')}</Text>
        </TouchableOpacity>

        <TextInput
          placeholder={t('enter-api-key')}
          placeholderTextColor={Colors.gray}
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          submitBehavior="blurAndSubmit"
          onSubmitEditing={save}
        />

        <TouchableOpacity
          onPress={save}
          style={[styles.btn, { backgroundColor: accentColor }]}
        >
          <Text style={styles.btnText}>{t('update').toUpperCase()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={remove}
          style={[styles.btn, { backgroundColor: accentColor }]}
        >
          <Text style={styles.btnText}>{t('delete-api-key')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light,
    borderRadius: 10,
    padding: 15,
    gap: 12,
  },

  heading: {
    color: Colors.dark,
    fontFamily: 'MontB',
    fontSize: 18,
    textAlign: 'center',
  },

  label: {
    color: Colors.dark,
    fontFamily: 'MontR',
    textAlign: 'center',
  },

  keyBox: {
    borderWidth: 1,
    borderColor: Colors.dark,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },

  keyText: {
    color: Colors.dark,
    fontFamily: 'MontR',
    textAlign: 'center',
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: Colors.dark,
    fontFamily: 'MontR',
  },

  btn: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 10,
  },

  btnText: {
    color: Colors.light,
    fontFamily: 'MontR',
    textAlign: 'center',
  },
});
