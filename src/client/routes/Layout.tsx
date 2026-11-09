import { NavLink, Outlet, useLocation } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { useSheets } from '../sheets/context';
import { useTabSwipe } from '../lib/tabSwipe';

const TABS: [string, string, IconName][] = [
  ['/', 'Home', 'home'],
  ['/journal', 'Journal', 'book'],
  ['/beans', 'Beans', 'bean'],
  ['/insights', 'Insights', 'chart'],
  ['/settings', 'Settings', 'settings'],
];

const TAB_PATHS = TABS.map(([to]) => to);

/** The tab whose page this is (swiping between tabs works there), or null elsewhere. */
function tabRoot(path: string): string | null {
  const p = path.replace(/\/+$/, '') || '/';
  return TAB_PATHS.includes(p) ? p : null;
}

function activeTab(path: string): string {
  for (const [p] of TABS.slice(1)) if (path.startsWith(p)) return p;
  return '/';
}

export function Brand() {
  return (
    <div className="brand serif">
      <span className="logo">
        <Icon name="coffee" size={21} strokeWidth={2} />
      </span>
      Ratio
    </div>
  );
}

/**
 * Phones (and the installed app): tabs along the bottom, a floating Log button, and a
 * solid band under the status bar. 768px and up: a sidebar with the same tabs.
 */
export function Layout() {
  const { pathname } = useLocation();
  const active = activeTab(pathname);
  useTabSwipe(TAB_PATHS, tabRoot(pathname));
  const sheets = useSheets();
  const tab = ([to, label, icon]: (typeof TABS)[number]) => (
    <NavLink key={to} to={to} aria-current={active === to ? 'page' : undefined}>
      <Icon name={icon} size={20} />
      {label}
    </NavLink>
  );
  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <button type="button" className="btn primary" onClick={() => sheets.log()}>
          <Icon name="plus" size={18} /> Log a brew
        </button>
        <nav aria-label="Main">{TABS.map(tab)}</nav>
        <button type="button" className="side-about" onClick={sheets.about}>
          <Icon name="info" size={18} /> About Ratio
        </button>
      </aside>
      {/* A solid strip under the status bar: iOS blurs whatever scrolls beneath it in installed
          apps, so the page scrolls under a plain bar instead (0 tall in a browser tab). */}
      <div className="statusband" aria-hidden />
      <main className="main">
        <Outlet />
      </main>
      <button type="button" className="fab" aria-label="Log a brew" onClick={() => sheets.log()}>
        <Icon name="plus" size={28} strokeWidth={2} />
      </button>
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-in">{TABS.map(tab)}</div>
      </nav>
    </div>
  );
}
