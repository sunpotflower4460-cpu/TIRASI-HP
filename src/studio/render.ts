import type { Scene, SceneNode, TextNode, FlowNode, Rect } from "./scene";
import { drawArtwork, type ArtworkNode } from "./artwork";
import { loadPlate } from "./plates";
import { balanceHeadline } from "./typography";
import { defaultPlacement } from "./document";
import { canvasBlob, withTimeout } from "../export/files";
import { loadDisplayFonts } from "./displayFonts";
export type Measurement = {
  id: string;
  lines: number;
  fontSize: number;
  bounds: Rect;
  usedBounds: Rect;
  fits: boolean;
  text: string;
};
export type RenderResult = {
  canvas: HTMLCanvasElement;
  errors: string[];
  measurements: Measurement[];
};
// A price keeps its currency mark and thousands separators on one line.
const tokenPattern =
  /[¥￥$]\s?[0-9]+(?:,[0-9]{3})*|[A-Za-z0-9_:/?.&=#@%+~'’\-]+(?:,[0-9]{3}[A-Za-z0-9_:/?.&=#@%+~'’\-]*)*|./gu;
const noLineStart = /^[、。，．？！：；）］｝」』】ぁぃぅぇぉっゃゅょー]/u;
const noLineEnd = /[（［｛「『【]$/u;
const length = (value: string) => Array.from(value.trim()).length;
/** A stranded one or two characters read as a mistake. */
const stranded = (lines: string[]) =>
  lines.length > 1 &&
  (lines.some((line) => length(line) === 1) ||
    length(lines[lines.length - 1]) <= 2);

/** Moves whole tokens down until the last line no longer looks stranded. */
function fillLastLine(
  lines: string[],
  width: number,
  measure: (value: string) => number,
): string[] {
  const result = [...lines];
  const last = result.length - 1;
  const tokens = result[last - 1].match(tokenPattern) ?? [];
  let tail = result[last];
  while (length(tail) < 4 && tokens.length > 1) {
    const next = tokens.pop()! + tail;
    if (measure(next.trim()) > width || length(tokens.join("")) < 3) break;
    tail = next;
    const head = tokens.join("").trimEnd();
    if (
      length(tail) >= 3 &&
      !noLineStart.test(tail.trim()) &&
      !noLineEnd.test(head)
    ) {
      result[last - 1] = head;
      result[last] = tail.trim();
      if (length(tail) >= 4) break;
    }
  }
  return result;
}

/** Same number of lines, broken where a reader would pause. */
function tidyBreaks(
  paragraph: string,
  lines: string[],
  width: number,
  measure: (value: string) => number,
): string[] {
  const phrased = balanceHeadline(paragraph, width, measure, lines, true);
  if (phrased.length === lines.length && !stranded(phrased)) return phrased;
  return stranded(lines) ? fillLastLine(lines, width, measure) : lines;
}

/** `tidy` moves the breaks to phrase boundaries. It never changes the number of
 * lines, and it is costly, so size searches leave it off until a size fits. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  tidy = true,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    const start = lines.length;
    const tokens = paragraph.match(tokenPattern) ?? [];
    let line = "";
    for (const token of tokens) {
      const pieces =
        ctx.measureText(token).width > width ? Array.from(token) : [token];
      for (const piece of pieces) {
        if (line && ctx.measureText(line + piece).width > width) {
          if (noLineStart.test(piece)) {
            const chars = Array.from(line);
            const previous = chars.pop() ?? "";
            lines.push(chars.join(""));
            line = previous + piece;
          } else {
            const opening = line.match(noLineEnd)?.[0];
            lines.push(
              opening ? line.slice(0, -opening.length) : line.trimEnd(),
            );
            line = (opening ?? "") + piece.trimStart();
          }
        } else line += piece;
      }
    }
    lines.push(line.trimEnd());
    if (tidy && lines.length - start >= 2)
      lines.splice(
        start,
        lines.length - start,
        ...tidyBreaks(
          paragraph,
          lines.slice(start),
          width,
          (value) => ctx.measureText(value).width,
        ),
      );
  }
  return lines;
}
export function measureText(
  ctx: CanvasRenderingContext2D,
  node: TextNode,
): { lines: string[]; size: number; fits: boolean } {
  let size = node.size;
  let lines: string[] = [];
  // A name that only just overflows is set a little smaller instead of wrapped.
  if (node.singleLineRatio && !node.vertical && !node.text.includes("\n")) {
    const floor = Math.max(
      node.minSize,
      Math.ceil(node.size * node.singleLineRatio),
    );
    for (let single = node.size; single >= floor; single--) {
      ctx.font = `${node.italic ? "italic " : ""}${node.weight ?? 400} ${single}px ${node.family}`;
      if (
        ctx.measureText(node.text).width <= node.w &&
        single * (node.lineHeight ?? 1.42) <= node.h
      )
        return { lines: [node.text.trim()], size: single, fits: true };
    }
  }
  // Names are set smaller, within reason, when that avoids breaking a word.
  let firstFit: { lines: string[]; size: number; fits: boolean } | undefined;
  for (; size >= node.minSize; size--) {
    if (firstFit && size < firstFit.size * 0.65) break;
    ctx.font = `${node.italic ? "italic " : ""}${node.weight ?? 400} ${size}px ${node.family}`;
    const source = node.vertical
      ? Array.from(node.text).join("\n")
      : node.text;
    lines = wrapText(ctx, source, node.w, false);
    if (
      lines.length <= (node.maxLines ?? Infinity) &&
      lines.length * size * (node.lineHeight ?? 1.42) <= node.h &&
      lines.every((line) => ctx.measureText(line).width <= node.w + 0.5)
    ) {
      lines = wrapText(ctx, source, node.w);
      const fittedLines =
        node.balanced && !node.vertical
          ? balanceHeadline(
              node.text,
              node.w,
              (value) => ctx.measureText(value).width,
              lines,
              true,
            )
          : lines;
      if (!fittedLines.length) continue;
      const result = { lines: fittedLines, size, fits: true };
      if (
        !node.singleLineRatio ||
        fittedLines.length < 2 ||
        balanceHeadline(
          node.text,
          node.w,
          (value) => ctx.measureText(value).width,
          fittedLines,
          true,
        ).length
      )
        return result;
      firstFit ??= result;
    }
  }
  if (firstFit) return firstFit;
  size = node.minSize;
  ctx.font = `${node.italic ? "italic " : ""}${node.weight ?? 400} ${size}px ${node.family}`;
  return {
    lines: wrapText(
      ctx,
      node.vertical ? Array.from(node.text).join("\n") : node.text,
      node.w,
    ),
    size,
    fits: false,
  };
}
/** Where the first line starts. Centred and aligned text is placed by what is
 * seen (the glyphs of a capital or a kanji), not by the font's line box, which
 * sits differently per face and per browser engine.
 * Call with the node's font set and textBaseline "top".
 */
export function textTop(
  ctx: CanvasRenderingContext2D,
  node: TextNode,
  lineCount: number,
  size: number,
): number {
  const lineHeight = size * (node.lineHeight ?? 1.42);
  const anchored = node.inkTop !== undefined || node.inkBottom !== undefined;
  if (!anchored && node.valign !== "center") return node.y;
  const sample = ctx.measureText(
    !anchored && /[\u3040-\u30ff\u3400-\u9fff]/u.test(node.text) ? "国" : "H",
  );
  const top = -sample.actualBoundingBoxAscent;
  const bottom = sample.actualBoundingBoxDescent;
  const rest = (lineCount - 1) * lineHeight;
  if (node.inkTop !== undefined) return node.inkTop - top;
  if (node.inkBottom !== undefined) return node.inkBottom - bottom - rest;
  return node.y + node.h / 2 - (rest + top + bottom) / 2;
}
const areaName = (id: string) =>
  id === "title"
    ? "タイトル"
    : id === "subtitle"
      ? "サブタイトル"
      : id === "kicker"
        ? "上部テキスト"
        : id.startsWith("facts")
          ? "日付・料金"
          : /^(program|act-|time-|schedule-|body-)/.test(id)
            ? "本文・出演者"
            : id.startsWith("details")
              ? "会場・詳細"
              : id;
/** The area the glyphs actually cover, which is what can collide. */
function inkBounds(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): Rect {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const ink = ctx.measureText(line);
    left = Math.min(left, x - ink.actualBoundingBoxLeft);
    right = Math.max(right, x + ink.actualBoundingBoxRight);
    top = Math.min(top, y + index * lineHeight - ink.actualBoundingBoxAscent);
    bottom = Math.max(
      bottom,
      y + index * lineHeight + ink.actualBoundingBoxDescent,
    );
  });
  return left > right
    ? { x, y, w: 0, h: 0 }
    : { x: left, y: top, w: right - left, h: bottom - top };
}
function shape(
  ctx: CanvasRenderingContext2D,
  node: Extract<SceneNode, { kind: "rect" | "ellipse" }>,
) {
  ctx.beginPath();
  if (node.kind === "ellipse")
    ctx.ellipse(
      node.x + node.w / 2,
      node.y + node.h / 2,
      node.w / 2,
      node.h / 2,
      0,
      0,
      Math.PI * 2,
    );
  else ctx.roundRect(node.x, node.y, node.w, node.h, node.radius ?? 0);
  ctx.fillStyle = node.color;
  ctx.fill();
  if (node.stroke) {
    ctx.strokeStyle = node.stroke;
    ctx.lineWidth = node.lineWidth ?? 1;
    ctx.stroke();
  }
}
export function layoutFlow(
  ctx: CanvasRenderingContext2D,
  node: FlowNode,
): { nodes: TextNode[]; fits: boolean } {
  // Start slightly larger than the base sizes; a roomy column is set bigger
  // instead of leaving an empty band under the details.
  let reduction = -(node.maxGrow ?? 4);
  let items: {
    block: FlowNode["blocks"][number];
    size: number;
    height: number;
  }[] = [];
  let total = 0;
  // Enlarging must not turn a line that fits at its base size into two.
  const baseLines = node.blocks.map((block) => {
    ctx.font = `${block.weight ?? 400} ${block.size}px ${block.family}`;
    return wrapText(ctx, block.text, node.w, false).length;
  });
  for (; reduction <= 40; reduction++) {
    let orphan = false;
    items = node.blocks.map((block, index) => {
      const size = Math.max(block.minSize, block.size - reduction);
      ctx.font = `${block.weight ?? 400} ${size}px ${block.family}`;
      // Only the enlarging steps look at where the lines break.
      const lines = wrapText(ctx, block.text, node.w, reduction < 0);
      // Wrapped lines of one or two characters read as mistakes; only allow
      // them at the base size, never as the result of enlarging.
      const paragraphs = new Set(block.text.split("\n").map((p) => p.trim()));
      if (reduction < 0 && lines.length > baseLines[index]) orphan = true;
      if (
        reduction < 0 &&
        lines.some(
          (line) =>
            line.trim() &&
            Array.from(line.trim()).length <= 2 &&
            !paragraphs.has(line.trim()),
        )
      )
        orphan = true;
      return {
        block,
        size,
        height: lines.length * size * (block.lineHeight ?? 1.4),
      };
    });
    total = items.reduce(
      (sum, item, index) =>
        sum + item.height + (index ? (item.block.gapBefore ?? 7) : 0),
      0,
    );
    if (reduction < 0 ? !orphan && total <= node.h * 0.88 : total <= node.h)
      break;
    if (items.every((item) => item.size === item.block.minSize)) break;
  }
  let y = node.y;
  return {
    fits: total <= node.h + 0.5,
    nodes: items.map((item, index): TextNode => {
      y += index ? (item.block.gapBefore ?? 7) : 0;
      const result: TextNode = {
        ...item.block,
        kind: "text",
        x: node.x,
        y,
        w: node.w,
        h: item.height + 0.05,
        size: item.size,
        minSize: item.size,
      };
      y += item.height;
      return result;
    }),
  };
}
export function drawImageInBox(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  box: Rect,
  placement = defaultPlacement,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const ratio =
    (placement.fit === "contain" ? Math.min : Math.max)(
      box.w / image.width,
      box.h / image.height,
    ) * placement.zoom;
  const w = image.width * ratio,
    h = image.height * ratio;
  ctx.globalAlpha = placement.opacity;
  ctx.drawImage(
    image,
    box.x + ((box.w - w) * placement.imageX) / 100,
    box.y + ((box.h - h) * placement.imageY) / 100,
    w,
    h,
  );
  ctx.restore();
}
export async function renderScene(
  scene: Scene,
  images: Map<string, ImageBitmap>,
  outputWidth?: number,
  outputHeight?: number,
): Promise<RenderResult> {
  const size = scene.document.design.sizeId;
  // Display faces are a refinement: if their stylesheet cannot be fetched
  // (offline, blocked), the layout still renders with the bundled fallbacks
  // instead of failing the preview and every export.
  const illustration = scene.nodes.find(
    (node): node is ArtworkNode => node.kind === "art" && node.role === "hero",
  );
  const [plate] = await Promise.all([
    illustration ? loadPlate(illustration.art, scene.palette) : undefined,
    withTimeout(loadDisplayFonts()).catch(() => undefined),
  ]);
  await withTimeout(document.fonts.ready);
  // Explicitly request glyph subsets for Canvas text (FontFaceSet.ready alone cannot discover canvas content).
  await withTimeout(
    Promise.all(
      scene.nodes
        .flatMap((n) =>
          n.kind === "text" ? [n] : n.kind === "flow" ? n.blocks : [],
        )
        .map((n) =>
          document.fonts.load(
            `${n.italic ? "italic " : ""}${n.weight ?? 400} ${n.size}px ${n.family}`,
            n.text,
          ),
        ),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth ?? 1000;
  canvas.height = outputHeight ?? Math.round(scene.height);
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error(
      import.meta.env?.VITE_EDITION === "store"
        ? "画像を描画できません。アプリを再起動して、もう一度お試しください。"
        : "画像を描画できません。このブラウザのCanvasを確認してください。",
    );
  ctx.scale(canvas.width / scene.width, canvas.height / scene.height);
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, scene.width, scene.height);
  const errors = [...scene.errors];
  const measurements: Measurement[] = [];
  const resolvedNodes: Exclude<SceneNode, FlowNode>[] = scene.nodes.flatMap(
    (node): Exclude<SceneNode, FlowNode>[] => {
      if (node.kind !== "flow") return [node];
      const laidOut = layoutFlow(ctx, node);
      if (!laidOut.fits)
        errors.push(
          node.id === "program"
            ? "本文が収まりません。文章や改行を調整するか、大きなサイズを選んでください。"
            : scene.document.kind === "event-flyer"
              ? "会場・詳細が収まりません。「本文」タブの『載せる情報』で注意書き・Open Mic・SNS表示名を非表示にするか、A4など大きなサイズを選ぶと収まる場合があります。"
              : "会場・詳細が収まりません。文章を短くするか、別の構図や大きなサイズを選んでください。",
        );
      return laidOut.nodes;
    },
  );
  for (const node of resolvedNodes) {
    if (node.kind === "text") {
      ctx.save();
      const result = measureText(ctx, node);
      const fitsBounds =
        node.x >= 35 &&
        node.y >= (size === "story" ? 100 : 35) &&
        node.x + node.w <= scene.width - 35 &&
        node.y + node.h <= scene.height - (size === "story" ? 120 : 35);
      const fits = result.fits && fitsBounds;
      if (!fits)
        errors.push(
          `「${areaName(node.id)}」が収まりません。文章を短くするか、詳細を減らす・別の構図やサイズを選ぶなどで調整してください。`,
        );
      ctx.font = `${node.italic ? "italic " : ""}${node.weight ?? 400} ${result.size}px ${node.family}`;
      ctx.fillStyle = node.color;
      ctx.textAlign = node.align ?? "left";
      ctx.textBaseline = "top";
      const x =
        node.align === "center"
          ? node.x + node.w / 2
          : node.align === "right"
            ? node.x + node.w
            : node.x;
      // Keep the entire measured text in the scene; overflow is a blocking diagnosis, never a successful cropped export.
      if (node.shadow) {
        const scale = canvas.width / scene.width;
        ctx.shadowColor = scene.palette.accent;
        ctx.shadowBlur = node.shadow === "glow" ? 9 * scale : 0;
        ctx.shadowOffsetX = node.shadow === "registration" ? 2 * scale : 0;
        ctx.shadowOffsetY = node.shadow === "registration" ? scale : 0;
      }
      const textY = textTop(ctx, node, result.lines.length, result.size);
      result.lines.forEach((line, index) =>
        ctx.fillText(
          line,
          x,
          textY + index * result.size * (node.lineHeight ?? 1.42),
        ),
      );
      const usedBounds = inkBounds(
        ctx,
        result.lines,
        x,
        textY,
        result.size * (node.lineHeight ?? 1.42),
      );
      measurements.push({
        id: node.id,
        lines: result.lines.length,
        fontSize: result.size,
        bounds: { x: node.x, y: node.y, w: node.w, h: node.h },
        usedBounds,
        fits,
        text: node.text,
      });
      ctx.restore();
      if (!fits) {
        ctx.strokeStyle = "#d61d36";
        ctx.lineWidth = 3;
        ctx.strokeRect(node.x, node.y, node.w, node.h);
      }
    } else if (node.kind === "art") drawArtwork(ctx, node, plate);
    else if (node.kind === "image") {
      const image = images.get(node.assetId);
      if (image)
        drawImageInBox(
          ctx,
          image,
          node,
          scene.document.design.placements[size] ?? defaultPlacement,
        );
      else {
        errors.push(
          "元画像が見つかりません。完全バックアップを復元するか画像を再選択してください。",
        );
        ctx.fillStyle = scene.palette.soft;
        ctx.fillRect(node.x, node.y, node.w, node.h);
      }
    } else shape(ctx, node);
  }
  for (let a = 0; a < measurements.length; a++)
    for (let b = a + 1; b < measurements.length; b++) {
      const first = measurements[a],
        second = measurements[b];
      const r = first.usedBounds,
        s = second.usedBounds;
      if (
        Math.min(r.x + r.w, s.x + s.w) - Math.max(r.x, s.x) > 2 &&
        Math.min(r.y + r.h, s.y + s.h) - Math.max(r.y, s.y) > 2
      )
        errors.push(
          `「${areaName(first.id)}」と「${areaName(second.id)}」の文字が重なっています。位置の微調整を元に戻すか、別の構図を選んでください。`,
        );
    }
  const photographs = resolvedNodes.filter((node) => node.kind === "image");
  for (const measurement of measurements) {
    const text = measurement.usedBounds;
    if (
      photographs.some(
        (photo) =>
          Math.min(text.x + text.w, photo.x + photo.w) -
            Math.max(text.x, photo.x) >
            2 &&
          Math.min(text.y + text.h, photo.y + photo.h) -
            Math.max(text.y, photo.y) >
            2,
      )
    ) {
      errors.push(
        "画像と文字が重なっています。タイトルの位置を戻すか、別の構図を選んでください。",
      );
    }
  }
  return { canvas, errors: [...new Set(errors)], measurements };
}
export async function scenePng(result: RenderResult): Promise<Blob> {
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  return canvasBlob(result.canvas);
}
