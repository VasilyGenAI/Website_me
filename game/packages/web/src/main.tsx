import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OFFLINE, localSnapshot, restoreLocal } from './local';
import './styles.css';

interface HotHost {
  data?: unknown;
  ready?: (start: (data: unknown) => void) => void;
  snapshot?: (save: () => unknown) => void;
}

// The test page can be updated while someone plays; carry the running game over to the new version.
const hot = (window as unknown as { claude?: { hot?: HotHost } }).claude?.hot;

function start(data: unknown) {
  if (OFFLINE) restoreLocal(data);
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}

try {
  if (OFFLINE) hot?.snapshot?.(() => localSnapshot());
} catch {
  /* host without update support */
}
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
