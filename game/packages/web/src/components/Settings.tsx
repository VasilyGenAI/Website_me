import { useState } from 'react';
import { DEFAULT_SETTINGS, TURN_TIMERS, cleanSettings } from '@kontinentalist/engine';
import type { GameSettings } from '@kontinentalist/engine';

const KEY = 'kontinentalist.settings';

/** The last settings this browser started a game with. */
export function useSavedSettings(): [GameSettings, (s: GameSettings) => void] {
  const [value, setValue] = useState<GameSettings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? cleanSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const save = (s: GameSettings) => {
    setValue(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* private window: keep it for this visit only */
    }
  };
  return [value, save];
}

export const timerLabel = (s: number) => (s === 0 ? 'Aus' : s < 60 ? `${s} s` : `${s / 60} min`.replace('.5', ',5'));

/** Advanced settings in colonist's style: turn timer stepper, points and discard limit sliders. */
export function SettingsPanel({ value, onChange }: { value: GameSettings; onChange?: (s: GameSettings) => void }) {
  const ro = !onChange;
  const i = TURN_TIMERS.indexOf(value.turnTimer);
  const set = (patch: Partial<GameSettings>) => onChange?.({ ...value, ...patch });
  return (
    <div className="settings">
      <div className="setting">
        <span className="setting-title">⏱ Zug-Timer</span>
        <div className="stepper">
          <button className="mini" disabled={ro || i <= 0} onClick={() => set({ turnTimer: TURN_TIMERS[i - 1] })} aria-label="Weniger Zeit">‹</button>
          <b>{timerLabel(value.turnTimer)}</b>
          <button className="mini" disabled={ro || i >= TURN_TIMERS.length - 1} onClick={() => set({ turnTimer: TURN_TIMERS[i + 1] })} aria-label="Mehr Zeit">›</button>
        </div>
        <small>Läuft die Zeit ab, wird automatisch gewürfelt und der Zug endet.</small>
      </div>
      <div className="setting">
        <span className="setting-title">🏆 Siegpunkte</span>
        <div className="slider">
          <span>3</span>
          <input type="range" min={3} max={20} value={value.victoryPoints} disabled={ro} onChange={(e) => set({ victoryPoints: Number(e.target.value) })} />
          <span>20</span>
          <b>{value.victoryPoints}</b>
        </div>
      </div>
      <div className="setting">
        <span className="setting-title">🂠 Abwurf-Limit</span>
        <div className="slider">
          <span>5</span>
          <input type="range" min={5} max={20} value={value.discardLimit} disabled={ro} onChange={(e) => set({ discardLimit: Number(e.target.value) })} />
          <span>20</span>
          <b>{value.discardLimit}</b>
        </div>
        <small>Wer bei einer 7 mehr Karten hat, wirft die Hälfte ab.</small>
      </div>
    </div>
  );
}
