// Locale-aware formatting per Part G — "not just static labels, but also
// formatted currency/date per locale". Currency is always INR (India),
// but grouping/digit conventions still differ by locale.

const LOCALE_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export function formatCurrency(amount: number, language: string): string {
  const locale = LOCALE_MAP[language] ?? "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

export function formatDateTime(iso: string, language: string): string {
  const locale = LOCALE_MAP[language] ?? "en-IN";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function formatDate(iso: string, language: string): string {
  const locale = LOCALE_MAP[language] ?? "en-IN";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(iso)
    );
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}
