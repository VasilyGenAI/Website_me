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
        <b>{title}</b>
        {subtitle && <div className="muted">{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}
