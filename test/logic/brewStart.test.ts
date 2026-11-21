import { describe, expect, it } from 'vitest';
import { defaultBean, startFor } from '../../src/shared/logic/brewStart';
import type { BeanView, BrewView } from '../../src/shared/logic/model';

const brew = (id: string, rating: number | null, day: number, method = 'V60') =>
  ({ id, rating, method, date: new Date(2026, 10, day) }) as unknown as BrewView;
const bean = (id: string, status: string, brews: BrewView[]) => {
  const rated = brews.filter((b) => b.rating != null);
  let best: BrewView | null = null;
  for (const x of rated) if (!best || x.rating! > best.rating!) best = x;
  return { id, status, brews, best, last: brews[0] ?? null } as unknown as BeanView;
};

describe('where a new brew starts', () => {
  it('picks the one bag being drunk, the most recently brewed of several, or none', () => {
    const a = bean('a', 'drinking', [brew('a1', 7, 10)]);
    const b = bean('b', 'drinking', [brew('b1', 7, 15)]);
    const c = bean('c', 'resting', []);
    expect(defaultBean({ beans: [a, c] })?.id).toBe('a');
    expect(defaultBean({ beans: [a, b, c] })?.id).toBe('b');
    expect(defaultBean({ beans: [c] })).toBeNull();
  });

  it('starts from the best brew once one worked (7+), else the last; a fresh bag borrows', () => {
    const good = bean('g', 'drinking', [brew('g2', 5, 12), brew('g1', 8, 10)]);
    expect(startFor(good, { brews: [] })).toMatchObject({ why: 'best', brew: { id: 'g1' } });
    const dialing = bean('d', 'drinking', [brew('d2', 6, 12), brew('d1', 5, 10)]);
    expect(startFor(dialing, { brews: [] })).toMatchObject({ why: 'last', brew: { id: 'd2' } });
    const fresh = bean('f', 'drinking', []);
    const all = [brew('x2', 6, 14, 'V60'), brew('x1', 9, 9, 'V60'), brew('y1', 10, 8, 'AeroPress')];
    // Method from your last brew (V60), the best-rated V60 brew anywhere for the recipe.
    expect(startFor(fresh, { brews: all })).toMatchObject({ why: 'fresh', brew: { id: 'x1' } });
  });
});
