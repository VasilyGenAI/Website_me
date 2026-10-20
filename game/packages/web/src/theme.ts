import type { PortType, Resource, Terrain } from '@kontinentalist/engine';
import acker1 from './art/acker-1.webp';
import gebirge1 from './art/gebirge-1.webp';
import huegel1 from './art/huegel-1.webp';
import meer1 from './art/meer-1.webp';
import nebel1 from './art/nebel-1.webp';
import wald1 from './art/wald-1.webp';
import weide1 from './art/weide-1.webp';
import wueste1 from './art/wueste-1.webp';

/**
 * Every visual is looked up here. `images` holds artwork variants for a terrain; each tile always
 * gets the same variant, so a board mixes them. Terrains without artwork show the colour and icon.
 */
export const TERRAIN_STYLE: Record<Terrain, { fill: string; icon: string; images?: string[] }> = {
  forest: { fill: '#2e8b3d', icon: '🌲', images: [wald1] },
  hills: { fill: '#d9673a', icon: '🧱', images: [huegel1] },
  pasture: { fill: '#8cc63f', icon: '🐑', images: [weide1] },
  fields: { fill: '#f2c230', icon: '🌾', images: [acker1] },
  mountains: { fill: '#9aa4ad', icon: '⛰️', images: [gebirge1] },
  desert: { fill: '#e6d29a', icon: '🌵', images: [wueste1] },
  fog: { fill: '#c9d1d9', icon: '☁️', images: [nebel1] },
};

export const RESOURCE_STYLE: Record<Resource, { fill: string; icon: string }> = {
  lumber: { fill: '#2e8b3d', icon: '🌲' },
  brick: { fill: '#d9673a', icon: '🧱' },
  wool: { fill: '#8cc63f', icon: '🐑' },
  grain: { fill: '#f2c230', icon: '🌾' },
  ore: { fill: '#9aa4ad', icon: '🪨' },
};

/** Harbour badge: the colour of the traded resource (white for 3:1) and the ratio in the middle. */
export function portStyle(type: PortType): { fill: string; ratio: string; dark: boolean } {
  return type === 'any' ? { fill: '#ffffff', ratio: '3:1', dark: true } : { fill: RESOURCE_STYLE[type].fill, ratio: '2:1', dark: false };
}

export function portLabel(type: PortType): string {
  return type === 'any' ? '3:1' : `2:1 ${RESOURCE_STYLE[type].icon}`;
}

export const SEA = '#1565c0';
/** Seamless water texture tiled behind the board. */
export const SEA_IMAGE = meer1;
export const SHORE = '#f3dfa2';
