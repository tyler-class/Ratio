import { describe, expect, it } from 'vitest';
import { buildModel } from '../../src/shared/logic/model';
import {
  beansLow,
  beansLowNotice,
  LOW_DAYS,
  lowBody,
  lowSince,
  NOTIFY_KINDS,
} from '../../src/shared/logic/notify';
import type { AppState, Bean, Brew } from '../../src/shared/types';

const NOW = new Date(2026, 10, 9, 9, 0);
const ago = (d: number) => new Date(2026, 10, 9 - d, 7, 0).toISOString();

function bean(p: Partial<Bean>): Bean {
  return {
    id: 'b1',
    name: 'Kenya',
    roaster_id: null,
    status: 'drinking',
    roasted_on: null,
    received_on: null,
    rest_until: null,
    thawed_on: null,
    finished_on: null,
    tasting_notes: null,
    roaster_notes: null,
    origins: [],
    varieties: [],
    region: null,
    process: null,
    process_notes: null,
    altitude: null,
    bag_g: 250,
    cost: null,
    notes: null,
    buy_again: null,
    images: [],
    created_at: ago(40),
    ...p,
  };
}

let n = 0;
function brew(p: Partial<Brew>): Brew {
  n++;
  return {
    rating_skipped: false,
    id: `x${n}`,
    num: n,
    bean_id: 'old',
    brewed_at: ago(0),
    method: 'V60',
    grinder: null,
    grind: null,
    dose_g: 20,
    water_ml: 320,
    water_temp_c: null,
    recipe_notes: null,
    rating: null,
    extraction: null,
    strength: null,
    tasting_notes: null,
    next_time: null,
    ...p,
  };
}

const state = (beans: Bean[], brews: Brew[]): AppState => ({
  settings: {
    methods: [],
    grinders: [],
    temp_unit: 'F',
    currency: 'USD',
    currency_set: true,
    time_zone: 'UTC',
    insights_layout: [],
    telemetry: true,
    updates_set_up: false,
  },
  roasters: [],
  beans,
  brews,
});

// One 20 g brew a day for the last 28 days, all from a finished bag: 20 g a day.
const daily = Array.from({ length: 28 }, (_, d) => brew({ brewed_at: ago(d) }));
const done = bean({ id: 'old', status: 'finished', bag_g: 560 });
/** The model with `grams` left in an open bag (plus any other bags). */
const withStock = (grams: number, more: Bean[] = []) =>
  buildModel(state([done, bean({ bag_g: grams }), ...more], daily), NOW);

describe('beans running low', () => {
  it('has one kind, with a one-line description', () => {
    expect(NOTIFY_KINDS.map((k) => k.id)).toEqual(['beans']);
    expect(NOTIFY_KINDS[0].label).toBe('Beans running low');
    expect(NOTIFY_KINDS[0].description).toMatch(/^[^.]+\.$/);
  });

  it('uses the model’s runway: live grams ÷ grams a day over 28 days', () => {
    const m = withStock(180, [bean({ id: 'f', status: 'freezing', bag_g: 100 })]);
    expect(m.burn).toBe(20);
    expect(m.runway).toBe(14);
    expect(beansLow(m)).toBe(false); // exactly 14 days isn't low
    expect(beansLow(withStock(279))).toBe(true); // 13.95 days
    expect(beansLow(withStock(400))).toBe(false);
  });

  it('counts resting, frozen and open bags, but not finished ones', () => {
    expect(withStock(100, [bean({ id: 'r', status: 'resting', bag_g: 200 })]).runway).toBe(15);
    expect(withStock(100, [bean({ id: 'x', status: 'finished', bag_g: 200 })]).runway).toBe(5);
  });

  it('is still low with a bag on order (not in hand yet), but not with no recent brews', () => {
    expect(beansLow(withStock(100))).toBe(true);
    const ordered = withStock(100, [bean({ id: 'o', status: 'ordered', bag_g: 340 })]);
    expect(ordered.runway).toBe(5);
    expect(beansLow(ordered)).toBe(true);
    const idle = buildModel(state([bean({ bag_g: 50 })], []), NOW);
    expect(idle.runway).toBeNull();
    expect(beansLow(idle)).toBe(false);
  });

  it('words the days left', () => {
    expect(lowBody(9.4)).toBe('About 9 days of coffee left. Time to order more.');
    expect(lowBody(1.2)).toBe('About 1 day of coffee left. Time to order more.');
    expect(lowBody(0)).toBe('You’re about out of coffee. Time to order more.');
    expect(beansLowNotice(9, '2026-11-09')).toEqual({
      kind: 'beans',
      key: 'low-2026-11-09',
      title: 'Beans running low',
      body: 'About 9 days of coffee left. Time to order more.',
      url: '/beans',
      tag: 'beans-low',
    });
  });

  it('sends once per drop: crossing, staying low, recovering, dropping again', () => {
    // Each day's runway, and what a device gets that day (the worker skips a spell it's sent).
    const days: [string, number][] = [
      ['2026-11-01', 20],
      ['2026-11-02', 13], // crosses under 14: sent
      ['2026-11-03', 12], // still low: not again
      ['2026-11-04', 10], // still low: not again
      ['2026-11-05', 15], // a new bag: recovered
      ['2026-11-06', 14], // at 14 counts as recovered too
      ['2026-11-07', 9], // drops again: sent again
      ['2026-11-08', 8],
    ];
    let since: string | null = null;
    const sent = new Set<string>();
    const got: string[] = [];
    for (const [today, runway] of days) {
      since = lowSince(since, runway < LOW_DAYS, today);
      if (!since) continue;
      const notice = beansLowNotice(runway, since);
      if (sent.has(notice.key)) continue;
      sent.add(notice.key);
      got.push(`${today}: ${notice.body}`);
    }
    expect(got).toEqual([
      '2026-11-02: About 13 days of coffee left. Time to order more.',
      '2026-11-07: About 9 days of coffee left. Time to order more.',
    ]);
    expect(since).toBe('2026-11-07');
  });
});
