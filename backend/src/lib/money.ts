// Server-side rupee formatting for notification copy.
//
// Deliberately minimal and locale-fixed: the apps do their own
// locale-aware formatting via Intl (see mobile-app/src/lib/format.ts).
// This exists only so a stored notification body reads as money rather
// than as a raw float, and it must never become a second, competing
// formatting system — anything the user can re-render client-side should
// carry the number, not the string.
export function formatMoney(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
