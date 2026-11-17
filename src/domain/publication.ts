import type { EventData } from '../types/event';
import { zonedStart } from './date';
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function publication(event: EventData) {
  const title = `${event.title} ${event.subtitle} ${event.volume}`.trim();
  const description = `${event.date} ${event.startTime}開始。${event.venue.name}で開催する${title}。${event.price}。${event.openMic.title ? `${event.openMic.title} ${event.openMic.time}。` : ''}`;
  return { title, description, jsonLd: {
    '@context': 'https://schema.org', '@type': 'MusicEvent', name: title,
    startDate: zonedStart(event),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.venue.name, address: event.venue.address },
    description,
    performer: event.schedule.filter(x => x.type === 'act').map(x => ({ '@type': 'PerformingGroup', name: x.name })),
    ...(event.price.includes('無料') ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' } } : {})
  } };
}
export function metadata(event: EventData, origin: string) {
  const { title, description, jsonLd } = publication(event);
  const tags = [
    ['name', 'description', description], ['property', 'og:title', title], ['property', 'og:description', description],
    ['property', 'og:type', 'website'], ['property', 'og:locale', 'ja_JP'], ['property', 'og:url', `${origin}/`],
    ['property', 'og:image', `${origin}/og-image.png`], ['property', 'og:image:type', 'image/png'], ['property', 'og:image:width', '1200'], ['property', 'og:image:height', '630'], ['property', 'og:image:alt', `${title} の開催案内`],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', title], ['name', 'twitter:description', description], ['name', 'twitter:image', `${origin}/og-image.png`]
  ];
  return `<title>${escapeHtml(title)} | ${escapeHtml(event.venue.name)}</title>\n<link rel="canonical" href="${escapeHtml(origin)}/">\n` +
    tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}">`).join('\n') +
    `\n<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;
}
export function ogSvg(event: EventData) {
  const { title } = publication(event);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#ecf4ed"/><rect x="35" y="35" width="1130" height="560" rx="20" fill="#fffdf7" stroke="#226454" stroke-width="3"/><text x="80" y="115" font-size="24" fill="#226454" font-family="sans-serif">${escapeHtml(event.venue.name)}</text><text x="80" y="250" font-size="65" fill="#173d34" font-family="sans-serif" font-weight="bold">${escapeHtml(title)}</text><text x="80" y="370" font-size="64" fill="#226454" font-family="sans-serif">${escapeHtml(event.date)} / ${escapeHtml(event.startTime)}</text><text x="80" y="485" font-size="34" fill="#173d34" font-family="sans-serif">${escapeHtml(event.price)}</text><text x="80" y="550" font-size="22" fill="#173d34" font-family="sans-serif">${escapeHtml(event.venue.address)}</text></svg>`;
}
