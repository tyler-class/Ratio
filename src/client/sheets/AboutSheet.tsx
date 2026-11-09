import { aboutLinks, BUILT_BY, type AboutLinkKind } from '../kit/about';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/ui';
import { useSheets } from './context';

const LINKS = aboutLinks({
  title: 'Ratio',
  repo: 'tyler-class/ratio',
  email: 'ratio@tylerclass.net',
});
const ICONS: Record<AboutLinkKind, IconName> = {
  github: 'github',
  email: 'mail',
  coffee: 'coffee',
  site: 'link',
};

/** About Ratio: version, what it is, who built it, and links (Selfhost Kit layout). */
export function AboutSheet() {
  const sheets = useSheets();
  return (
    <Sheet title="About Ratio" sub={`Version ${__APP_VERSION__}`} onClose={sheets.close}>
      <p style={{ marginTop: 0 }}>
        Ratio is a free, open-source coffee log: roasters, bags and every brew, with the numbers to
        dial in your next cup. It runs on your own Cloudflare account, so your data stays yours.
      </p>
      <p className="sub">{BUILT_BY}</p>
      <div style={{ marginTop: 8 }}>
        {LINKS.map((l) => (
          <a
            key={l.href}
            className="link-row"
            href={l.href}
            {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            <Icon name={ICONS[l.kind]} size={18} />
            <span>{l.label}</span>
            <Icon name="chevRight" size={16} />
          </a>
        ))}
      </div>
    </Sheet>
  );
}
