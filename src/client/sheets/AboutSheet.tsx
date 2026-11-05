import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/ui';
import { useSheets } from './context';

const LINKS: [string, string, IconName][] = [
  ['https://github.com/tyler-class/ratio', 'Ratio on GitHub', 'github'],
  ['mailto:ratio@tylerclass.net', 'Questions or help? ratio@tylerclass.net', 'mail'],
  ['https://ko-fi.com/tylerclass', 'Ratio is free. Buy me a coffee to keep it that way ☕', 'coin'],
  ['https://tylerclass.net', 'tylerclass.net', 'link'],
];

export function AboutSheet() {
  const sheets = useSheets();
  return (
    <Sheet title="About Ratio" sub={`Version ${__APP_VERSION__}`} onClose={sheets.close}>
      <p style={{ marginTop: 0 }}>
        Ratio is a free, open-source coffee log: roasters, bags and every brew, with the numbers to
        dial in your next cup. It runs on your own Cloudflare account, so your data stays yours.
      </p>
      <p className="sub">Built by Tyler Class.</p>
      <div style={{ marginTop: 8 }}>
        {LINKS.map(([href, label, icon]) => (
          <a
            key={href}
            className="link-row"
            href={href}
            {...(href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noreferrer' })}
          >
            <Icon name={icon} size={18} />
            <span>{label}</span>
            <Icon name="chevRight" size={16} />
          </a>
        ))}
      </div>
    </Sheet>
  );
}
