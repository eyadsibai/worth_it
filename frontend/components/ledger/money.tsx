"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/ledger/format-money";
import { useDisplayCurrency } from "@/lib/store";

interface MoneyProps {
  value: number;
  signed?: boolean;
  className?: string;
}

export function Money({ value, signed = false, className }: MoneyProps) {
  const locale = useLocale();
  const currency = useDisplayCurrency();
  return (
    <bdi dir="ltr" className={cn("font-mono tabular-nums", className)}>
      {formatMoney(value, { currency, locale, signed })}
    </bdi>
  );
}
