import { Image, ImageStyle, StyleProp } from 'react-native';
import React, { useEffect, useState } from 'react';
import { processUrl } from '@/helpers/processUrl';

const bookCoverPlaceholder = require('@/assets/images/others/book-cover-placeholder.png');

/**
 * Single place where a book cover is rendered.
 *
 * The call sites this replaces tested `thumbnail !== ''`, which is true when the
 * field is `undefined` — so `<Image>` received `{ uri: undefined }` and drew an
 * empty frame instead of the placeholder. They also dereferenced `imageLinks`
 * without a guard, which throws for records saved by older versions of the app.
 *
 * `onError` covers the remaining case: a URI that is well formed but no longer
 * resolves, such as a cover stored in the ImagePicker cache before covers were
 * moved to the document directory.
 */
const BookCover = ({ uri, style }: { uri?: string | null; style?: StyleProp<ImageStyle> }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const resolved = !failed && uri ? processUrl(uri) : undefined;

  return (
    <Image
      style={style}
      source={resolved ? { uri: resolved } : bookCoverPlaceholder}
      onError={() => setFailed(true)}
    />
  );
};

export default BookCover;
