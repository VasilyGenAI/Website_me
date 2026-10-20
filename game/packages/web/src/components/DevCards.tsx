import type { ReactElement } from 'react';
import type { DevCardType } from '@kontinentalist/engine';
import { DEV_NAME } from '../i18n';
import { RoadPiece } from './Board';

/*
 * Development cards drawn as real cards: a purple frame, a parchment picture and the name.
 * Each type has its own picture in the board's style (dark outlines, flat colours).
 */

const INK = '#1d1d1d';

function Knight() {
  return (
    <>
      <ellipse cx={30} cy={57} rx={18} ry={3} fill="#000" fillOpacity=".18" />
      {/* sword, held upright */}
      <path d="M42.5,14 L45.5,14 L45.5,42 L42.5,42 Z" fill="#dfe5ea" stroke={INK} strokeWidth={1} />
      <path d="M44,14 L44,42" stroke="#9aa4ad" strokeWidth={0.8} />
      <rect x={38.5} y={41.5} width={11} height={2.8} rx={1} fill="#e0b84a" stroke={INK} strokeWidth={0.9} />
      <rect x={42.6} y={44.3} width={2.8} height={6} fill="#6b4420" stroke={INK} strokeWidth={0.8} />
      <circle cx={44} cy={51.5} r={1.8} fill="#e0b84a" stroke={INK} strokeWidth={0.8} />
      {/* armour */}
      <path d="M21,33 L39,33 L41,56 L19,56 Z" fill="#b8c0c8" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M30,33 L30,56 M21.5,42 L38.5,42" stroke="#7d8790" strokeWidth={0.9} />
      <rect x={19.5} y={45} width={21} height={2.6} fill="#6b4420" stroke={INK} strokeWidth={0.8} />
      {/* helmet with visor and red plume */}
      <path d="M31,15.5 C34,7 43,7 46,13 C41,11 36,12.5 32.5,18 Z" fill="#c0392b" stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      <path d="M22,32 L22,22 Q30,11 38,22 L38,32 Z" fill="#cfd6dc" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <rect x={23.5} y={23.5} width={13} height={2.4} rx={1} fill={INK} />
      <path d="M30,14.5 L30,32" stroke="#8d969e" strokeWidth={0.9} />
      {[27, 30, 33].map((x) => <circle key={x} cx={x} cy={29} r={0.7} fill={INK} />)}
      {/* shield with a golden cross */}
      <path d="M9,31 h16 v11 q0,9 -8,14 q-8,-5 -8,-14 z" fill="#b8322a" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M17,33 V53 M11,40 H23" stroke="#e0b84a" strokeWidth={2.4} />
    </>
  );
}

function Roads() {
  return (
    <>
      <rect x={4} y={4} width={52} height={58} rx={5} fill="#9fd36b" />
      <path d="M4,48 Q20,40 30,46 T56,42 V62 H4 Z" fill="#8cc63f" />
      <RoadPiece x1={12} y1={50} x2={30} y2={36} color="#e0b84a" scale={0.8} />
      <RoadPiece x1={30} y1={36} x2={48} y2={22} color="#e0b84a" scale={0.8} />
      <circle cx={30} cy={36} r={2.4} fill="#8a5a2b" stroke={INK} strokeWidth={0.8} />
      <text x={47} y={52} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff" stroke={INK} strokeWidth={2.4} paintOrder="stroke">×2</text>
    </>
  );
}

function Plenty() {
  return (
    <>
      <g transform="rotate(-14 22 36)">
        <rect x={11} y={18} width={22} height={30} rx={3} fill="#f2c230" stroke={INK} strokeWidth={1.2} />
        <text x={22} y={38} textAnchor="middle" fontSize={14}>🌾</text>
      </g>
      <g transform="rotate(12 38 36)">
        <rect x={27} y={18} width={22} height={30} rx={3} fill="#2e8b3d" stroke={INK} strokeWidth={1.2} />
        <text x={38} y={38} textAnchor="middle" fontSize={14}>🌲</text>
      </g>
      <circle cx={30} cy={53} r={6.5} fill="#2fa84f" stroke={INK} strokeWidth={1.2} />
      <path d="M30,49.5 V56.5 M26.5,53 H33.5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
      {[[10, 12], [50, 14], [8, 52]].map(([x, y]) => (
        <path key={x} d={`M${x},${y - 3} L${x + 1},${y - 1} L${x + 3},${y} L${x + 1},${y + 1} L${x},${y + 3} L${x - 1},${y + 1} L${x - 3},${y} L${x - 1},${y - 1} Z`} fill="#f2c230" />
      ))}
    </>
  );
}

function Monopoly() {
  return (
    <>
      {/* a heap of cards of one kind */}
      {[-10, -3, 4, 11].map((dx, i) => (
        <g key={dx} transform={`rotate(${dx * 1.4} ${30 + dx} 50)`}>
          <rect x={23 + dx} y={37} width={14} height={19} rx={2} fill="#8cc63f" stroke={INK} strokeWidth={1} />
          {i === 3 && <text x={30 + dx} y={50} textAnchor="middle" fontSize={9}>🐑</text>}
        </g>
      ))}
      {/* the crown that takes them all */}
      <path d="M13,31 L16,13 L23,23 L30,9 L37,23 L44,13 L47,31 Z" fill="#f2c230" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
      <rect x={13} y={30} width={34} height={6} rx={1.5} fill="#e0a82a" stroke={INK} strokeWidth={1.2} />
      <circle cx={30} cy={33} r={1.8} fill="#c0392b" />
      <circle cx={21} cy={33} r={1.5} fill="#2f6fdb" />
      <circle cx={39} cy={33} r={1.5} fill="#2f6fdb" />
      {[16, 30, 44].map((x, i) => <circle key={x} cx={x} cy={[13, 9, 13][i]} r={1.9} fill="#fff8e6" stroke={INK} strokeWidth={0.8} />)}
    </>
  );
}

function Trophy() {
  return (
    <>
      <path d="M19,16 C12,16 11,27 20,29 M41,16 C48,16 49,27 40,29" fill="none" stroke="#c9961f" strokeWidth={2.4} />
      <path d="M18,12 H42 V22 C42,32 36,37 30,37 C24,37 18,32 18,22 Z" fill="#f2c230" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M21,14 V22 C21,28 24,32 27,34" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth={1.6} strokeLinecap="round" />
      <rect x={27} y={37} width={6} height={7} fill="#e0a82a" stroke={INK} strokeWidth={1} />
      <path d="M20,44 H40 L42,52 H18 Z" fill="#8a5a2b" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <rect x={24} y={46} width={12} height={4} rx={1} fill="#f2c230" />
      <path d="M30,17.5 L31.8,22 L36.5,22.2 L32.8,25 L34.1,29.6 L30,27 L25.9,29.6 L27.2,25 L23.5,22.2 L28.2,22 Z" fill="#fff8e6" stroke={INK} strokeWidth={0.7} />
      <text x={30} y={59} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#6b4420">+1 Punkt</text>
    </>
  );
}

const ART: Record<DevCardType, () => ReactElement> = {
  knight: Knight,
  roadBuilding: Roads,
  yearOfPlenty: Plenty,
  monopoly: Monopoly,
  victoryPoint: Trophy,
};

/** The card face itself, scalable through CSS width. */
export function DevCardFace({ type }: { type: DevCardType }) {
  const Art = ART[type];
  return (
    <svg className="dev-face" viewBox="0 0 60 84" role="img" aria-label={DEV_NAME[type]}>
      <defs>
        <linearGradient id="devFrame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d5bc4" />
          <stop offset="1" stopColor="#4a2f86" />
        </linearGradient>
      </defs>
      <rect x={0.75} y={0.75} width={58.5} height={82.5} rx={6} fill="url(#devFrame)" stroke={INK} strokeWidth={1.5} />
      <rect x={4} y={4} width={52} height={58} rx={5} fill="#f6ead0" stroke="#2c1a50" strokeWidth={1} />
      <Art />
      <text x={30} y={75} textAnchor="middle" fontSize={DEV_NAME[type].length > 9 ? 7.4 : 8.6} fontWeight={900} fill="#fff">
        {DEV_NAME[type]}
      </text>
    </svg>
  );
}

/** A development card in your hand row: the face, how many you hold, and whether it can be played now. */
export function DevCardButton({ type, count, playable, onClick }: { type: DevCardType; count: number; playable: boolean; onClick: () => void }) {
  return (
    <button className={`devcard${playable ? ' playable' : ''}`} onClick={onClick} title={DEV_NAME[type]}>
      <DevCardFace type={type} />
      {count > 1 && <span className="devcount">{count}</span>}
    </button>
  );
}

/** Face-down development card, for counts (bank deck, other players' hands). */
export function DevCardBack() {
  return <span className="dev-back" aria-hidden="true">?</span>;
}
