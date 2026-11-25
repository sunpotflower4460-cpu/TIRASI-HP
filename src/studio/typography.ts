import { Parser } from "../vendor/budoux/parser";
import { model as jaModel } from "../vendor/budoux/ja";

// Pure segmentation only: no HTML processing, DOM mutation, server or API call.
const parser = new Parser(jaModel);
const phraseCache = new Map<string, number[]>();
const closing = /^[、。，．？！：；）］｝」』】ぁぃぅぇぉっゃゅょー]/u;
const opening = /[（［｛「『【]$/u;

/** Balance a display heading at semantic boundaries after font fitting.
 * Explicit author line breaks and long inputs retain the normal wrapping path.
 * The original text is always kept on the document and the measurement record.
 */
export function balanceHeadline(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
  fallback: string[],
  strict = false,
): string[] {
  if (
    fallback.length < 2 ||
    fallback.length > 5 ||
    text.includes("\n") ||
    Array.from(text).length > 96
  )
    return fallback;
  let boundaries = phraseCache.get(text);
  if (!boundaries) {
    const offsets = new Set([0, text.length]);
    let offset = 0;
    for (const phrase of parser.parse(text)) {
      offset += phrase.length;
      offsets.add(offset);
    }
    for (const match of text.matchAll(/\s+|[、。！？]/gu))
      offsets.add(match.index + match[0].length);
    boundaries = [...offsets].sort((a, b) => a - b);
    if (phraseCache.size >= 200) phraseCache.clear();
    phraseCache.set(text, boundaries);
  }
  const points = boundaries;
  const target = measure(text) / fallback.length;
  const memo = new Map<string, { cost: number; lines: string[] } | null>();
  const solve = (
    start: number,
    remaining: number,
  ): { cost: number; lines: string[] } | null => {
    const key = `${start}/${remaining}`;
    if (memo.has(key)) return memo.get(key)!;
    let best: { cost: number; lines: string[] } | null = null;
    for (let end = start + 1; end < points.length; end++) {
      if (remaining === 1 && end !== points.length - 1) continue;
      if (remaining > 1 && end === points.length - 1) continue;
      const line = text.slice(points[start], points[end]).trim();
      if (!line || closing.test(line) || opening.test(line)) continue;
      // A currency mark or a price/time label stays with what follows it. The
      // last line has nothing after it, so a title may end with these words.
      if (
        end !== points.length - 1 &&
        /(?:[¥￥$]|前売り?|当日|開場|開演|開始)$/u.test(line)
      )
        continue;
      const width = measure(line);
      if (width > maxWidth + 0.5) break;
      const tail =
        remaining === 1 ? { cost: 0, lines: [] } : solve(end, remaining - 1);
      if (!tail) continue;
      const rag = (width - target) / Math.max(1, target);
      const cost =
        rag * rag +
        (width < target * 0.45 ? 2 : 0) -
        (/[、。！？]$/.test(line) ? 0.12 : 0) +
        tail.cost;
      if (!best || cost < best.cost)
        best = { cost, lines: [line, ...tail.lines] };
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, fallback.length)?.lines ?? (strict ? [] : fallback);
}
