import { Alert } from 'react-native';
import { BookApiErrorKind } from './googleBooksApi';

type Translate = (key: string) => string;

const MESSAGES: Record<BookApiErrorKind, [titleKey: string, bodyKey: string]> = {
  'missing-key': ['api-key-missing', 'api-key-missing-msg'],
  auth: ['api-key-error', 'api-key-error-msg'],
  'rate-limit': ['rate-limit-error', 'rate-limit-error-msg'],
  network: ['network-error', 'network-error-msg'],
  server: ['server-error', 'server-error-msg'],
  'invalid-isbn': ['invalid-isbn', 'invalid-isbn-msg'],
  unknown: ['error', 'unexpected-error-msg'],
};

export function alertBookApiFailure(kind: BookApiErrorKind, t: Translate): void {
  const [titleKey, bodyKey] = MESSAGES[kind] ?? MESSAGES.unknown;
  Alert.alert(t(titleKey), t(bodyKey));
}

/** Deliberately distinct from alertBookApiFailure: this one means the search worked. */
export function alertNoResult(t: Translate, context: 'title' | 'isbn'): void {
  Alert.alert(t('book-not-found'), context === 'title' ? t('no-book-add-manually') : t('try-search-or-add'));
}
