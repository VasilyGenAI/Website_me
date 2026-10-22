import type { ReactNode } from 'react';
import type { MapDef } from '@kontinentalist/engine';
import { Board } from './Board';

/** Board thumbnail with a title and optional details/actions underneath. */
export function MapCard({ map, title, subtitle, selected, onSelect, children }: {
  map: MapDef;
  title: string;
  subtitle?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className={`mapcard${selected ? ' selected' : ''}${onSelect ? ' pickable' : ''}`} onClick={onSelect}>
      <div className="mapthumb">
        <Board map={map} />
      </div>
      <div className="mapinfo">
        <b>
          {title}
          {map.flag && <MiniFlag stripes={map.flag} />}
        </b>
        {subtitle && <div className="muted">{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}

/**
 * The country's flag at emoji size. Drawn rather than an emoji: Windows has no flag emojis and
 * would show the letters "DE" or "UA" instead.
 */
export function MiniFlag({ stripes }: { stripes: string[] }) {
  return (
    <span className="mini-flag" role="img" aria-label="Flagge">
      {stripes.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  );
}
