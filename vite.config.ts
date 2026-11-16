import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sharp from 'sharp';
import { defaultEvent as publishedEvent } from './src/data/defaultEvent';
import { metadata, ogSvg } from './src/domain/publication';
export default defineConfig({
  plugins: [react(), {
    name: 'published-event-metadata',
    transformIndexHtml(html) { return html.replace('<!-- published-event-metadata -->', metadata(publishedEvent, 'https://tirasi-hp.vercel.app')); },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'og-image.png', source: await sharp(Buffer.from(ogSvg(publishedEvent))).png().toBuffer() });
    }
  }]
});
