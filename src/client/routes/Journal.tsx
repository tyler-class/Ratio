import { useState } from 'react';
import { dayLabel } from '@shared/logic/dates';
import type { BrewView } from '@shared/logic/model';
import { useModel } from '../lib/queries';
import { BrewRow } from '../components/BrewRow';
import { PageHeader } from '../components/ui';

export function Journal() {
  const data = useModel();
  const [q, setQ] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [rated, setRated] = useState<'all' | 'rated' | 'unrated'>('all');
  const [limit, setLimit] = useState(40);
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return null;
  const { m, state } = data;
  const now = new Date();
  const ql = q.trim().toLowerCase();
  const methods = [...new Set(m.brews.map((b) => b.method).filter(Boolean) as string[])];
  const list = m.brews.filter((b) => {
    if (method && b.method !== method) return false;
    if (rated === 'rated' && b.rating == null) return false;
    if (rated === 'unrated' && b.rating != null) return false;
    if (
      ql &&
      !`#${b.num} ${b.beanName} ${b.roasterName} ${b.recipe_notes ?? ''} ${b.tasting_notes ?? ''} ${b.next_time ?? ''}`
        .toLowerCase()
        .includes(ql)
    )
      return false;
    return true;
  });
  const groups: { key: string; date: Date; items: BrewView[] }[] = [];
  for (const b of list.slice(0, limit)) {
    const g = groups[groups.length - 1];
    if (g && g.key === b.key) g.items.push(b);
    else groups.push({ key: b.key, date: b.date, items: [b] });
  }
  return (
    <div>
      <PageHeader title="Journal" icon="book" />
      <div className="flexrow">
        <input
          className="in search"
          type="search"
          placeholder="Search beans, roasters, notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg">
          {(['all', 'rated', 'unrated'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className="chip sm"
              aria-pressed={rated === k}
              onClick={() => setRated(k)}
            >
              {k[0]!.toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {methods.length > 1 && (
        <div className="seg" style={{ marginTop: 10 }}>
          {methods.map((o) => (
            <button
              key={o}
              type="button"
              className="chip sm"
              aria-pressed={method === o}
              onClick={() => setMethod(method === o ? null : o)}
            >
              {o}
            </button>
          ))}
        </div>
      )}
      <div className="sub" style={{ marginTop: 12 }}>
        {list.length} {list.length === 1 ? 'brew' : 'brews'}
      </div>
      {groups.map((g) => (
        <div key={g.key}>
          <div className="dayh">
            {dayLabel(g.date, now)} · {g.items.length}
          </div>
          <div className="card flat" style={{ padding: '4px 16px' }}>
            {g.items.map((b) => (
              <BrewRow
                key={b.id}
                b={b}
                s={state.settings}
                open={open === b.id}
                onToggle={() => setOpen(open === b.id ? null : b.id)}
              />
            ))}
          </div>
        </div>
      ))}
      {list.length === 0 && <div className="empty">No brews match.</div>}
      {list.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button type="button" className="btn" onClick={() => setLimit(limit + 40)}>
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
