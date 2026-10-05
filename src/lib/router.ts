import { useSyncExternalStore } from 'react';

/**
 * A tiny hash router. Hash URLs work on any static host and keep the offline app shell to a
 * single cached document.
 */

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function read(): string {
  return typeof location === 'undefined' ? '/' : location.hash.replace(/^#/, '') || '/';
}

let cachedHash = '';
let cachedRoute: Route = parse('/');

function parse(hash: string): Route {
  const [rawPath, rawQuery = ''] = hash.split('?');
  const path = '/' + rawPath.split('/').filter(Boolean).join('/');
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(rawQuery) };
}

function snapshot(): Route {
  const h = read();
  if (h !== cachedHash) {
    cachedHash = h;
    cachedRoute = parse(h);
  }
  return cachedRoute;
}

function subscribe(notify: () => void) {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (location.hash === target) return;
  if (opts.replace) {
    history.replaceState(history.state, '', `${location.pathname}${location.search}${target}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = target;
  }
}

export function href(to: string): string {
  return `#${to}`;
}
