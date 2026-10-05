import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/** Recursively list files in a directory, returning paths relative to `base`. */
function listFiles(dir: string, base: string = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [relative(base, full).split('\\').join('/')];
  });
}

/**
 * Emits `sw.js` from `src/pwa/sw.js`, injecting the list of build assets to precache and a
 * content-derived version. Keeps the service worker dependency-free and fully offline-capable.
 */
function serviceWorker(): Plugin {
  return {
    name: 'evolve-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const publicFiles = listFiles(join(root, 'public')).filter(
        // iOS launch images are only read at install time; keep them out of the offline cache.
        (file) => !file.startsWith('splash/') && file !== 'robots.txt',
      );
      const bundled = Object.keys(bundle).filter((file) => !file.endsWith('.map') && file !== 'sw.js');
      const precache = Array.from(new Set(['./', ...bundled, ...publicFiles])).sort();
      const template = readFileSync(join(root, 'src/pwa/sw.js'), 'utf8');
      const version = createHash('sha256')
        .update(template)
        .update(precache.join('|'))
        .update(
          bundled
            .map((file) => {
              const chunk = bundle[file];
              return chunk.type === 'chunk' ? chunk.code : String(chunk.source);
            })
            .join(''),
        )
        .digest('hex')
        .slice(0, 12);
      const source = template
        .replace('self.__PRECACHE_MANIFEST__', JSON.stringify(precache))
        .replace('__SW_VERSION__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  resolve: {
    alias: { '@': join(root, 'src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 700,
  },
  server: { host: true },
  preview: { host: true },
});
