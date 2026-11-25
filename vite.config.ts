import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { defaultEvent as publishedEvent } from './src/data/defaultEvent';
import { metadata, ogSvg } from './src/domain/publication';
import { renderOgPng } from './build/og';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

function publishedSite(): Plugin {
  return {
    name: 'published-event-metadata',
    transformIndexHtml(html) { return html.replace('<!-- published-event-metadata -->', metadata(publishedEvent, 'https://tirasi-hp.vercel.app')); },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/og-image.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end(ogSvg(publishedEvent)); return; }
        if (req.url === '/og-image.png') { void renderOgPng(publishedEvent).then(png => { res.setHeader('Content-Type', 'image/png'); res.end(png); }).catch(() => { res.statusCode = 500; res.end('OG image could not be rendered.'); }); return; }
        next();
      });
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'og-image.svg', source: ogSvg(publishedEvent) });
      this.emitFile({ type: 'asset', fileName: 'og-image.png', source: await renderOgPng(publishedEvent) });
    }
  };
}

// The store product must not contain anything of the venue site: its App and its
// starting event are replaced at module resolution, and the public/ folder (venue
// icons, manifest, service worker) is not copied. Font licences still ship.
function storeEdition(): Plugin {
  return {
    name: 'store-edition',
    enforce: 'pre',
    resolveId(source, importer) {
      if (/(^|\/)data\/defaultEvent$/.test(source)) return path('./src/data/defaultEvent.store.ts');
      if (source === './App' && importer?.endsWith('/src/main.tsx')) return path('./src/store/StoreApp.tsx');
      return null;
    },
    transformIndexHtml(html) {
      return html
        .replace(/<link rel="(apple-touch-icon|manifest)"[^>]*>\s*/g, '')
        .replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, '<meta name="apple-mobile-web-app-title" content="ライブチラシ" />')
        .replace('<!-- published-event-metadata -->', '<title>TIRASI ライブチラシ作成</title>');
    },
    generateBundle() {
      for (const name of readdirSync(path('./public/licenses'))) {
        this.emitFile({ type: 'asset', fileName: `licenses/${name}`, source: readFileSync(path(`./public/licenses/${name}`)) });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const store = mode === 'store';
  return {
    define: { 'import.meta.env.VITE_EDITION': JSON.stringify(store ? 'store' : 'personal') },
    plugins: store ? [storeEdition(), react()] : [react(), publishedSite()],
    publicDir: store ? false : 'public',
    build: { outDir: store ? 'dist-store' : 'dist' },
  };
});
