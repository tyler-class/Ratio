import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { fmtN } from '@shared/logic/units';
import type { Tone } from '@shared/lookups';
import { Icon } from './Icon';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

/** Rating badge, colored by band. */
export function RB({ v, big }: { v: number | null | undefined; big?: boolean }) {
  if (v == null) return <span className={cx('rb rb-none', big && 'big')}>–</span>;
  const c = v >= 8.5 ? 'top' : v >= 7 ? 'high' : v >= 5 ? 'mid' : 'low';
  return <span className={cx('rb', 'rb-' + c, big && 'big')}>{fmtN(v)}</span>;
}

export interface Opt<K extends string = string> {
  key: K;
  label: string;
  tone?: Tone;
}

/** A row of chips where one (or none, with allowClear) is chosen. */
export function Seg<K extends string>({
  opts,
  value,
  onChange,
  allowClear,
  small,
}: {
  opts: readonly Opt<K>[];
  value: K | null | undefined;
  onChange: (k: K | null) => void;
  allowClear?: boolean;
  small?: boolean;
}) {
  return (
    <div className="seg">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          className={cx('chip', small && 'sm', o.tone && 't-' + o.tone)}
          aria-pressed={value === o.key}
          onClick={() => onChange(allowClear && value === o.key ? null : o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const strOpts = (list: readonly string[]): Opt[] => list.map((s) => ({ key: s, label: s }));

/** Chips for known values plus "Other…" to type a new one. */
export function ChoiceInput({
  options,
  value,
  onChange,
  placeholder,
  small,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  small?: boolean;
}) {
  const known = options.some((o) => o === value);
  const [typing, setTyping] = useState(!!value && !known);
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={cx('chip', small && 'sm')}
          aria-pressed={!typing && value === o}
          onClick={() => {
            setTyping(false);
            onChange(value === o ? '' : o);
          }}
        >
          {o}
        </button>
      ))}
      {typing ? (
        <input
          className="in"
          style={{ maxWidth: 220, minHeight: 38 }}
          autoFocus={!value}
          value={value}
          placeholder={placeholder ?? 'Type one'}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <button
          type="button"
          className={cx('chip', small && 'sm')}
          onClick={() => {
            setTyping(true);
            onChange('');
          }}
        >
          Other…
        </button>
      )}
    </div>
  );
}

/** Pick several from suggestions, or type new ones (Enter or comma adds). */
export function TagInput({
  value,
  onChange,
  suggestions,
  decorate,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  decorate?: (s: string) => string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());
  const add = (s: string) => {
    const t = s.trim();
    if (t && !has(t)) onChange([...value, t]);
    setDraft('');
  };
  const q = draft.trim().toLowerCase();
  const shown = suggestions.filter((s) => !has(s) && (!q || s.toLowerCase().includes(q)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {value.length > 0 && (
        <div className="seg">
          {value.map((v) => (
            <button
              key={v}
              type="button"
              className="chip sm"
              aria-pressed
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              {decorate ? decorate(v) : v} <span className="x">✕</span>
            </button>
          ))}
        </div>
      )}
      <input
        className="in"
        value={draft}
        placeholder={placeholder ?? 'Type to add'}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) add(v.slice(0, -1));
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
      {shown.length > 0 && (
        <div className="hscroll">
          {shown.slice(0, 24).map((s) => (
            <button key={s} type="button" className="chip sm" onClick={() => add(s)}>
              {decorate ? decorate(s) : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stat({ v, l, d }: { v: ReactNode; l: string; d?: ReactNode }) {
  return (
    <div className="stat">
      <div className="v">{v}</div>
      <div className="l">{l}</div>
      {d ? <div className="d">{d}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('fg', className)}>
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

/** Two taps to delete: the first arms it, the second confirms. */
export function ConfirmButton({
  children,
  confirm,
  onConfirm,
  className,
}: {
  children: ReactNode;
  confirm: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={cx('btn ghost danger', className)}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      <Icon name="trash" size={16} />
      {armed ? confirm : children}
    </button>
  );
}

/**
 * A sheet that rises from the bottom on phones (drag the handle down to dismiss, up to
 * expand) and opens as a centered dialog on wider screens.
 */
export function Sheet({
  title,
  sub,
  onClose,
  children,
  footer,
}: {
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const drag = useRef<{ y: number; t: number } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const grab = {
    onPointerDown: (e: React.PointerEvent) => {
      if (window.matchMedia('(min-width: 640px)').matches) return;
      if ((e.target as HTMLElement).closest('button')) return;
      drag.current = { y: e.clientY, t: performance.now() };
      setDragging(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* best-effort */
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return;
      const d = e.clientY - drag.current.y;
      setDy(d > 0 ? d : -Math.sqrt(-d) * 4);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag.current) return;
      const d = e.clientY - drag.current.y;
      const speed = d / Math.max(1, performance.now() - drag.current.t);
      drag.current = null;
      setDragging(false);
      setDy(0);
      if (d > 120 || speed > 0.6) {
        if (expanded && d < 260 && speed <= 0.6) setExpanded(false);
        else onClose();
      } else if (d < -40) setExpanded(true);
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragging(false);
      setDy(0);
    },
  };

  return (
    <div className="ov">
      <div
        className="scrim"
        style={{ opacity: dy > 0 ? Math.max(0.2, 1 - dy / 500) : 1 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('sheet', expanded && 'expanded')}
        style={{
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: dragging ? 'none' : 'transform .22s ease, height .22s ease',
        }}
      >
        <div className="sh-grab" {...grab}>
          <div className="handle" />
          <div className="sh-head">
            <div style={{ minWidth: 0 }}>
              <h2 id={titleId}>{title}</h2>
              {sub ? <div className="sub">{sub}</div> : null}
            </div>
            <button type="button" className="xbtn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="sh-body">{children}</div>
        {footer ? <div className="sh-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function PageHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-h">
      <h1>{title}</h1>
      {action}
    </header>
  );
}
