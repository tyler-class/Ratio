// Where a new brew starts: which bag, and which earlier brew its recipe is copied from.
import type { BeanView, BrewView, Model } from './model';

/** A rating at or above this is "that one worked": a recipe worth going back to. */
export const GOOD_RATING = 7;

/**
 * The bag a new brew is for when none was picked: the one bag you're drinking, or of several,
 * the one you brewed most recently. With none being drunk, none (you choose).
 */
export function defaultBean(m: Pick<Model, 'beans'>): BeanView | null {
  const drinking = m.beans.filter((b) => b.status === 'drinking');
  if (drinking.length <= 1) return drinking[0] ?? null;
  const lastAt = (b: BeanView) => b.last?.date.getTime() ?? 0;
  return [...drinking].sort((a, b) => lastAt(b) - lastAt(a))[0]!;
}

export type StartWhy = 'best' | 'last' | 'fresh';

export interface BrewStart {
  /** The brew to copy, or for a fresh bag the brew to borrow method, ratio and temperature from. */
  brew: BrewView | null;
  why: StartWhy;
}

/**
 * The recipe a new brew of a bag starts from:
 * - its best brew, when one was rated GOOD_RATING or higher (a recipe that worked);
 * - else its most recent brew (still dialing in: the latest attempt is closest);
 * - a bag never brewed: your method from last time, with the ratio and temperature of your
 *   best-rated brew with that method on any bag (the grind is left empty: every bag differs).
 */
export function startFor(bean: BeanView, m: Pick<Model, 'brews'>): BrewStart {
  if (bean.best && (bean.best.rating ?? 0) >= GOOD_RATING) return { brew: bean.best, why: 'best' };
  if (bean.last) return { brew: bean.last, why: 'last' };
  const method = m.brews[0]?.method ?? null;
  const same = m.brews.filter((b) => b.rating != null && (!method || b.method === method));
  const top = same.reduce<BrewView | null>((t, b) => (!t || b.rating! > t.rating! ? b : t), null);
  return { brew: top ?? m.brews[0] ?? null, why: 'fresh' };
}
