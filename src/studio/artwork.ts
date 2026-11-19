import type { ModernTemplateId, Palette } from "./registry";
import type { Rect } from "./scene";
import { posterStyles, stockInks } from "./posterStyles";

export type ArtworkNode = Rect & {
  kind: "art";
  art: ModernTemplateId;
  role: "masthead" | "hero" | "foot" | "ticket";
  palette: Palette;
  clearUntil?: number;
};

export function mix(a: string, b: string, t: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((i) => {
        const start = parseInt(a.slice(i, i + 2), 16);
        const end = parseInt(b.slice(i, i + 2), 16);
        return Math.round(start + (end - start) * t)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

type Ctx = CanvasRenderingContext2D;
function line(
  ctx: Ctx,
  color: string,
  x: number,
  y: number,
  endX: number,
  endY: number,
  width = 1,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}
function disc(ctx: Ctx, color: string, x: number, y: number, radius: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
function register(ctx: Ctx, x: number, y: number, ink: string) {
  line(ctx, ink, x - 8, y, x + 8, y);
  line(ctx, ink, x, y - 8, x, y + 8);
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, 2 * Math.PI);
  ctx.stroke();
}

function masthead(ctx: Ctx, { art, w, h, palette: p }: ArtworkNode) {
  const stock = posterStyles[art].stock;
  const fine = mix(p[stock], stockInks(p, stock).text, 0.36);
  switch (art) {
    case "livehouse":
      for (let x = 18; x < w; x += 39) {
        ctx.fillStyle = p.paper;
        ctx.fillRect(x, 10, 15, 5);
      }
      break;
    case "citypop":
      for (let i = 0; i < 4; i++)
        line(ctx, fine, 0, h - 4 - i * 5, w, h - 4 - i * 5, 1 + i * 0.45);
      break;
    case "neon": {
      const haze = ctx.createLinearGradient(0, h, w * 0.65, 0);
      haze.addColorStop(0, p.paper);
      haze.addColorStop(1, mix(p.paper, p.accent, 0.13));
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);
      line(ctx, p.accent, 16, h - 18, w - 16, h - 18, 2);
      line(ctx, p.accent, 16, h - 18, 16, h - 57, 2);
      break;
    }
    case "riso":
      register(ctx, 23, 23, p.accent);
      register(ctx, w - 23, h - 16, p.ink);
      break;
    case "acoustic":
      for (let i = 0; i < 6; i++)
        line(ctx, fine, 0, 11 + i * 3.3, w, 11 + i * 3.3, i < 3 ? 1.6 : 0.8);
      break;
    case "indie":
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = p.onAccent;
        ctx.fill(new Path2D(`M${19 + i * 17} 0 h8 l-15 24 h-8 Z`));
      }
      break;
    case "festival":
      line(ctx, fine, 0, h - 6, w, h - 6, 2);
      break;
    case "botanical":
      line(ctx, fine, 25, 25, w - 25, 25);
      line(ctx, fine, 25, 25, 25, h - 20);
      break;
    case "forest":
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = fine;
        ctx.lineWidth = 0.9;
        ctx.stroke(
          new Path2D(
            `M0 ${h - 13 + i * 4} Q85 ${h - 48 + i * 5} 175 ${h - 20 + i * 4} T410 ${h - 14 + i * 3}`,
          ),
        );
      }
      break;
    case "swiss":
      line(ctx, p.ink, 0, h - 3, w, h - 3, 6);
      break;
    case "gallery":
      line(ctx, fine, 44, 23, w - 44, 23);
      break;
    case "magazine":
      line(ctx, p.ink, 0, h - 5, w, h - 5, 5);
      line(ctx, p.ink, 0, h - 12, w, h - 12);
      break;
    case "showa":
      for (let x = 0; x < w; x += 24) {
        ctx.fillStyle = p.onAccent;
        ctx.fillRect(x, 0, 12, 7);
      }
      break;
    case "washi":
      for (let i = 0; i < 165; i++) {
        const x = (i * 197) % w,
          y = (i * 137) % h;
        line(ctx, mix(p.paper, p.ink, 0.08), x, y, x + 3 + (i % 7), y - 2, 0.9);
      }
      break;
    case "sticker":
      for (let i = 0; i < 3; i++) disc(ctx, p.ink, 21 + i * 13, 18, 3.8);
      break;
    case "party":
      ctx.strokeStyle = fine;
      ctx.lineWidth = 2.5;
      ctx.stroke(new Path2D("M25 23 q12 -13 24 0 t24 0 t24 0"));
      break;
    case "deco":
      for (const mirror of [false, true]) {
        ctx.save();
        if (mirror) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        const radius = Math.min(w * 0.22, h * 0.59);
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 30,
            b = ((i + 0.65) * Math.PI) / 30;
          ctx.fillStyle = i % 2 ? fine : mix(p.paper, p.accent, 0.52);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, a, b);
          ctx.fill();
        }
        ctx.strokeStyle = p.accent;
        for (const factor of [0.55, 0.82, 1.02, 1.06]) {
          ctx.lineWidth = factor < 1 ? 1 : 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius * factor, 0, Math.PI / 2);
          ctx.stroke();
        }
        line(ctx, fine, 15, radius + 15, 15, h - 13);
        ctx.restore();
      }
      for (const offset of [0, 7]) {
        line(ctx, p.accent, w * 0.31, 18 + offset, w * 0.48, 18 + offset);
        line(ctx, p.accent, w * 0.52, 18 + offset, w * 0.69, 18 + offset);
      }
      ctx.fillStyle = p.accent;
      ctx.fill(new Path2D(`M${w / 2} 12 l9 9 -9 9 -9 -9 Z`));
      break;
    case "serif":
      line(ctx, fine, 44, 19, w - 44, 19);
      line(ctx, fine, 44, 24, w - 44, 24);
      break;
    case "information":
      line(ctx, p.ink, 0, 7, w, 7, 14);
      break;
  }
}

function enso(ctx: Ctx, w: number, h: number, p: Palette) {
  const size = Math.min(w, h);
  ctx.translate(w / 2, h / 2);
  ctx.scale(size / 460, size / 460);
  // Independent brush hairs run dry at different points along the stroke.
  for (let hair = 0; hair < 66; hair++) {
    const offset = hair / 65 - 0.5;
    ctx.beginPath();
    let touching = false;
    for (let step = 0; step < 170; step++) {
      const t = step / 169;
      const a = -1.24 + 5.86 * t;
      const radius =
        161 +
        10 * Math.sin(t * 7) +
        6 * Math.sin(t * 12 + 2) +
        offset * (13 + 66 * Math.sin(0.18 + Math.PI * t) ** 2) +
        2 * Math.sin(17 * t + hair);
      const x = radius * Math.cos(a),
        y = radius * Math.sin(a) * 1.08;
      if (t > 0.7 && (step + 6 * hair) % 19 < (t - 0.7) * 38) touching = false;
      else if (touching) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        touching = true;
      }
    }
    ctx.strokeStyle = mix(p.paper, p.ink, 0.55 + ((hair * 29) % 41) / 100);
    ctx.lineWidth = 2.8;
    ctx.stroke();
  }
  ctx.translate(144, 133);
  ctx.rotate(-0.035);
  ctx.fillStyle = p.id === "mono" ? "#ad3928" : p.accent;
  ctx.fillRect(-21, -24, 42, 48);
  ctx.strokeStyle = p.id === "mono" ? "#fff4dc" : p.onAccent;
  ctx.lineWidth = 2.3;
  ctx.stroke(
    new Path2D(
      "M-15 -18 H15 V18 H-15 Z M-9 -10 H9 M0 -10 V11 M-9 0 H9 M-8 11 H8",
    ),
  );
}

function illustration(
  ctx: Ctx,
  node: ArtworkNode,
  image?: HTMLImageElement | HTMLCanvasElement,
) {
  const { art, w, h, palette: p } = node;
  if (art === "washi") return enso(ctx, w, h, p);
  if (art === "swiss" || art === "information") {
    const side = Math.min(w, h);
    ctx.translate((w - side) / 2, (h - side) / 2);
    ctx.fillStyle = p.accent;
    if (art === "swiss") {
      ctx.fillRect(0, 0, side, side);
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = p.onAccent;
        ctx.lineWidth = side * 0.035;
        ctx.beginPath();
        ctx.arc(0, side, side * (0.32 + i * 0.17), -Math.PI / 2, 0);
        ctx.stroke();
      }
    } else {
      // Three folds of a leaflet, readable even in the small studio thumbnail.
      for (let i = 0; i < 3; i++) {
        const x = (i * side) / 3,
          rise = i % 2 ? side * 0.16 : 0;
        ctx.fillStyle = [p.ink, p.accent, p.soft][i];
        ctx.fill(
          new Path2D(
            `M${x} ${rise} l${side / 3} ${side * 0.16 - 2 * rise} v${side * 0.8} l${-side / 3} ${2 * rise - side * 0.16}Z`,
          ),
        );
      }
    }
    return;
  }
  if (!image) return;
  const frame = posterStyles[art].illustration;
  const side = Math.min(w, h);
  if (art === "botanical") {
    ctx.fillStyle = mix(p.paper, p.soft, 0.52);
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, side * 0.47, side * 0.47, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (art === "riso") {
    disc(
      ctx,
      p.accent,
      w / 2 - side * 0.045,
      h / 2 + side * 0.035,
      side * 0.48,
    );
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 10; col++)
        disc(
          ctx,
          p.ink,
          w * 0.08 + col * side * 0.035,
          h * 0.72 + row * side * 0.035,
          side * 0.005,
        );
  }
  if (frame === "arch") {
    const radius = Math.min(w / 2, h * 0.42);
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, [radius, radius, 0, 0]);
    ctx.clip();
  } else if (frame === "round") {
    // A record, a die-cut label and a balloon-shaped window each keep their outline.
    ctx.beginPath();
    if (art === "riso") ctx.arc(w / 2, h / 2, side / 2, 0, Math.PI * 2);
    else if (art === "party")
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, -0.06, 0, Math.PI * 2);
    else {
      const cx = w / 2,
        cy = h / 2;
      for (let i = 0; i <= 360; i++) {
        const a = (i * Math.PI) / 180,
          r = 0.96 + 0.04 * Math.cos(a * 16);
        const x = cx + cx * r * Math.cos(a),
          y = cy + cy * r * Math.sin(a);
        if (!i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.clip();
  } else if (frame === "torn") {
    const edge = new Path2D();
    edge.moveTo(18, 0);
    edge.lineTo(w, 0);
    edge.lineTo(w, h);
    edge.lineTo(0, h);
    for (let y = h; y > 0; y -= 7)
      edge.lineTo(5 + 18 * (1 - y / h) + ((Math.round(y) * 17) % 11), y);
    edge.closePath();
    ctx.clip(edge);
  }
  // The botanical inks keep the complete impression. The other plates are
  // prints or photographs composed for a bleed and receive an undistorted crop.
  const width = image.width,
    height = image.height;
  const stage = art === "neon" && node.clearUntil !== undefined;
  const left = stage ? (node.clearUntil ?? 0) - w * 0.09 : 0;
  const imageWidth = w - left;
  const scale =
    frame === "specimen" || art === "riso"
      ? Math.min(imageWidth / width, h / height)
      : Math.max(imageWidth / width, h / height);
  const dw = width * scale,
    dh = height * scale;
  ctx.imageSmoothingQuality = "high";
  const verticalFocus =
    node.clearUntil !== undefined && art === "forest" ? 0.2 : 0.5;
  ctx.drawImage(
    image,
    left + (imageWidth - dw) / 2,
    (h - dh) * verticalFocus,
    dw,
    dh,
  );
  if (node.clearUntil !== undefined) {
    // The supplied illustration may extend behind the title. Keep enough
    // opaque stock under its entire measure, then reveal the unprinted plate.
    const stock = p[posterStyles[art].stock];
    const veil = ctx.createLinearGradient(0, 0, w, 0);
    const end = Math.min(0.85, node.clearUntil / w);
    veil.addColorStop(0, stock);
    veil.addColorStop(end * 0.73, stock + "fc");
    veil.addColorStop(end, stock + "e8");
    veil.addColorStop(Math.min(1, end + (stage ? 0.1 : 0.21)), stock + "00");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
  }
  if (frame === "mount") {
    ctx.strokeStyle = mix(p.ink, p.paper, 0.75);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }
  if (art === "neon" && node.clearUntil === undefined) {
    const light = ctx.createLinearGradient(0, 0, w * 0.32, 0);
    light.addColorStop(0, p.paper);
    light.addColorStop(1, p.paper + "00");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w * 0.32, h);
  }
}

function foot(ctx: Ctx, { art, w, h, palette: p }: ArtworkNode) {
  const y = h / 2;
  switch (art) {
    case "livehouse":
      for (let x = 0; x < w; x += 42) line(ctx, p.ink, x, y, x + 27, y, 4);
      break;
    case "riso":
      register(ctx, 0, y, p.accent);
      register(ctx, w, y, p.ink);
      break;
    case "citypop":
    case "festival":
      for (let i = 0; i < 3; i++)
        line(
          ctx,
          [p.soft, p.accent, p.ink][i],
          (w * i) / 3,
          y,
          (w * (i + 1)) / 3,
          4,
        );
      break;
    case "deco":
      line(ctx, p.accent, 0, y, w * 0.47, y);
      line(ctx, p.accent, w * 0.53, y, w, y);
      ctx.fillStyle = p.accent;
      ctx.fill(new Path2D(`M${w / 2} ${y - 5} l9 5 -9 5 -9 -5 Z`));
      break;
    case "gallery":
    case "serif":
    case "magazine":
    case "swiss":
    case "information":
      line(ctx, p.ink, 0, y, w, y, art === "swiss" ? 4 : 1.4);
      break;
  }
}

export function drawArtwork(
  ctx: Ctx,
  node: ArtworkNode,
  plate?: HTMLImageElement | HTMLCanvasElement,
) {
  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.beginPath();
  ctx.rect(0, 0, node.w, node.h);
  ctx.clip();
  if (node.role === "hero") illustration(ctx, node, plate);
  else if (node.role === "masthead") masthead(ctx, node);
  else if (node.role === "foot") foot(ctx, node);
  else {
    for (const x of [0, node.w])
      for (let y = 8; y < node.h; y += 16)
        disc(ctx, node.palette.paper, x, y, 3.5);
  }
  ctx.restore();
}
