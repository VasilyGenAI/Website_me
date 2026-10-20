import type { PortType, Resource, Terrain } from '@hexlands/engine';

/**
 * Placeholder look. Every visual is looked up here, so swapping in real artwork later means
 * filling `image` with an SVG/PNG path (e.g. '/art/terrain/forest.svg') and nothing else.
 */
export const TERRAIN_STYLE: Record<Terrain, { fill: string; icon: string; image?: string }> = {
  forest: { fill: '#2e8b3d', icon: '🌲' },
  hills: { fill: '#d9673a', icon: '🧱' },
  pasture: { fill: '#8cc63f', icon: '🐑' },
  fields: { fill: '#f2c230', icon: '🌾' },
  mountains: { fill: '#9aa4ad', icon: '⛰️' },
  desert: { fill: '#e6d29a', icon: '🌵' },
  fog: { fill: '#c9d1d9', icon: '☁️' },
};

export const RESOURCE_STYLE: Record<Resource, { fill: string; icon: string }> = {
  lumber: { fill: '#2e8b3d', icon: '🌲' },
  brick: { fill: '#d9673a', icon: '🧱' },
  wool: { fill: '#8cc63f', icon: '🐑' },
  grain: { fill: '#f2c230', icon: '🌾' },
  ore: { fill: '#9aa4ad', icon: '🪨' },
};

export function portLabel(type: PortType): string {
  return type === 'any' ? '3:1' : `2:1 ${RESOURCE_STYLE[type].icon}`;
}

export const SEA = '#1565c0';
export const SHORE = '#f3dfa2';
