import { expect, it } from 'vitest';
import sharp from 'sharp';
import { renderOgPng } from '../../build/og';
import { defaultEvent } from '../../src/data/defaultEvent';

it('renders distinct Japanese glyphs with the bundled font at the shared image dimensions', async () => {
  const outputs = await Promise.all(['日日', '田田'].map(async title => {
    const png = await renderOgPng({ ...defaultEvent, title, subtitle: '', volume: '' });
    expect(await sharp(png).metadata()).toMatchObject({ width: 1200, height: 630, format: 'png' });
    return sharp(png).extract({ left: 80, top: 170, width: 250, height: 120 }).raw().toBuffer();
  }));
  // A renderer without Japanese glyphs produces identical missing-glyph boxes here.
  expect(outputs[0].equals(outputs[1])).toBe(false);
});
