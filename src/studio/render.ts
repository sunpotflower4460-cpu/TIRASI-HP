import type { Scene, SceneNode, TextNode, FlowNode, Rect } from "./scene";
import { drawArtwork } from "./artwork";
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
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    const tokens = paragraph.match(/[A-Za-z0-9_:/?.&=#@%+~'’\-]+|./gu) ?? [];
    let line = "";
    for (const token of tokens) {
      const pieces =
        ctx.measureText(token).width > width ? Array.from(token) : [token];
      for (const piece of pieces) {
        if (line && ctx.measureText(line + piece).width > width) {
          if (
            /^[、。，．？！：；）］｝」』】ぁぃぅぇぉっゃゅょー]/u.test(piece)
          ) {
            const chars = Array.from(line);
            const previous = chars.pop() ?? "";
            lines.push(chars.join(""));
            line = previous + piece;
          } else {
            const opening = line.match(/[（［｛「『【]$/u)?.[0];
            lines.push(
              opening ? line.slice(0, -opening.length) : line.trimEnd(),
            );
            line = (opening ?? "") + piece.trimStart();
          }
        } else line += piece;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
export function measureText(
  ctx: CanvasRenderingContext2D,
  node: TextNode,
): { lines: string[]; size: number; fits: boolean } {
  let size = node.size;
  let lines: string[] = [];
  for (; size >= node.minSize; size--) {
    ctx.font = `${node.italic ? "italic " : ""}${node.weight ?? 400} ${size}px ${node.family}`;
    lines = wrapText(
      ctx,
      node.vertical ? Array.from(node.text).join("\n") : node.text,
      node.w,
    );
    if (
      lines.length <= (node.maxLines ?? Infinity) &&
      lines.length * size * (node.lineHeight ?? 1.42) <= node.h &&
      lines.every((line) => ctx.measureText(line).width <= node.w + 0.5)
    ) {
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
      if (fittedLines.length) return { lines: fittedLines, size, fits: true };
    }
  }
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
  let reduction = -4;
  let items: {
    block: FlowNode["blocks"][number];
    size: number;
    height: number;
  }[] = [];
  let total = 0;
  for (; reduction <= 40; reduction++) {
    let orphan = false;
    items = node.blocks.map((block) => {
      const size = Math.max(block.minSize, block.size - reduction);
      ctx.font = `${block.weight ?? 400} ${size}px ${block.family}`;
      const lines = wrapText(ctx, block.text, node.w);
      // Wrapped lines of one or two characters read as mistakes; only allow
      // them at the base size, never as the result of enlarging.
      const paragraphs = new Set(block.text.split("\n").map((p) => p.trim()));
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
  await withTimeout(loadDisplayFonts()).catch(() => undefined);
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
      "画像を描画できません。このブラウザのCanvasを確認してください。",
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
          scene.document.kind === "event-flyer"
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
          `「${({ "program-1": "本文・出演者（左）", "program-2": "本文・出演者（右）", "details-1": "会場・詳細（左）", "details-2": "会場・詳細（右）", title: "タイトル", subtitle: "サブタイトル", facts: "日時・料金", program: "本文・出演者", details: "会場・詳細", kicker: "上部テキスト" } as Record<string, string>)[node.id] ?? node.id}」が収まりません。文章を短くするか、詳細を減らす・別の構図やサイズを選ぶなどで調整してください。`,
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
        ctx.shadowColor = scene.palette.accent;
        ctx.shadowBlur = node.shadow === "glow" ? 9 : 0;
        ctx.shadowOffsetX = node.shadow === "registration" ? 2 : 0;
        ctx.shadowOffsetY = node.shadow === "registration" ? 1 : 0;
      }
      const textY =
        node.valign === "center"
          ? node.y +
            Math.max(
              0,
              (node.h -
                result.lines.length * result.size * (node.lineHeight ?? 1.42)) /
                2,
            )
          : node.y;
      result.lines.forEach((line, index) =>
        ctx.fillText(
          line,
          x,
          textY + index * result.size * (node.lineHeight ?? 1.42),
        ),
      );
      const usedWidth = Math.max(
        ...result.lines.map((line) => ctx.measureText(line).width),
        0,
      );
      const usedBounds = {
        x:
          node.align === "center"
            ? x - usedWidth / 2
            : node.align === "right"
              ? x - usedWidth
              : x,
        y: textY,
        w: usedWidth,
        h: result.lines.length * result.size * (node.lineHeight ?? 1.42),
      };
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
    } else if (node.kind === "art") drawArtwork(ctx, node);
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
          `「${first.id}」と「${second.id}」の文字が重なっています。配置を初期値に戻すか別の構図を選んでください。`,
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
