export const formatDate = (date: Date | undefined) => {
  if (!date) return '';
  const dateMSEC = Date.parse(date.toString());
  // A record saved without startDate/endDate yields `new Date(undefined)`, whose
  // timestamp is NaN; toISOString() would throw RangeError on it.
  if (Number.isNaN(dateMSEC)) return '';
  const isoDate = new Date(dateMSEC).toISOString();
  return isoDate.slice(0, isoDate.indexOf('T')).split('-').reverse().join('-');
};
