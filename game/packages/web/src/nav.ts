import { useSyncExternalStore } from 'react';

/*
 * Screen routing kept in memory and mirrored into the URL hash when the page allows it.
 * Sandboxed hosts (like the offline test page) may ignore hash links, so screens switch
 * through navigate() instead of <a href="#...">.
 */
const subscribers = new Set<() => void>();
let current = location.hash || '#/';

function notify() {
  for (const fn of subscribers) fn();
}

export function navigate(to: string) {
  if (to === current) return;
  current = to;
  try {
    history.replaceState(null, '', to);
  } catch {
    /* the host forbids URL changes; the in-memory route still works */
  }
  notify();
}

addEventListener('hashchange', () => {
  current = location.hash || '#/';
  notify();
});

export function useRoute(): string {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => current,
  );
}
