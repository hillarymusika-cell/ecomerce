/** Store currency — Ugandan Shilling */
export const DEFAULT_CURRENCY = "UGX";

/**
 * Format money for display.
 * UGX is shown without fractional cents (common retail practice).
 */
export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();

  try {
    if (code === "UGX") {
      return new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(Math.round(value));
    }
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const whole = code === "UGX" ? Math.round(value) : value;
    return `${code} ${Number(whole).toLocaleString()}`;
  }
}

export function moneyParts(amount, currency = DEFAULT_CURRENCY) {
  return {
    currency: (currency || DEFAULT_CURRENCY).toUpperCase(),
    amount: Number(amount) || 0,
    label: formatMoney(amount, currency),
  };
}
