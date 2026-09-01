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

// Indian short-scale abbreviation (thousand / lakh / crore), used for the
// aggregate impact figures where an exact rupee amount is noise.
// Implemented by hand rather than via Intl's `notation: "compact"`:
// Hermes ships a reduced Intl, and a silent fallback to full digits would
// break the layout these numbers sit in.
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${trimZero(value / 1e7)}Cr`;
  if (abs >= 1e5) return `${trimZero(value / 1e5)}L`;
  if (abs >= 1e3) return `${trimZero(value / 1e3)}K`;
  return String(Math.round(value));
}

export function formatCompactCurrency(value: number): string {
  return `₹${formatCompact(value)}`;
}

function trimZero(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
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
