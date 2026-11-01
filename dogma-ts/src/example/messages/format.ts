// Map of `<locale>|<currency>` to `Intl.NumberFormat`.
const currencyFormatters = new Map<string, Intl.NumberFormat>();

// formatAmount formats a cent amount as dollars.
export function formatAmount(
  value: bigint,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  // Format as USD in the en-US locale
  return getCurrencyFormatter(locale, currency).format(Number(value) / 100);
}

function getCurrencyFormatter(
  locale: string,
  currency: string,
): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    currencyFormatters.set(key, formatter);
  }
  return formatter;
}
