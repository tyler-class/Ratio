import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { statusOf } from '@shared/lookups';
import { r1 } from '@shared/logic/units';
import type { BeanView } from '@shared/logic/model';
import { useModel } from '../lib/queries';
import { BeanCard } from '../components/BeanCard';
import { Icon } from '../components/Icon';
import { Thumb } from '../components/Photos';
import { PageHeader, RB } from '../components/ui';
import { useSheets } from '../sheets/context';

const FILTERS: { k: string; label: string; f: (b: BeanView) => boolean }[] = [
  ...(['ordered', 'resting', 'freezing', 'drinking', 'finished'] as const).map((k) => {
    const st = statusOf(k)!;
    return { k, label: `${st.icon} ${st.label}`, f: (b: BeanView) => b.status === k };
  }),
  { k: 'all', label: 'All', f: () => true },
];

export function Beans() {
  const data = useModel();
  const sheets = useSheets();
  const [params, setParams] = useSearchParams();
  const view = params.get('v') === 'roasters' ? 'roasters' : 'beans';
  const filter = params.get('f') ?? 'drinking';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'rating' | 'name'>('recent');
  if (!data) return null;
  const { m } = data;
  const setParam = (k: string, v: string) =>
    setParams(
      (p) => {
        p.set(k, v);
        return p;
      },
      { replace: true },
    );
  const ql = q.trim().toLowerCase();

  const header = (
    <PageHeader
      title="Beans"
      action={
        <button
          type="button"
          className="btn primary sm"
          onClick={() => (view === 'roasters' ? sheets.roaster() : sheets.beanForm())}
        >
          <Icon name="plus" size={16} /> {view === 'roasters' ? 'Add roaster' : 'Add a bag'}
        </button>
      }
    />
  );
  const viewSwitch = (
    <div className="seg" style={{ marginBottom: 14 }}>
      <button
        type="button"
        className="chip"
        aria-pressed={view === 'beans'}
        onClick={() => setParam('v', 'beans')}
      >
        Bags
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={view === 'roasters'}
        onClick={() => setParam('v', 'roasters')}
      >
        Roasters {m.roasters.length}
      </button>
    </div>
  );

  if (view === 'roasters') {
    const rows = m.roasters
      .filter((r) => !ql || `${r.name} ${r.location ?? ''}`.toLowerCase().includes(ql))
      .map((r) => {
        const beans = m.beans.filter((b) => b.roaster_id === r.id);
        const ratings = beans.flatMap((b) => b.rated.map((x) => x.rating!));
        return {
          r,
          beans,
          avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        };
      });
    return (
      <div>
        {header}
        {viewSwitch}
        <input
          className="in search"
          type="search"
          placeholder="Search roasters"
          value={q}
          style={{ marginBottom: 14 }}
          onChange={(e) => setQ(e.target.value)}
        />
        {rows.length ? (
          <div className="card flat" style={{ padding: '4px 16px' }}>
            {rows.map(({ r, beans, avg }) => (
              <div className="ri" key={r.id}>
                <button type="button" className="rm" onClick={() => sheets.roaster(r.id)}>
                  {r.images[0] ? (
                    <Thumb img={r.images[0]} className="logo-img" />
                  ) : (
                    <span className="logo-img" style={{ display: 'grid', placeItems: 'center' }}>
                      <Icon name="store" size={20} />
                    </span>
                  )}
                  <div className="mid">
                    <div className="t1">{r.name}</div>
                    <div className="t2">
                      {[r.location, `${beans.length} ${beans.length === 1 ? 'bag' : 'bags'}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <RB v={avg != null ? r1(avg) : null} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No roasters yet.</div>
        )}
      </div>
    );
  }

  const cur = FILTERS.find((t) => t.k === filter) ?? FILTERS[0]!;
  const list = m.beans
    .filter(
      (b) =>
        cur.f(b) &&
        (!ql ||
          `${b.name} ${b.roasterName} ${b.tasting_notes ?? ''} ${b.origins.join(' ')} ${b.process ?? ''}`
            .toLowerCase()
            .includes(ql)),
    )
    .sort((a, b) => {
      if (sort === 'rating') return (b.avg ?? -1) - (a.avg ?? -1);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return (
        (b.last?.date.getTime() ?? b.created.getTime()) -
        (a.last?.date.getTime() ?? a.created.getTime())
      );
    });
  return (
    <div>
      {header}
      {viewSwitch}
      <div className="hscroll">
        {FILTERS.map((t) => (
          <button
            key={t.k}
            type="button"
            className="chip"
            aria-pressed={filter === t.k}
            onClick={() => setParam('f', t.k)}
          >
            {t.label} {m.beans.filter(t.f).length}
          </button>
        ))}
      </div>
      <div className="flexrow" style={{ margin: '14px 0' }}>
        <input
          className="in search"
          type="search"
          placeholder="Search beans, origin, notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg">
          {(
            [
              ['recent', 'Recent'],
              ['rating', 'Top rated'],
              ['name', 'A–Z'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              className="chip sm"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((b) => (
            <BeanCard key={b.id} b={b} m={m} />
          ))}
        </div>
      ) : (
        <div className="empty">Nothing here.</div>
      )}
    </div>
  );
}
