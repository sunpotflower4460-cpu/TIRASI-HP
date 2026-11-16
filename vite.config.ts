import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { defaultEvent as publishedEvent } from './src/data/defaultEvent';
import { metadata, ogSvg } from './src/domain/publication';
import { renderOgPng } from './build/og';
export default defineConfig({
  plugins: [react(), {
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
  }]
});
