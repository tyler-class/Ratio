// What Ratio's notification says and when: "Beans running low", once each time the coffee on
// hand drops under two weeks. Runway is the model's (model.ts): grams left in resting, frozen
// and open bags ÷ average grams brewed per day over the last 28 days.
// Sending, the 8 a.m. timing and once-a-day are the Selfhost Kit's (src/worker/kit/push.ts).
import type { Model } from './model';

/** The kinds of notification, each with its own switch in Settings. */
export const NOTIFY_KINDS = [
  {
    id: 'beans',
    label: 'Beans running low',
    description: 'Under two weeks of coffee left.',
  },
] as const;

export type NotifyKind = (typeof NOTIFY_KINDS)[number]['id'];

/** Ratio has no app-icon count. */
export const BADGE_MEANS = undefined;

/** Under this many days of runway counts as low. */
export const LOW_DAYS = 14;

export interface Notice {
  kind: NotifyKind;
  /** The low spell it's about ("low-2026-11-09"): sent once per spell, not once a day. */
  key: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

/**
 * Beans are low when the runway is under LOW_DAYS days and nothing is on order (a bag on the
 * way means you've already ordered more). No recent brews means no runway, so not low.
 */
export function beansLow(m: Pick<Model, 'runway' | 'beans'>): boolean {
  if (m.runway == null || m.runway >= LOW_DAYS) return false;
  return !m.beans.some((b) => b.status === 'ordered');
}

/**
 * The current low spell after this run: the date it started (kept while it stays low), or null
 * once the runway is back at or above LOW_DAYS. A new drop starts a new spell, so it's sent again.
 */
export function lowSince(prev: string | null, low: boolean, today: string): string | null {
  return low ? (prev ?? today) : null;
}

/** "About 9 days of coffee left. Time to order more." */
export function lowBody(runway: number): string {
  const days = Math.round(runway);
  if (runway < 0.5) return 'You’re about out of coffee. Time to order more.';
  return `About ${days} ${days === 1 ? 'day' : 'days'} of coffee left. Time to order more.`;
}

/** The notification for a low spell that started on `since`. */
export function beansLowNotice(runway: number, since: string): Notice {
  return {
    kind: 'beans',
    key: `low-${since}`,
    title: 'Beans running low',
    body: lowBody(runway),
    url: '/beans',
    tag: 'beans-low',
  };
}
