import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { defaultEvent as publishedEvent } from './src/data/defaultEvent';
import { metadata } from './src/domain/publication';
import { renderOgPng } from './build/og';
export default defineConfig({
  plugins: [react(), {
    name: 'published-event-metadata',
    transformIndexHtml(html) { return html.replace('<!-- published-event-metadata -->', metadata(publishedEvent, 'https://tirasi-hp.vercel.app')); },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'og-image.png', source: await renderOgPng(publishedEvent) });
    }
  }]
});
