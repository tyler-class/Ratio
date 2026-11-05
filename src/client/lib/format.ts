import { r1 } from '@shared/logic/units';

const fmts = new Map<string, Intl.NumberFormat>();
function fmt(currency: string, digits: number) {
  const k = `${currency}:${digits}`;
  if (!fmts.has(k)) {
    try {
      fmts.set(
        k,
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }),
      );
    } catch {
      fmts.set(k, new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }));
    }
  }
  return fmts.get(k)!;
}

export const money = (n: number | null | undefined, currency: string) =>
  n == null ? '–' : fmt(currency, 2).format(n);
export const money0 = (n: number, currency: string) => fmt(currency, 0).format(Math.round(n));

/** "16.7" from a text input, or null. */
export function parseNum(s: string): number | null {
  const n = Number.parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const numStr = (n: number | null | undefined) => (n == null ? '' : String(r1(n)));

export const ellipsis = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);
