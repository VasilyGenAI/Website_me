import { useState } from 'react';
import { Tabs } from '../components/Shell';
import { useLibrary } from '../library';

export function Leaderboard() {
  const [tab, setTab] = useState<'me' | 'global'>('me');
  const { history } = useLibrary();
  const games = history.length;
  const wins = history.filter((g) => g.won).length;
  const avg = games ? history.reduce((s, g) => s + g.points, 0) / games : 0;

  return (
    <div className="page">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'me', label: 'Meine Statistik' },
          { id: 'global', label: 'Global' },
        ]}
      />
      {tab === 'me' ? (
        <>
          <div className="stats">
            <div><span>Partien</span><b>{games}</b></div>
            <div><span>Siege</span><b>{wins}</b></div>
            <div><span>Siegquote</span><b>{games ? `${Math.round((wins / games) * 100)} %` : '–'}</b></div>
            <div><span>Punkte/Partie</span><b>{games ? avg.toFixed(1) : '–'}</b></div>
          </div>
          {games === 0 ? (
            <p className="note">Noch keine beendeten Partien. Spiel eine Partie bis zum Ende, dann erscheint sie hier.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Datum</th><th>Karte</th><th>Gegner</th><th>Punkte</th><th>Ergebnis</th></tr>
                </thead>
                <tbody>
                  {history.slice(0, 50).map((g) => (
                    <tr key={g.at}>
                      <td>{new Date(g.at).toLocaleDateString('de-DE')}</td>
                      <td>{g.map}</td>
                      <td>{g.bots === g.players - 1 ? `${g.bots} Bots` : `${g.players - 1} Spieler`}</td>
                      <td className="num-cell">{g.points}</td>
                      <td>{g.won ? '🏆 Sieg' : 'Niederlage'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="note">Die globale Bestenliste mit Wertung (Elo) kommt mit der Online-Version und Spieler-Accounts. Bot-Partien zählen dort nicht.</p>
      )}
    </div>
  );
}
