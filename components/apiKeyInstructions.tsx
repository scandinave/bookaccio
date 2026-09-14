import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAccentColorContext } from '@/providers/accentColorProvider';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

const CONSOLE_URL = 'https://console.cloud.google.com/';

export default function ApiKeyInstructions() {
  const [accentColor] = useAccentColorContext();

  const { t } = useTranslation();

  const handleLink = (url: string) => {
    WebBrowser.openBrowserAsync(url);
  };

  const Step = ({ title, bullets }: { title: string; bullets: string[] }) => (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {bullets.map((bullet) => (
        <Text
          key={bullet}
          style={styles.text}
        >
          • {bullet}
        </Text>
      ))}
    </View>
  );

  return (
    <ScrollView style={[styles.container]}>
      <View style={[styles.section]}>
        <Text style={[styles.title, styles.bold, { color: accentColor }]}>{t('api-help-title')}</Text>
      </View>

      <View style={[styles.section]}>
        <Text style={styles.text}>
          <Text style={styles.bold}>{t('api-help-prereq-label')}</Text> {t('api-help-prereq')}
        </Text>
      </View>

      <View style={[styles.section]}>
        <Text style={styles.heading}>{t('api-help-step1-title')}</Text>
        <Text style={styles.text}>
          • {t('api-help-step1-a')}{' '}
          <Text
            style={{ color: accentColor, fontWeight: 'bold' }}
            onPress={() => handleLink(CONSOLE_URL)}
          >
            Google Cloud Console
          </Text>{' '}
          {t('api-help-step1-b')}
        </Text>
      </View>

      <Step
        title={t('api-help-step2-title')}
        bullets={[t('api-help-step2-a'), t('api-help-step2-b'), t('api-help-step2-c')]}
      />
      <Step
        title={t('api-help-step3-title')}
        bullets={[t('api-help-step3-a'), t('api-help-step3-b'), t('api-help-step3-c')]}
      />
      <Step
        title={t('api-help-step4-title')}
        bullets={[t('api-help-step4-a'), t('api-help-step4-b'), t('api-help-step4-c'), t('api-help-step4-d')]}
      />
      <Step
        title={t('api-help-step5-title')}
        bullets={[t('api-help-step5-a'), t('api-help-quota')]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '70%',
  },

  section: {
    marginVertical: 5,
  },

  title: {
    textAlign: 'center',
    fontSize: 18,
  },

  bold: {
    fontWeight: 'bold',
  },

  heading: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  text: {
    fontSize: 15,
  },
});
