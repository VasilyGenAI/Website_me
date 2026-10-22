import type { ReactNode } from 'react';
import { navigate, useRoute } from '../nav';
import type { Connection } from '../net';

export const ROLE_LABEL = { admin: 'Admin', pro: 'Pro', basic: 'Basic' } as const;

const NAV = [
  { route: '#/', icon: '🎲', label: 'Spielen' },
  { route: '#/welt', icon: '🌍', label: 'Welt' },
  { route: '#/rooms', icon: '🏘️', label: 'Räume' },
  { route: '#/maps', icon: '🗺️', label: 'Karten' },
  { route: '#/leaderboard', icon: '🏆', label: 'Bestenliste' },
  { route: '#/pro', icon: '⭐', label: 'Pro' },
  { route: '#/more', icon: '☰', label: 'Mehr' },
];

/** Menu on the left (bottom bar on phones) around every screen except the game and editor. */
export function Shell({ conn, name, children }: { conn: Connection; name: string; children: ReactNode }) {
  const route = useRoute();
  const active = NAV.find((n) => n.route !== '#/' && route.startsWith(n.route))?.route ?? '#/';
  return (
    <div className="shell">
      <nav className="sidenav" aria-label="Hauptmenü">
        <button className="logo" onClick={() => navigate('#/')}>
          <span className="logo-hex">⬢</span>
          <span className="logo-text">Kontinentalist</span>
        </button>
        {NAV.map((n) => (
          <button key={n.route} className={`navitem${active === n.route ? ' active' : ''}`} onClick={() => navigate(n.route)}>
            <span className="navicon">{n.icon}</span>
            <span className="navlabel">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="shell-main">
        <header className="shell-head">
          <span className="avatar big-avatar">🙂</span>
          <div>
            <div className="who">{name}</div>
            {conn.role && <span className={`role role-${conn.role}`}>{ROLE_LABEL[conn.role]}</span>}
          </div>
        </header>
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; badge?: string }[] }) {
  return (
    <div className="seg" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.badge && <span className="badge-new">{t.badge}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}
