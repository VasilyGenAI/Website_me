import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/** Shows what went wrong instead of an empty screen, with a way back into the game. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; where: string }> {
  override state = { error: null as Error | null, where: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = (error.stack ?? '').split('\n').slice(0, 4).join('\n');
    const components = (info.componentStack ?? '').trim().split('\n').slice(0, 4).join('\n');
    this.setState({ where: `${stack}\n${components}` });
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="home">
        <div className="card">
          <h2>Da ist etwas schiefgelaufen</h2>
          <p className="muted">Das Spiel läuft im Hintergrund weiter. Versuch es mit „Weiter“, sonst zurück zur Startseite.</p>
          <pre className="error-text">
            {error.message}
            {this.state.where && `\n\n${this.state.where}`}
          </pre>
          <div className="row-btns">
            <button className="primary" onClick={() => this.setState({ error: null, where: '' })}>Weiter</button>
            <button onClick={() => location.reload()}>Seite neu laden</button>
          </div>
          <p className="muted small">Schick den Text oben an Claude, dann wird der Fehler behoben.</p>
        </div>
      </div>
    );
  }
}
