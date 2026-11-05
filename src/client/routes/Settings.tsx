import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_METHODS } from '@shared/lookups';
import { api, errorMessage } from '../lib/api';
import { useActions, useModel } from '../lib/queries';
import { useTheme } from '../lib/theme';
import { useToast } from '../components/Toast';
import { Icon } from '../components/Icon';
import { ConfirmButton, PageHeader, Seg, TagInput } from '../components/ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sec">
      <div className="sec-h">
        <h2>{title}</h2>
      </div>
      <div className="card flat">{children}</div>
    </section>
  );
}

export function Settings() {
  const data = useModel();
  const actions = useActions();
  const [theme, setTheme] = useTheme();
  if (!data) return null;
  const s = data.state.settings;
  return (
    <div>
      <PageHeader title="Settings" icon="settings" />
      <Section title="Equipment">
        <div className="fg">
          <label className="lbl">Brew methods</label>
          <TagInput
            value={s.methods}
            suggestions={[
              ...DEFAULT_METHODS,
              'Chemex',
              'Kalita Wave',
              'French Press',
              'Moka Pot',
              'Origami',
              'Orea',
              'Switch',
            ]}
            placeholder="Add a method"
            onChange={(methods) => actions.saveSettings({ methods })}
          />
        </div>
        <div>
          <label className="lbl">Grinders</label>
          <TagInput
            value={s.grinders}
            suggestions={[
              'Fellow Ode',
              'Fellow Opus',
              'Baratza Encore',
              'Comandante C40',
              '1Zpresso J-Max',
              'Niche Zero',
              'DF64',
            ]}
            placeholder="Add a grinder"
            onChange={(grinders) => actions.saveSettings({ grinders })}
          />
        </div>
      </Section>
      <Section title="Appearance">
        <Seg
          opts={[
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
            { key: 'system', label: 'System' },
          ]}
          value={theme}
          onChange={(k) => k && setTheme(k)}
        />
      </Section>
      <Section title="Units">
        <div className="fg">
          <label className="lbl">Water temperature</label>
          <Seg
            opts={[
              { key: 'F', label: '°F' },
              { key: 'C', label: '°C' },
            ]}
            value={s.temp_unit}
            onChange={(k) => k && actions.saveSettings({ temp_unit: k })}
          />
        </div>
        <div>
          <label className="lbl">Currency</label>
          <CurrencyInput
            value={s.currency}
            onSave={(currency) => actions.saveSettings({ currency })}
          />
        </div>
      </Section>
      <ConnectAI />
      <Section title="Install on your phone">
        <InstallHint />
      </Section>
      <Backup />
      <Section title="About">
        <p className="sub" style={{ marginTop: 0 }}>
          Ratio is a free, open-source coffee log. Built by{' '}
          <a href="https://tylerclass.net" target="_blank" rel="noreferrer">
            Tyler Class
          </a>
          .
        </p>
        <a className="kofi" href="https://ko-fi.com/tylerclass" target="_blank" rel="noreferrer">
          <Icon name="coffee" size={18} />
          <span>If you want to say thank you, coffee is my love language</span>
          <Icon name="chevRight" size={16} />
        </a>
      </Section>
      <Section title="Account">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await api.post('/logout');
            window.location.reload();
          }}
        >
          <Icon name="logout" size={16} /> Sign out
        </button>
        <p className="sub" style={{ marginBottom: 0 }}>
          Ratio {__APP_VERSION__} ·{' '}
          <a href="https://github.com/tyler-class/ratio" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
      </Section>
    </div>
  );
}

function CurrencyInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      className="in"
      style={{ maxWidth: 120, textTransform: 'uppercase' }}
      value={v}
      maxLength={3}
      onChange={(e) => setV(e.target.value.toUpperCase())}
      onBlur={() => /^[A-Z]{3}$/.test(v) && v !== value && onSave(v)}
    />
  );
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the text is selectable */
        }
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={15} /> {done ? 'Copied' : 'Copy'}
    </button>
  );
}

const codeStyle = {
  display: 'block',
  overflowX: 'auto' as const,
  whiteSpace: 'nowrap' as const,
  background: 'var(--surface2)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13,
  userSelect: 'all' as const,
  flex: 1,
  minWidth: 0,
};

function ConnectAI() {
  const url = `${window.location.origin}/mcp`;
  const cli = `claude mcp add --transport http ratio ${url}`;
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ['connections'],
    queryFn: () =>
      api.get<{ connections: { id: string; name: string; created_at: string | null }[] }>(
        '/connections',
      ),
  });
  const list = q.data?.connections ?? [];
  return (
    <Section title="Connect an AI assistant">
      <p style={{ marginTop: 0 }}>
        Let Claude, ChatGPT or any assistant that supports MCP read your log and log, rate and
        update brews, bags and roasters for you. Try “log a V60 of the Kenya, 8 out of 10, a bit
        sour”, “which origins do I rate highest?” or “add a photo of the new bag”. For photos the
        assistant gives you a link to tap and snap.
      </p>
      <label className="lbl">Your connector URL</label>
      <div className="flexrow" style={{ flexWrap: 'nowrap' }}>
        <code style={codeStyle}>{url}</code>
        <Copy text={url} />
      </div>
      <div className="callout" style={{ margin: '14px 0' }}>
        When you connect, a Ratio sign-in page opens. Enter your Ratio password there to approve the
        assistant.
      </div>
      <h3 style={{ fontSize: 16, marginTop: 16 }}>Claude (web, desktop, mobile)</h3>
      <ol className="sub" style={{ paddingLeft: 20 }}>
        <li>Open Settings → Connectors and choose “Add custom connector”.</li>
        <li>Name it Ratio and paste the URL above.</li>
        <li>Choose Connect, then enter your password on the Ratio page.</li>
      </ol>
      <h3 style={{ fontSize: 16 }}>ChatGPT</h3>
      <ol className="sub" style={{ paddingLeft: 20 }}>
        <li>
          In Settings, add a custom connector (MCP server). Your plan may need developer mode.
        </li>
        <li>Paste the URL above and choose OAuth sign-in.</li>
      </ol>
      <h3 style={{ fontSize: 16 }}>Claude Code</h3>
      <div className="flexrow" style={{ flexWrap: 'nowrap' }}>
        <code style={codeStyle}>{cli}</code>
        <Copy text={cli} />
      </div>
      <p className="sub">
        Then run /mcp in Claude Code and choose Authenticate. Other MCP apps: add a remote (HTTP)
        server with the URL above.
      </p>
      <h3 style={{ fontSize: 16 }}>Connected</h3>
      {q.isPending && <p className="sub">Loading…</p>}
      {!q.isPending && !list.length && <p className="sub">No assistants are connected.</p>}
      {list.map((c) => (
        <div className="ri" key={c.id}>
          <div className="rm">
            <Icon name="ai" size={18} />
            <div className="mid">{c.name}</div>
            {c.created_at && (
              <span className="sub">{new Date(c.created_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      ))}
      {list.length > 0 && (
        <ConfirmButton
          confirm="Tap again to disconnect all"
          onConfirm={async () => {
            try {
              await api.post('/connections/revoke-all');
              await qc.invalidateQueries({ queryKey: ['connections'] });
            } catch (e) {
              toast({ text: errorMessage(e), tone: 'bad' });
            }
          }}
        >
          Disconnect all
        </ConfirmButton>
      )}
    </Section>
  );
}

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (standalone)
    return (
      <p className="sub" style={{ margin: 0 }}>
        Ratio is installed on this device.
      </p>
    );
  return (
    <div>
      {prompt && (
        <button type="button" className="btn primary sm" onClick={() => prompt.prompt()}>
          <Icon name="download" size={15} /> Install Ratio
        </button>
      )}
      <p className="sub" style={{ marginBottom: 0 }}>
        iPhone: open this page in Safari, tap Share, then “Add to Home Screen”. Android: open the
        Chrome menu and tap “Install app”.
      </p>
    </div>
  );
}

function Backup() {
  const file = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Backup">
      <p style={{ marginTop: 0 }} className="sub">
        A backup is one JSON file with every roaster, bag and brew. Photos stay in your storage
        bucket; restoring into this same Ratio keeps them attached.
      </p>
      <div className="flexrow">
        <a className="btn" href="/api/export" download>
          <Icon name="download" size={16} /> Download backup
        </a>
        <button type="button" className="btn" disabled={busy} onClick={() => file.current?.click()}>
          <Icon name="upload" size={16} /> {busy ? 'Restoring…' : 'Restore from backup'}
        </button>
      </div>
      <p className="sub" style={{ marginBottom: 0 }}>
        Restoring replaces everything currently in Ratio.
      </p>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            await api.post('/import', JSON.parse(await f.text()));
            await qc.invalidateQueries();
            toast({ text: 'Restored' });
          } catch (err) {
            toast({
              text: err instanceof SyntaxError ? 'That file is not JSON.' : errorMessage(err),
              tone: 'bad',
            });
          } finally {
            setBusy(false);
          }
        }}
      />
    </Section>
  );
}
