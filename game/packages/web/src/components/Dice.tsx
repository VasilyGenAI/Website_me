import type { CSSProperties } from 'react';

// Pip positions on a 3x3 grid, numbered 1-9 left to right, top to bottom.
const PIPS: Record<number, number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

// Face layout of a real die (opposite faces add up to 7) and the turn that brings each face to the front.
const FACES: { value: number; place: string; show: [number, number] }[] = [
  { value: 1, place: 'translateZ(var(--half))', show: [0, 0] },
  { value: 6, place: 'rotateY(180deg) translateZ(var(--half))', show: [0, 180] },
  { value: 3, place: 'rotateY(90deg) translateZ(var(--half))', show: [0, -90] },
  { value: 4, place: 'rotateY(-90deg) translateZ(var(--half))', show: [0, 90] },
  { value: 2, place: 'rotateX(90deg) translateZ(var(--half))', show: [-90, 0] },
  { value: 5, place: 'rotateX(-90deg) translateZ(var(--half))', show: [90, 0] },
];

function Face({ value, place }: { value: number; place: string }) {
  return (
    <div className="die-face" style={{ transform: place }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[value].includes(i + 1) ? 'pip' : 'pip none'} />
      ))}
    </div>
  );
}

/** One red die that is thrown in, tumbles and settles on `value`. */
function Die({ value, seed, delay }: { value: number; seed: number; delay: number }) {
  const [rx, ry] = FACES.find((f) => f.value === value)!.show;
  // Whole turns only, so every throw ends square and face-on.
  const style = {
    '--rx': `${rx}deg`,
    '--ry': `${ry}deg`,
    '--spin-x': `${720 + ((seed * 53) % 2) * 360}deg`,
    '--spin-y': `${360 + ((seed * 29) % 2) * 360}deg`,
    animationDelay: `${delay}ms`,
  } as CSSProperties;
  return (
    <div className="die-throw" style={{ animationDelay: `${delay}ms` }}>
      <div className="die" style={style} aria-hidden="true">
        {FACES.map((f) => <Face key={f.value} value={f.value} place={f.place} />)}
      </div>
      <div className="die-shadow" style={{ animationDelay: `${delay}ms` }} />
    </div>
  );
}

/** The latest roll. Remounted (key) for every new roll, which replays the throw. */
export function Dice({ dice, roll }: { dice: [number, number]; roll: number }) {
  return (
    <div className="dice" role="img" aria-label={`Gewürfelt: ${dice[0]} und ${dice[1]}, zusammen ${dice[0] + dice[1]}`}>
      <Die value={dice[0]} seed={roll * 2 + 1} delay={0} />
      <Die value={dice[1]} seed={roll * 2 + 2} delay={60} />
    </div>
  );
}
