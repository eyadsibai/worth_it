import { Fragment, type ReactNode } from "react";

/**
 * Splits a fully-interpolated translation on sentinel tokens and re-inserts
 * the given nodes in their place. The sentinels travel through `t()` as
 * plain strings so ICU argument order — and RTL word order in Arabic — is
 * resolved by next-intl before this ever touches the string. `t.rich`'s
 * function values are reserved for `<tag>chunks</tag>` elements and are
 * never invoked for plain `{argument}` placeholders, which is what the
 * ledger's catalogs use throughout; this sidesteps that instead of fighting
 * it. Shared by any ledger component that needs to splice a rendered node
 * (e.g. a `<Money>` or a `<bdi>`) into an otherwise-plain translated
 * sentence — see `components/ledger/verdict-band.tsx` for the original use.
 */
export function interpolate(
  template: string,
  replacements: Record<string, ReactNode>
): ReactNode[] {
  const tokens = Object.keys(replacements);
  const pattern = new RegExp(`(${tokens.join("|")})`, "g");
  return template
    .split(pattern)
    .filter((part) => part !== "")
    .map((part, index) => (
      <Fragment key={index}>{part in replacements ? replacements[part] : part}</Fragment>
    ));
}
