export type DisplayCurrency = "USD" | "SAR";

export interface FormatMoneyOptions {
  currency: DisplayCurrency;
  locale: string;
  signed?: boolean;
  compact?: boolean;
}

const COMPACT_THRESHOLD = 1_000_000;
const COMPACT_FRACTION_DIGITS = 1;

export function formatMoney(value: number, options: FormatMoneyOptions): string {
  const { currency, locale, signed = false } = options;
  const compact = options.compact ?? Math.abs(value) >= COMPACT_THRESHOLD;
  const formatter = new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: compact ? COMPACT_FRACTION_DIGITS : 0,
    ...(compact ? { notation: "compact" as const, compactDisplay: "short" as const } : {}),
    ...(signed ? { signDisplay: "exceptZero" as const } : {}),
  });
  return formatter.format(value);
}
