import type { Scene, SceneNode, TextNode, Rect } from "./scene";
import { defaultPlacement } from "./document";
import { canvasBlob, withTimeout } from "../export/files";
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
      lines.length * size * (node.lineHeight ?? 1.42) <= node.h &&
      lines.every((line) => ctx.measureText(line).width <= node.w + 0.5)
    )
      return { lines, size, fits: true };
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
function art(
  ctx: CanvasRenderingContext2D,
  node: Extract<SceneNode, { kind: "art" }>,
) {
  const { x, y, w, h, color, soft, ink } = node;
  const full = w > 900;
  const fill = (c: string, px: number, py: number, pw: number, ph: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + px * w, y + py * h, pw * w, ph * h);
  };
  const circle = (c: string, px: number, py: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x + px * w, y + py * h, r * w, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  switch (node.art) {
    case "livehouse":
      fill(ink, 0.02, 0.02, 0.96, 0.025);
      fill(color, 0.02, 0.07, 0.018, 0.86);
      for (let i = 0; i < 8; i++)
        fill(soft, 0.02 + i * 0.12, 0.965, 0.07, 0.018);
      if (!full)
        for (let i = 0; i < 20; i++)
          fill(i % 3 ? ink : color, i / 20, 0, 0.025, 1);
      break;
    case "citypop": {
      if (full) {
        fill(soft, 0, 0, 1, 0.025);
        fill(color, 0, 0.975, 1, 0.025);
      } else {
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, soft);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, w, h);
        circle("#fff1ce", 0.55, 0.39, 0.25);
        for (let i = 0; i < 9; i++)
          fill(soft, 0, 0.57 + i * 0.055, 1, 0.008 + i * 0.001);
        for (let i = 0; i < 8; i++)
          fill(ink, i * 0.15, 0.8 - (i % 3) * 0.06, 0.1, 0.3);
      }
      break;
    }
    case "neon":
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = i % 2 ? soft : color;
        ctx.lineWidth = i === 0 ? 8 : 2;
        ctx.beginPath();
        ctx.ellipse(
          x + w / 2,
          y + h * 0.2,
          w * (0.44 - i * 0.025),
          h * (0.18 - i * 0.012),
          0,
          Math.PI,
          2 * Math.PI,
        );
        ctx.stroke();
      }
      fill(color, 0.02, 0.025, 0.015, 0.93);
      fill(color, 0.965, 0.025, 0.015, 0.93);
      break;
    case "riso":
      circle(soft, full ? 0.16 : 0.46, full ? 0.2 : 0.48, full ? 0.11 : 0.37);
      ctx.globalAlpha = 0.8;
      circle(color, full ? 0.17 : 0.51, full ? 0.2 : 0.51, full ? 0.09 : 0.3);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = ink;
        const px = ((i * 47) % 97) / 97;
        const py = ((i * 31) % 89) / 89;
        ctx.fillRect(x + px * w, y + py * h, 1.3, 1.3);
      }
      break;
    case "acoustic":
      if (full) {
        for (let i = 0; i < 10; i++) fill(soft, 0.02 + i * 0.1, 0, 0.001, 1);
      } else {
        circle(ink, 0.5, 0.5, 0.47);
        for (let i = 1; i <= 5; i++) {
          ctx.beginPath();
          ctx.arc(
            x + w * 0.5,
            y + h * 0.5,
            w * (0.1 + i * 0.06),
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = soft;
          ctx.stroke();
        }
        circle(color, 0.5, 0.5, 0.13);
        circle(soft, 0.5, 0.5, 0.025);
      }
      break;
    case "indie":
      fill(color, 0, 0, 0.025, 0.7);
      fill(soft, 0.35, 0.02, 0.63, 0.012);
      fill(color, 0.88, 0.95, 0.1, 0.03);
      if (!full) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w * 0.7, y + h);
        ctx.lineTo(x, y + h);
        ctx.fill();
      }
      break;
    case "festival":
      fill(color, 0, 0, 1, 0.028);
      fill(soft, 0, 0.31, 1, 0.055);
      for (let i = 0; i < 12; i++) {
        circle(i % 2 ? soft : color, 0.04 + i * 0.083, 0.972, 0.012);
      }
      break;
    case "botanical":
      for (const right of [false, true])
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? soft : color;
          ctx.beginPath();
          ctx.ellipse(
            x + w * (right ? 0.975 - (i % 2) * 0.016 : 0.025 + (i % 2) * 0.016),
            y + h * (0.07 + i * 0.07),
            w * 0.016,
            h * 0.025,
            right ? -0.6 : 0.6,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      break;
    case "forest":
      if (full) {
        fill(soft, 0, 0.97, 1, 0.03);
      } else {
        ctx.fillStyle = soft;
        ctx.fillRect(x, y, w, h);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i % 2 ? color : ink;
          ctx.beginPath();
          ctx.moveTo(x + (i * w) / 5 - w * 0.15, y + h);
          ctx.lineTo(
            x + (i * w) / 5 + w * 0.12,
            y + h * (0.05 + (i % 2) * 0.2),
          );
          ctx.lineTo(x + (i * w) / 5 + w * 0.35, y + h);
          ctx.fill();
        }
      }
      break;
    case "watercolor":
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = 0.18;
        circle(
          i % 2 ? color : soft,
          i % 2 ? 0.96 : 0.04,
          0.1 + i * 0.13,
          0.1 + (i % 3) * 0.03,
        );
      }
      ctx.globalAlpha = 1;
      break;
    case "swiss":
      fill(color, 0.02, 0.025, 0.08, 0.015);
      fill(ink, 0.02, 0.34, 0.96, 0.002);
      fill(soft, 0.02, 0.97, 0.96, 0.008);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.56, y + h * 0.36);
      ctx.lineTo(x + w * 0.56, y + h * 0.97);
      ctx.stroke();
      break;
    case "gallery":
      fill(color, 0.02, 0.02, 0.06, 0.004);
      fill(color, 0.02, 0.98, 0.06, 0.004);
      if (!full) {
        fill(soft, 0, 0, 1, 1);
        circle(color, 0.45, 0.45, 0.23);
        fill(ink, 0.62, 0.45, 0.16, 0.45);
      }
      break;
    case "magazine":
      fill(ink, 0.02, 0.02, 0.96, 0.008);
      fill(color, 0.02, 0.35, 0.96, 0.006);
      if (!full) {
        fill(soft, 0, 0, 1, 1);
        for (let i = 0; i < 5; i++)
          fill(i % 2 ? color : ink, i * 0.2, 0.1 + i * 0.1, 0.12, 0.9);
      }
      break;
    case "showa":
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 15, y + 15, w - 30, h - 30);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 24, y + 24, w - 48, h - 48);
      circle(soft, 0.28, 0.16, 0.16);
      break;
    case "washi":
      if (full) {
        for (let i = 0; i < 7; i++) fill(soft, 0.02 + i * 0.16, 0, 0.001, 1);
      } else {
        for (let i = 0; i < 7; i++) {
          ctx.globalAlpha = 0.12;
          fill(ink, 0.2 + i * 0.035, 0.03 + i * 0.008, 0.22, 0.9 - i * 0.01);
        }
        ctx.globalAlpha = 1;
      }
      break;
    case "sticker":
      circle(soft, 0.91, 0.31, 0.08);
      circle(color, 0.09, 0.95, 0.035);
      fill(soft, 0.02, 0.025, 0.65, 0.018);
      if (!full) {
        fill(soft, 0, 0, 1, 1);
        for (let i = 0; i < 6; i++) fill(color, i * 0.17, 0.1, 0.07, 0.8);
      }
      break;
    case "party":
      ctx.setLineDash([4, 7]);
      ctx.strokeRect(x + 22, y + 22, w - 44, h - 44);
      ctx.setLineDash([]);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? color : soft;
        ctx.beginPath();
        ctx.moveTo(x + (i * w) / 12, y + 15);
        ctx.lineTo(x + ((i + 1) * w) / 12, y + 15);
        ctx.lineTo(x + ((i + 0.5) * w) / 12, y + 45);
        ctx.fill();
      }
      break;
    case "deco":
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = i === 0 ? 3 : 1;
        ctx.strokeRect(
          x + 16 + i * 10,
          y + 16 + i * 10,
          w - 32 - i * 20,
          h - 32 - i * 20,
        );
      }
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5 - i * 12, y + 12);
        ctx.lineTo(x + w * 0.5, y + 45 + i * 2);
        ctx.lineTo(x + w * 0.5 + i * 12, y + 12);
        ctx.stroke();
      }
      break;
    case "serif":
      fill(color, 0.05, 0.025, 0.9, 0.001);
      fill(color, 0.05, 0.97, 0.9, 0.001);
      circle(color, 0.5, 0.985, 0.004);
      break;
    case "information":
      fill(color, 0, 0, 1, 0.018);
      fill(soft, 0, 0.98, 1, 0.02);
      break;
  }
  ctx.restore();
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
  await withTimeout(document.fonts.ready);
  // Explicitly request glyph subsets for Canvas text (FontFaceSet.ready alone cannot discover canvas content).
  await withTimeout(
    Promise.all(
      scene.nodes
        .filter((n): n is TextNode => n.kind === "text")
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
  for (const node of scene.nodes) {
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
      result.lines.forEach((line, index) =>
        ctx.fillText(
          line,
          x,
          node.y + index * result.size * (node.lineHeight ?? 1.42),
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
        y: node.y,
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
    } else if (node.kind === "art") art(ctx, node);
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
  return { canvas, errors: [...new Set(errors)], measurements };
}
export async function scenePng(result: RenderResult): Promise<Blob> {
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  return canvasBlob(result.canvas);
}
