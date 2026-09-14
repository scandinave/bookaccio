/**
 * Renders a book's categories as a single `/`-separated string.
 *
 * Google Books returns entries like "Fiction / Fantasy", so the list is
 * re-split and de-duplicated. `categories` is optional on `Book` and absent
 * from records saved by older versions, hence the tolerant signature.
 */
export const formatCategories = (categories?: string[]): string => {
  if (!categories?.length) return '';
  const parts = categories
    .join(' /')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(parts)].join('/');
};
