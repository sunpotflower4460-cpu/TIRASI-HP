import type { ArtworkNode } from "./artwork";

// Second-generation hero illustrations. Each one is drawn in an undistorted
// local space (1 unit is the same size on both axes), so round shapes stay
// round at every output size. All shapes are original geometry: no remote or
// third-party artwork.

type Pt = [number, number];

function mixHex(a: string, b: string, amount: number): string {
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(a.slice(i, i + 2), 16) * (1 - amount) +
            parseInt(b.slice(i, i + 2), 16) * amount,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] +
      3 * u * u * t * p1[0] +
      3 * u * t * t * p2[0] +
      t * t * t * p3[0],
    u * u * u * p0[1] +
      3 * u * u * t * p1[1] +
      3 * u * t * t * p2[1] +
      t * t * t * p3[1],
  ];
}

/** Aspect (width / height) of the refined illustrations that need one. */
export const refinedAspect: Partial<Record<ArtworkNode["art"], number>> = {
  acoustic: 0.62,
  neon: 0.5,
  washi: 1.08,
  botanical: 0.6,
  serif: 0.62,
};

/**
 * Draws the refined hero for `node.art` when one exists. The caller has
 * already translated/scaled so the slot is a 1000×1000 unit box with x-scale
 * `sx` and y-scale `sy` in pixels. Returns false when there is no refined
 * version (the original drawing is then used).
 */
export function drawRefinedHero(
  ctx: CanvasRenderingContext2D,
  node: ArtworkNode,
  sx: number,
  sy: number,
): boolean {
  const { color: accent, soft, ink, paper } = node;
  const k = sx / sy;
  // Local uniform space: width 1000, height H.
  const H = 1000 / k;
  const fill = (
    d: string | Path2D,
    color: string | CanvasGradient,
    alpha = 1,
  ) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(typeof d === "string" ? new Path2D(d) : d);
    ctx.globalAlpha = 1;
  };
  const stroke = (
    d: string | Path2D,
    color: string,
    width: number,
    alpha = 1,
  ) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(typeof d === "string" ? new Path2D(d) : d);
    ctx.globalAlpha = 1;
  };
  const circle = (cx: number, cy: number, r: number) => {
    const p = new Path2D();
    p.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
    return p;
  };
  const grain = (alpha: number, seed = 7) => {
    const rnd = seeded(seed);
    ctx.save();
    ctx.fillStyle = ink;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 1400; i++)
      ctx.fillRect(
        rnd() * 1000,
        rnd() * H,
        0.8 + rnd() * 1.6,
        0.8 + rnd() * 1.6,
      );
    ctx.restore();
  };
  // Mirror a right-half outline (starting and ending on x=0) into a closed path.
  const mirrored = (half: string, cx: number, cy: number) => {
    const p = new Path2D();
    const m = new DOMMatrix().translate(cx, cy);
    p.addPath(new Path2D(half), m);
    p.addPath(new Path2D(half), m.scale(-1, 1));
    return p;
  };
  // A leaf with a shaded half and midrib; length along -y before rotation.
  const leaf = (
    x: number,
    y: number,
    length: number,
    angle: number,
    body: string,
    vein: string,
    width = 0.42,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const w = length * width;
    const outline = `M0 0 C${-w} ${-length * 0.22} ${-w * 0.9} ${-length * 0.78} 0 ${-length} C${w * 0.9} ${-length * 0.78} ${w} ${-length * 0.22} 0 0Z`;
    fill(outline, body);
    fill(
      `M0 0 C${w} ${-length * 0.22} ${w * 0.9} ${-length * 0.78} 0 ${-length} Q${w * 0.08} ${-length * 0.5} 0 0Z`,
      vein,
      0.22,
    );
    stroke(
      `M0 ${-length * 0.02} Q${w * 0.06} ${-length * 0.5} 0 ${-length * 0.94}`,
      vein,
      Math.max(1.6, length * 0.012),
      0.75,
    );
    for (let i = 1; i < 5; i++) {
      const yy = -length * (0.18 + i * 0.15);
      stroke(
        `M0 ${yy} Q${-w * 0.35} ${yy - length * 0.05} ${-w * 0.62} ${yy - length * 0.14}`,
        vein,
        1.1,
        0.35,
      );
      stroke(
        `M0 ${yy} Q${w * 0.35} ${yy - length * 0.05} ${w * 0.62} ${yy - length * 0.14}`,
        vein,
        1.1,
        0.35,
      );
    }
    ctx.restore();
  };

  ctx.save();
  ctx.scale(1, k);
  try {
    switch (node.art) {
      case "acoustic": {
        const wood = mixHex(accent, soft, 0.55);
        const woodDark = mixHex(accent, ink, 0.25);
        fill(circle(560, 900, 470), mixHex(soft, paper, 0.25), 0.9);
        ctx.save();
        ctx.translate(510, H * 0.73);
        ctx.rotate(0.13);
        ctx.scale(0.88, 0.88);
        const half =
          "M0 -330 C112 -330 196 -292 204 -196 C211 -118 152 -78 162 -6 C172 66 312 104 312 250 C312 400 166 452 0 452";
        const body = mirrored(half, 0, 0);
        // Cast shadow, body, sides and binding.
        ctx.save();
        ctx.translate(26, 20);
        fill(body, ink, 0.14);
        ctx.restore();
        const bodyFill = ctx.createLinearGradient(-310, -330, 310, 450);
        bodyFill.addColorStop(0, mixHex(wood, paper, 0.25));
        bodyFill.addColorStop(1, wood);
        fill(body, bodyFill);
        ctx.save();
        ctx.clip(body);
        for (let i = 0; i < 16; i++)
          stroke(
            `M${-330 + i * 44} 470 C${-300 + i * 44} 160 ${-350 + i * 44} -120 ${-305 + i * 44} -340`,
            woodDark,
            2,
            0.1,
          );
        ctx.restore();
        stroke(body, ink, 7);
        ctx.save();
        ctx.scale(0.955, 0.965);
        stroke(mirrored(half, 0, 4), paper, 2.5, 0.8);
        ctx.restore();
        // Pickguard, sound hole and rosette.
        fill(
          "M70 -10 C150 -40 196 30 168 106 C140 170 70 150 46 100 Z",
          woodDark,
          0.45,
        );
        fill(circle(0, -40, 92), mixHex(soft, paper, 0.1));
        for (const [r, w] of [
          [88, 3],
          [80, 1.5],
          [74, 1.5],
        ] as const)
          stroke(circle(0, -40, r), ink, w, 0.85);
        fill(circle(0, -40, 66), ink);
        // Bridge with saddle and pins.
        fill(
          "M-120 262 Q-120 236 -92 236 H92 Q120 236 120 262 Q120 288 92 288 H-92 Q-120 288 -120 262Z",
          ink,
        );
        stroke("M-62 250 H62", paper, 3, 0.9);
        for (let i = 0; i < 6; i++) fill(circle(-45 + i * 18, 272, 4.5), paper);
        // Neck, frets, inlays and headstock.
        fill("M-38 -322 L-30 -1010 H30 L38 -322Z", mixHex(ink, wood, 0.18));
        let fy = -1000;
        for (let i = 0; i < 18; i++) {
          stroke(`M-34 ${fy} H34`, mixHex(soft, paper, 0.3), 2.2);
          fy += 58 - i * 1.6;
        }
        for (const t of [3, 5, 7, 9, 12])
          fill(circle(0, -1000 + (t - 0.5) * (58 - t * 0.8), 6.5), paper, 0.85);
        fill(
          "M-30 -1008 L-52 -1060 C-58 -1120 -50 -1170 -44 -1205 Q0 -1222 44 -1205 C50 -1170 58 -1120 52 -1060 L30 -1008Z",
          ink,
        );
        for (let i = 0; i < 3; i++) {
          const yy = -1065 - i * 48;
          for (const side of [-1, 1]) {
            stroke(`M${side * 46} ${yy} H${side * 72}`, ink, 9);
            fill(
              `M${side * 72} ${yy - 15} Q${side * 96} ${yy} ${side * 72} ${yy + 15}Z`,
              mixHex(soft, paper, 0.2),
            );
            fill(circle(side * 26, yy, 7), mixHex(soft, paper, 0.4));
          }
        }
        fill("M-30 -1012 H30 V-1000 H-30Z", paper);
        // Strings from nut to bridge.
        for (let i = 0; i < 6; i++)
          stroke(
            `M${-24 + i * 9.6} -1006 L${-45 + i * 18} 262`,
            mixHex(paper, "#ffffff", 0.4),
            i < 3 ? 1.8 : 1.1,
            0.9,
          );
        ctx.restore();
        grain(0.05, 11);
        return true;
      }
      case "neon": {
        const cyan = mixHex("#73edf2", paper, 0.12);
        const pink = mixHex(accent, "#ffffff", 0.18);
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, mixHex(paper, ink, 0.08));
        bg.addColorStop(1, mixHex(paper, accent, 0.18));
        fill(`M0 0 H1000 V${H} H0Z`, bg);
        // Stage light cone and floor glow.
        const cone = ctx.createLinearGradient(0, 0, 0, H * 0.85);
        cone.addColorStop(0, mixHex(accent, "#ffffff", 0.4));
        cone.addColorStop(1, paper);
        fill(`M430 0 H570 L960 ${H * 0.86} H40Z`, cone, 0.28);
        const floor = ctx.createRadialGradient(
          500,
          H * 0.9,
          10,
          500,
          H * 0.9,
          470,
        );
        floor.addColorStop(0, mixHex(accent, paper, 0.25));
        floor.addColorStop(1, paper);
        ctx.save();
        ctx.scale(1, 0.22);
        fill(circle(500, (H * 0.9) / 0.22, 470), floor, 0.9);
        ctx.restore();
        // Neon tube: soft halo strokes and a hot core, all scale invariant.
        const tube = (d: string, color: string, core = 5) => {
          for (const [w, a] of [
            [46, 0.06],
            [28, 0.12],
            [16, 0.22],
            [9, 0.45],
          ] as const)
            stroke(d, color, w, a);
          stroke(d, mixHex(color, "#ffffff", 0.65), core);
        };
        const top = H * 0.12;
        ctx.save();
        ctx.translate(500, top);
        ctx.scale(1.45, 1.45);
        ctx.translate(-500, -top);
        // Microphone head (capsule) with grille, neck, clip and stand.
        const head = `M410 ${top + 150} C410 ${top + 40} 590 ${top + 40} 590 ${top + 150} V${top + 290} C590 ${top + 360} 410 ${top + 360} 410 ${top + 290}Z`;
        ctx.save();
        ctx.clip(new Path2D(head));
        for (let i = -10; i < 12; i++) {
          stroke(
            `M${380 + i * 26} ${top + 40} L${520 + i * 26} ${top + 380}`,
            cyan,
            2,
            0.35,
          );
          stroke(
            `M${620 - i * 26} ${top + 40} L${480 - i * 26} ${top + 380}`,
            cyan,
            2,
            0.35,
          );
        }
        ctx.restore();
        tube(head, cyan);
        tube(`M410 ${top + 238} H590`, cyan, 3);
        tube(
          `M455 ${top + 352} L475 ${top + 470} H525 L545 ${top + 352}`,
          pink,
        );
        ctx.restore();
        const neckY = top + 470 * 1.45;
        tube(`M500 ${neckY} V${H * 0.86}`, pink);
        tube(
          `M500 ${H * 0.86} L330 ${H * 0.94} M500 ${H * 0.86} L670 ${H * 0.94} M500 ${H * 0.86} V${H * 0.95}`,
          pink,
        );
        // Musical sparkle accents.
        const rnd = seeded(5);
        for (let i = 0; i < 9; i++) {
          const x = 90 + rnd() * 820,
            y = 60 + rnd() * H * 0.7;
          if (Math.abs(x - 500) < 210 && y > top && y < top + 760) continue;
          const s = 8 + rnd() * 14;
          tube(
            `M${x - s} ${y} H${x + s} M${x} ${y - s} V${y + s}`,
            i % 2 ? pink : cyan,
            2,
          );
        }
        return true;
      }
      case "washi": {
        // Ensō: one breath of ink, heavy at the start, dry and broken at the end.
        const cx = 500,
          cy = H * 0.5,
          R = Math.min(340, H * 0.36);
        const rnd = seeded(23);
        const start = -1.95,
          sweep = Math.PI * 1.82;
        const bristles = 46;
        const offsets = Array.from({ length: bristles }, () => rnd());
        const dryness = Array.from({ length: bristles }, () => rnd());
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.08);
        for (let b = 0; b < bristles; b++) {
          ctx.beginPath();
          let drawing = false;
          for (let s = 0; s <= 240; s++) {
            const t = s / 240;
            const width =
              118 *
                Math.pow(1 - t, 0.85) *
                (0.75 + 0.25 * Math.sin(t * 9 + 1)) +
              8;
            const a = start + sweep * t;
            const r =
              R * (1 + 0.04 * Math.sin(t * 5)) + (offsets[b] - 0.5) * width;
            const x = Math.cos(a) * r,
              y = Math.sin(a) * r * 1.04;
            // Bristles run out of ink towards the tail.
            const gap =
              t > 0.55 &&
              dryness[b] < (t - 0.55) * 1.9 &&
              Math.sin(s * 0.7 + b) > -0.2;
            if (gap) {
              drawing = false;
              continue;
            }
            if (!drawing) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            drawing = true;
          }
          ctx.strokeStyle = ink;
          ctx.globalAlpha = 0.34 + dryness[b] * 0.3;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Pooled ink where the brush first touched the paper.
        const a0 = start + 0.02;
        fill(circle(Math.cos(a0) * R, Math.sin(a0) * R, 22), ink, 0.35);
        ctx.restore();
        for (let i = 0; i < 14; i++) {
          const a = rnd() * Math.PI * 2,
            r = R + 60 + rnd() * 70;
          fill(
            circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.5 + rnd() * 4),
            ink,
            0.35,
          );
        }
        // Vermilion seal with a geometric mark (no font dependency).
        const sx0 = cx + R * 0.72,
          sy0 = cy + R * 0.62;
        ctx.save();
        ctx.translate(sx0, sy0);
        ctx.rotate(0.04);
        fill(
          "M-52 -60 H52 Q60 -60 60 -52 V52 Q60 60 52 60 H-52 Q-60 60 -60 52 V-52 Q-60 -60 -52 -60Z",
          accent,
          0.92,
        );
        stroke("M-44 -44 H44 V44 H-44Z", paper, 4, 0.9);
        stroke("M-26 -26 H26 M0 -26 V30 M-26 6 H26 M-20 30 H20", paper, 6, 0.9);
        ctx.restore();
        grain(0.06, 29);
        return true;
      }
      case "botanical": {
        const leafBody = mixHex(soft, paper, 0.1);
        const leafDark = mixHex(accent, ink, 0.2);
        const p0: Pt = [520, H - 20],
          p1: Pt = [380, H * 0.62],
          p2: Pt = [650, H * 0.34],
          p3: Pt = [520, 70];
        stroke(`M${p0} C${p1} ${p2} ${p3}`, leafDark, 6);
        // Side branch.
        const bStart = cubic(p0, p1, p2, p3, 0.38);
        stroke(
          `M${bStart} Q${bStart[0] - 230} ${bStart[1] - 90} ${bStart[0] - 300} ${bStart[1] - 330}`,
          leafDark,
          4,
        );
        const branchLeaves: [number, number, number, number][] = [
          [bStart[0] - 150, bStart[1] - 70, 150, -1.6],
          [bStart[0] - 240, bStart[1] - 170, 140, -0.9],
          [bStart[0] - 290, bStart[1] - 300, 130, -0.4],
          [bStart[0] - 120, bStart[1] - 60, 120, -0.2],
        ];
        for (let i = 0; i < 13; i++) {
          const t = 0.08 + i * 0.068;
          const [x, y] = cubic(p0, p1, p2, p3, t);
          const side = i % 2 ? 1 : -1;
          const length = 330 - i * 15;
          leaf(
            x,
            y,
            length,
            side * (0.85 - t * 0.35),
            i % 3 === 0 ? leafBody : mixHex(soft, accent, 0.25),
            leafDark,
          );
        }
        for (const [x, y, l, a] of branchLeaves)
          leaf(x, y, l, a, leafBody, leafDark);
        // Berries and the tip bud.
        const rnd = seeded(41);
        for (let i = 0; i < 9; i++) {
          const [x, y] = cubic(p0, p1, p2, p3, 0.15 + rnd() * 0.75);
          const bx = x + (rnd() - 0.5) * 220,
            by = y + (rnd() - 0.5) * 120;
          stroke(
            `M${x} ${y} Q${(x + bx) / 2} ${by - 30} ${bx} ${by}`,
            leafDark,
            1.5,
            0.7,
          );
          fill(circle(bx, by, 13), accent);
          fill(circle(bx - 4, by - 4, 4), paper, 0.6);
        }
        fill(`M520 70 C480 40 500 0 520 -10 C540 0 560 40 520 70Z`, accent);
        grain(0.03, 13);
        return true;
      }
      case "serif": {
        const petal = mixHex(soft, accent, 0.18);
        const line = accent;
        const cx = 500,
          cy = H * 0.3;
        // Stem and leaves first.
        stroke(
          `M${cx} ${cy + 60} C${cx + 40} ${H * 0.55} ${cx - 60} ${H * 0.78} ${cx + 10} ${H - 30}`,
          line,
          4.5,
        );
        stroke(
          `M${cx + 5} ${H * 0.62} C${cx + 140} ${H * 0.56} ${cx + 230} ${H * 0.48} ${cx + 250} ${H * 0.38}`,
          line,
          3,
        );
        fill(circle(cx + 250, H * 0.38 - 26, 30), petal);
        stroke(
          `M${cx + 250} ${H * 0.38 + 4} C${cx + 222} ${H * 0.38 - 20} ${cx + 222} ${H * 0.38 - 50} ${cx + 250} ${H * 0.38 - 62} C${cx + 278} ${H * 0.38 - 50} ${cx + 278} ${H * 0.38 - 20} ${cx + 250} ${H * 0.38 + 4}`,
          line,
          2.2,
        );
        leaf(
          cx - 10,
          H * 0.72,
          330,
          -1.05,
          mixHex(soft, accent, 0.3),
          line,
          0.36,
        );
        leaf(
          cx + 10,
          H * 0.82,
          290,
          0.95,
          mixHex(soft, accent, 0.3),
          line,
          0.36,
        );
        // Anemone: six broad petals with veins, dark heart and stamens.
        for (let ring = 0; ring < 2; ring++)
          for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((i * Math.PI) / 3 + ring * (Math.PI / 6) + 0.1);
            const r = ring ? 270 : 330;
            const d = `M0 0 C${-r * 0.62} ${-r * 0.18} ${-r * 0.58} ${-r * 0.95} 0 ${-r} C${r * 0.58} ${-r * 0.95} ${r * 0.62} ${-r * 0.18} 0 0Z`;
            const g = ctx.createLinearGradient(0, 0, 0, -r);
            g.addColorStop(0, mixHex(accent, petal, 0.55));
            g.addColorStop(0.45, petal);
            g.addColorStop(1, mixHex(petal, paper, 0.5));
            fill(d, g, ring ? 1 : 0.95);
            stroke(d, line, 1.6, 0.85);
            for (let j = -2; j <= 2; j++)
              stroke(
                `M0 -40 Q${j * r * 0.12} ${-r * 0.55} ${j * r * 0.08} ${-r * 0.88}`,
                line,
                0.9,
                0.4,
              );
            ctx.restore();
          }
        fill(circle(cx, cy, 62), ink);
        const rnd = seeded(3);
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2 + rnd() * 0.08,
            r = 72 + rnd() * 26;
          stroke(
            `M${cx + Math.cos(a) * 58} ${cy + Math.sin(a) * 58} L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`,
            ink,
            1.4,
            0.8,
          );
          fill(circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4.5), ink);
        }
        fill(circle(cx - 14, cy - 16, 16), mixHex(ink, paper, 0.25), 0.7);
        return true;
      }
      case "livehouse": {
        // A recorded take: played bars bright, the rest dimmed, with a playhead.
        fill(`M0 0 H1000 V${H} H0Z`, ink);
        const rnd = seeded(17);
        const sprockets = H > 320;
        const band = sprockets ? H - 160 : H - 10;
        const mid = H / 2;
        const bars = 150;
        const step = 1000 / bars;
        const playhead = 0.62;
        for (let i = 0; i < bars; i++) {
          const t = i / bars;
          const envelope =
            0.25 +
            0.75 *
              Math.pow(Math.sin(Math.PI * (0.08 + t * 0.86)), 0.6) *
              (0.55 + 0.45 * Math.sin(t * 19 + 1.3) ** 2);
          const amp =
            Math.max(0.05, envelope * (0.55 + rnd() * 0.45)) * band * 0.5;
          const played = t < playhead;
          ctx.globalAlpha = played ? 1 : 0.42;
          ctx.fillStyle = paper;
          ctx.beginPath();
          ctx.roundRect(
            i * step + step * 0.2,
            mid - amp,
            step * 0.6,
            amp * 2,
            step * 0.3,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        fill(`M0 ${mid - 0.75} H1000 V${mid + 0.75} H0Z`, paper, 0.35);
        fill(
          `M${1000 * playhead - 2} ${H * 0.04} H${1000 * playhead + 2} V${H * 0.96} H${1000 * playhead - 2}Z`,
          accent,
        );
        fill(
          circle(1000 * playhead, H * 0.04 + 6, Math.min(12, H * 0.08)),
          accent,
        );
        if (sprockets)
          for (let i = 0; i < 20; i++) {
            fill(`M${i * 50 + 14} 22 h22 v34 h-22Z`, paper);
            fill(`M${i * 50 + 14} ${H - 56} h22 v34 h-22Z`, paper);
          }
        return true;
      }
      case "citypop": {
        const horizon = H * 0.6;
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, mixHex(ink, accent, 0.45));
        sky.addColorStop(0.65, mixHex(accent, soft, 0.45));
        sky.addColorStop(1, mixHex(soft, paper, 0.25));
        fill(`M0 0 H1000 V${horizon} H0Z`, sky);
        // Striped sunset sun.
        const sunR = 250,
          sunX = 420,
          sunY = horizon - 190;
        const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
        sun.addColorStop(0, mixHex(paper, "#fff1c4", 0.6));
        sun.addColorStop(1, mixHex(accent, "#ffb38a", 0.45));
        fill(circle(sunX, sunY, sunR), sun);
        for (let i = 0; i < 7; i++) {
          const y = sunY + 30 + i * (22 + i * 3);
          fill(
            `M${sunX - sunR - 4} ${y} H${sunX + sunR + 4} V${y + 4 + i * 3.2} H${sunX - sunR - 4}Z`,
            sky,
          );
        }
        // Skyline with a few lit windows.
        const rnd = seeded(31);
        const city = mixHex(ink, accent, 0.25);
        let x = -10;
        while (x < 1010) {
          const w = 40 + rnd() * 70,
            h = 50 + rnd() * 190 * (x > 250 && x < 650 ? 0.6 : 1);
          fill(`M${x} ${horizon - h} H${x + w} V${horizon + 2} H${x}Z`, city);
          for (let wy = horizon - h + 14; wy < horizon - 12; wy += 22)
            for (let wx = x + 9; wx < x + w - 12; wx += 16)
              if (rnd() < 0.28)
                fill(
                  `M${wx} ${wy} h7 v9 h-7Z`,
                  mixHex(paper, "#ffe9a8", 0.5),
                  0.75,
                );
          x += w + 4;
        }
        // Sea with the sun's broken reflection.
        const sea = ctx.createLinearGradient(0, horizon, 0, H);
        sea.addColorStop(0, mixHex(accent, ink, 0.35));
        sea.addColorStop(1, ink);
        fill(`M0 ${horizon} H1000 V${H} H0Z`, sea);
        for (let i = 0; i < 12; i++) {
          const y = horizon + 18 + i * 22,
            w = (220 - i * 14) * (0.7 + rnd() * 0.5);
          fill(
            `M${sunX - w / 2} ${y} H${sunX + w / 2} V${y + 5} H${sunX - w / 2}Z`,
            mixHex(paper, "#ffd9a0", 0.5),
            0.75 - i * 0.05,
          );
        }
        for (let i = 0; i < 9; i++)
          fill(
            `M0 ${horizon + 30 + i * 34} H1000 V${horizon + 31.5 + i * 34} H0Z`,
            soft,
            0.18,
          );
        // Palm silhouette.
        fill(
          "M770 1000 C790 760 830 520 872 300 L888 302 C852 540 826 770 826 1000Z",
          ink,
        );
        for (let i = 0; i < 9; i++) {
          const dx = (i - 4) * 90,
            dy = 50 + Math.abs(i - 4) * 24;
          fill(
            `M880 300 Q${880 + dx * 0.45} ${190 - Math.abs(dx) * 0.12} ${880 + dx} ${300 + dy} Q${880 + dx * 0.5} ${268 + dy * 0.25} 880 300Z`,
            ink,
          );
        }
        fill(`M0 ${H * 0.9} L1000 ${H * 0.82} V${H} H0Z`, ink);
        fill(
          `M0 ${H * 0.9 - 6} L1000 ${H * 0.82 - 6} V${H * 0.82 - 3} L0 ${H * 0.9 - 3}Z`,
          soft,
          0.6,
        );
        grain(0.06, 19);
        return true;
      }
      default:
        return false;
    }
  } finally {
    ctx.restore();
  }
}
