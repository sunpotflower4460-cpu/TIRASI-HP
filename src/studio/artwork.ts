import type { ModernTemplateId } from "./registry";
import type { Rect } from "./scene";

export type ArtworkNode = Rect & {
  kind: "art";
  art: ModernTemplateId;
  role: "ambient" | "hero";
  color: string;
  soft: string;
  ink: string;
  paper: string;
};

export function mix(a: string, b: string, amount: number): string {
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

// Original vector artwork. Every curve is rendered by the same Canvas adapter for
// the gallery, full preview, PNG and print. There are no remote stock assets.
export function drawArtwork(ctx: CanvasRenderingContext2D, node: ArtworkNode) {
  const { x, y, w, h, color: accent, soft, ink, paper } = node;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const intrinsicAspect: Partial<Record<ModernTemplateId, number>> = {
    acoustic: 0.62,
    botanical: 0.6,
    watercolor: 0.7,
    neon: 0.48,
    gallery: 0.8,
    magazine: 0.74,
    washi: 1.08,
    serif: 0.62,
    sticker: 1,
    showa: 1,
    party: 0.65,
    indie: 1,
  };
  const aspect = node.role === "hero" ? intrinsicAspect[node.art] : undefined;
  const sx = aspect ? Math.min(w / 1000, (h * aspect) / 1000) : w / 1000;
  const sy = aspect ? sx / aspect : h / 1000;
  ctx.translate(x + (w - sx * 1000) / 2, y + (h - sy * 1000) / 2);
  ctx.scale(sx, sy);
  const line = (path: string, color = ink, width = 2, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(path));
    ctx.globalAlpha = 1;
  };
  const path = (d: string, color: string, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(new Path2D(d));
    ctx.globalAlpha = 1;
  };
  const rect = (
    color: string,
    px: number,
    py: number,
    pw: number,
    ph: number,
    r = 0,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, r);
    ctx.fill();
  };
  const disc = (
    color: string,
    cx: number,
    cy: number,
    radius: number,
    alpha = 1,
  ) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, (radius * sx) / sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  const gradient = (
    a: string,
    b: string,
    x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 1000,
  ) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    return g;
  };
  const dots = (
    px: number,
    py: number,
    pw: number,
    ph: number,
    color: string,
    step = 25,
    alpha = 0.25,
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let row = 0; row < ph / step; row++)
      for (let col = 0; col < pw / step; col++) {
        ctx.beginPath();
        ctx.arc(
          px + col * step + ((row % 2) * step) / 2,
          py + row * step,
          step * 0.13,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    ctx.restore();
  };
  const grain = (alpha = 0.09) => {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 1050; i++) {
      const px = (i * 7919 + 73) % 997,
        py = (i * 1543 + 193) % 991;
      ctx.fillRect(px, py, 0.6 + (i % 3), 0.6 + (i % 2));
    }
    ctx.restore();
  };
  const flower = (
    cx: number,
    cy: number,
    radius: number,
    petals: number,
    color: string,
    alpha = 1,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < petals; i++) {
      ctx.rotate((Math.PI * 2) / petals);
      ctx.beginPath();
      ctx.ellipse(
        radius * 0.56,
        0,
        radius * 0.56,
        radius * 0.29,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  };
  const leaf = (
    px: number,
    py: number,
    scale: number,
    rotation: number,
    fill: string | undefined,
    stroke = accent,
  ) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    const d = "M0 0 C-85 -52 -90 -156 0 -220 C90 -156 85 -52 0 0Z";
    if (fill) path(d, fill);
    line(d, stroke, 2.5);
    line("M0 0 Q-12 -110 0 -213", stroke, 2);
    for (let i = 1; i < 6; i++) {
      const v = -i * 30;
      line(
        `M-3 ${v} L${-52 + i * 3} ${v - 38} M-3 ${v} L${48 - i * 2} ${v - 40}`,
        stroke,
        0.9,
        0.65,
      );
    }
    ctx.restore();
  };

  if (node.role === "ambient") {
    switch (node.art) {
      case "livehouse":
        rect(ink, 14, 12, 972, 9);
        rect(ink, 14, 12, 8, 968);
        for (let i = 0; i < 18; i++)
          rect(i % 3 ? ink : soft, 16 + i * 54, 984, 32, 6);
        break;
      case "citypop":
        rect(soft, 0, 0, 1000, 10);
        rect(accent, 0, 993, 1000, 7);
        break;
      case "neon":
        for (const px of [14, 986]) {
          line(`M${px} 25 V975`, accent, 2, 0.6);
          line(`M${px + (px < 500 ? 7 : -7)} 30 V970`, soft, 5, 0.8);
        }
        line("M60 70 Q500 -45 940 70", accent, 1.4, 0.8);
        break;
      case "deco":
        for (const right of [false, true]) {
          ctx.save();
          if (right) {
            ctx.translate(1000, 0);
            ctx.scale(-1, 1);
          }
          for (let i = 0; i < 8; i++)
            line(
              `M20 ${220 - i * 17} Q${30 + i * 15} 38 ${160 + i * 25} 20`,
              accent,
              i === 0 ? 3 : 1,
              0.8,
            );
          line("M20 270 V995 H270 M33 280 V982 H280", accent, 1.1, 0.8);
          for (let i = 0; i < 5; i++)
            line(
              `M${24 + i * 15} 995 Q${55 + i * 18} ${982 - i * 2} ${145 + i * 32} 995`,
              accent,
              1,
              0.75,
            );
          ctx.restore();
        }
        line("M418 35 L500 77 L582 35 M448 35 L500 60 L552 35", accent, 1.5);
        break;
      case "washi":
      case "forest":
      case "acoustic":
      case "riso":
        grain(0.035);
        if (node.art === "washi")
          for (let i = 0; i < 30; i++)
            line(
              `M${i * 37} 0 Q${i * 37 + 7} 500 ${i * 37 - 3} 1000`,
              soft,
              0.5,
              0.35,
            );
        break;
      case "swiss":
        rect(accent, 34, 20, 110, 9);
        rect(ink, 34, 980, 932, 2);
        break;
      case "gallery":
        line("M34 20 H100 M34 20 V40 M900 980 H966 M966 960 V980", ink, 1.5);
        break;
      case "magazine":
        rect(ink, 32, 20, 936, 3);
        rect(ink, 32, 980, 936, 2);
        break;
      case "showa":
        line("M20 20 H980 V980 H20 Z", accent, 2);
        break;
      case "indie":
        rect(accent, 0, 0, 14, 350);
        rect(accent, 975, 900, 25, 100);
        break;
      case "party":
        line("M30 16 Q90 29 150 16 M850 980 Q910 965 970 980", accent, 2.5);
        break;
      case "serif":
        line("M45 24 H955 M45 978 H955", accent, 1);
        disc(accent, 500, 978, 3);
        break;
      case "information":
        rect(accent, 0, 0, 1000, 8);
        rect(soft, 0, 990, 1000, 10);
        break;
      default:
        break;
    }
    ctx.restore();
    return;
  }

  switch (node.art) {
    case "livehouse": {
      // A cut strip of printed sound, rather than a generic decorative barcode.
      rect(ink, 0, 0, 1000, 1000);
      for (let i = 0; i < 125; i++) {
        const peak =
          60 + Math.pow(Math.sin(i * 0.19), 2) * 600 + Math.sin(i * 0.77) * 80;
        rect(paper, i * 8 + 2, 500 - peak / 2, 3.5, peak);
      }
      for (let i = 0; i < 21; i++) rect(paper, i * 49, i % 2 ? 940 : 0, 30, 45);
      break;
    }
    case "citypop": {
      ctx.fillStyle = gradient(mix(ink, accent, 0.6), mix(soft, paper, 0.15));
      ctx.fillRect(0, 0, 1000, 1000);
      disc(mix(paper, "#ffe0a8", 0.55), 420, 350, 240);
      rect(mix(accent, ink, 0.32), 0, 590, 1000, 410);
      for (let i = 0; i < 14; i++)
        line(
          `M0 ${616 + i * 26} Q350 ${595 + i * 26} 1000 ${620 + i * 26}`,
          mix(soft, paper, 0.2),
          i < 3 ? 2 : 3,
          0.7 - i * 0.025,
        );
      path("M0 935 L1000 725 L1000 1000 L0 1000Z", ink);
      line("M0 910 L1000 700 M0 902 L1000 692", soft, 3);
      for (let i = 0; i < 12; i++)
        line(`M${i * 100} ${904 - i * 21} L${i * 100} ${964 - i * 21}`, ink, 9);
      // A curved trunk and individually shaped palm fronds.
      path(
        "M750 900 C770 670 815 430 860 210 L873 212 C836 460 805 700 803 900Z",
        ink,
      );
      for (let i = 0; i < 9; i++) {
        const dx = (i - 4) * 83,
          dy = 55 + Math.abs(i - 4) * 20;
        path(
          `M864 214 Q${864 + dx * 0.4} ${100 - Math.abs(dx) * 0.1} ${864 + dx} ${214 + dy} Q${864 + dx * 0.45} ${185 + dy * 0.25} 864 214Z`,
          ink,
        );
      }
      for (let i = 0; i < 11; i++)
        rect(mix(ink, accent, 0.2), i * 75 - 10, 570 - (i % 4) * 26, 52, 100);
      grain(0.07);
      break;
    }
    case "neon": {
      const glow = ctx.createRadialGradient(430, 400, 0, 430, 400, 700);
      glow.addColorStop(0, mix(accent, paper, 0.4));
      glow.addColorStop(1, paper);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1000, 1000);
      path(
        "M180 0 L350 0 L1000 1000 L760 1000Z",
        mix(accent, paper, 0.65),
        0.5,
      );
      for (let i = 0; i < 7; i++)
        line(
          `M${-80 + i * 60} 950 Q${780 + i * 20} 760 ${300 + i * 65} 50`,
          i % 2 ? accent : mix("#73edf2", paper, 0.12),
          3,
          0.65,
        );
      ctx.save();
      ctx.translate(470, 420);
      ctx.rotate(0.12);
      rect(ink, -90, -260, 180, 330, 88);
      rect(paper, -65, -230, 130, 240, 60);
      for (let i = 0; i < 9; i++) line(`M-58 ${-200 + i * 24} H58`, ink, 7);
      line(
        "M-120 -60 V10 Q-120 145 0 145 Q120 145 120 10 V-60 M0 145 V510 M-145 510 H145",
        ink,
        12,
      );
      line("M-116 -58 V8 Q-116 140 0 140", accent, 3);
      ctx.restore();
      break;
    }
    case "riso": {
      rect(soft, 35, 40, 925, 925);
      disc(accent, 430, 315, 390, 0.88);
      disc(ink, 600, 610, 355, 0.88);
      ctx.save();
      ctx.beginPath();
      ctx.rect(80, 80, 820, 820);
      ctx.clip();
      dots(0, 0, 1000, 1000, paper, 22, 0.45);
      ctx.restore();
      line("M50 890 L925 65 M75 910 L950 85", paper, 9);
      for (let i = 0; i < 6; i++)
        rect(i % 2 ? paper : accent, 55 + i * 140, 925, 100, 12);
      grain(0.3);
      break;
    }
    case "acoustic": {
      disc(soft, 495, 585, 445, 0.6);
      ctx.save();
      ctx.translate(490, 520);
      ctx.rotate(0.22);
      path(
        "M-90 -200 C-360 -210 -320 -65 -230 20 C-470 200 -310 480 0 460 C310 480 470 200 230 20 C320 -65 360 -210 90 -200Z",
        mix(accent, soft, 0.7),
      );
      line(
        "M-90 -200 C-360 -210 -320 -65 -230 20 C-470 200 -310 480 0 460 C310 480 470 200 230 20 C320 -65 360 -210 90 -200",
        ink,
        4,
      );
      disc(ink, 0, 110, 114);
      disc(soft, 0, 110, 97);
      disc(ink, 0, 110, 85);
      rect(ink, -36, -475, 72, 580, 9);
      rect(accent, -48, -480, 96, 132, 16);
      rect(ink, -100, 300, 200, 35, 8);
      for (let i = 0; i < 6; i++)
        line(`M${-22 + i * 9} -425 V310`, paper, 1.3, 0.9);
      for (let i = 0; i < 12; i++) line(`M-35 ${-335 + i * 29} H35`, soft, 1.5);
      for (let i = 0; i < 3; i++) {
        disc(ink, -57, -450 + i * 35, 9);
        disc(ink, 57, -450 + i * 35, 9);
      }
      for (let i = 0; i < 10; i++)
        line(
          `M${-190 - i * 6} 140 Q${-245 - i * 5} 310 ${-85 - i * 9} 400`,
          ink,
          1,
          0.12,
        );
      ctx.restore();
      grain(0.07);
      break;
    }
    case "indie": {
      path("M0 25 L920 0 L1000 760 L100 1000Z", soft);
      ctx.save();
      ctx.translate(510, 435);
      ctx.rotate(-0.13);
      const points = Array.from({ length: 40 }, (_, i) => {
        const a = (i * Math.PI) / 20,
          r = i % 2 ? 235 : 465;
        return `${Math.cos(a) * r} ${Math.sin(a) * r}`;
      });
      path("M" + points.join(" L") + "Z", accent);
      disc(paper, 0, 0, 155);
      ctx.restore();
      line("M110 805 L870 640 M95 850 L850 680", ink, 30);
      for (let i = 0; i < 6; i++)
        line(`M${650 + i * 34} 60 L${880 + i * 18} 245`, paper, 3);
      grain(0.17);
      break;
    }
    case "festival": {
      disc(mix(soft, "#f0bf58", 0.45), 570, 300, 385);
      path(
        "M0 550 Q250 230 510 510 T1000 480 V1000 H0Z",
        mix(accent, soft, 0.5),
      );
      path("M0 700 Q350 440 670 680 T1100 610 V1000 H0Z", accent);
      path("M0 850 Q320 620 600 850 T1000 790 V1000 H0Z", ink);
      for (let i = 0; i < 9; i++)
        line(
          `M${-100 + i * 130} 1000 Q${120 + i * 80} 830 ${380 + i * 70} 820`,
          paper,
          2,
          0.4,
        );
      break;
    }
    case "botanical": {
      line(
        "M480 990 C360 760 620 435 520 40 M470 850 Q210 660 170 480 M490 700 Q760 550 820 310",
        accent,
        5,
      );
      const leaves = [
        [490, 850, 0.9, -0.8],
        [460, 720, 0.78, 0.65],
        [500, 570, 0.9, -0.7],
        [530, 410, 0.75, 0.58],
        [530, 240, 0.66, -0.48],
        [310, 720, 0.7, -0.8],
        [230, 610, 0.67, -0.55],
        [640, 600, 0.76, 0.7],
        [760, 440, 0.65, 0.58],
      ];
      leaves.forEach(([px, py, s, r], i) =>
        leaf(px, py, s, r, i % 3 === 0 ? mix(soft, paper, 0.25) : undefined),
      );
      for (const [px, py] of [
        [145, 470],
        [510, 45],
        [825, 310],
      ]) {
        flower(px, py, 65, 6, soft, 0.75);
        disc(accent, px, py, 12);
      }
      break;
    }
    case "forest": {
      rect(mix(soft, paper, 0.25), 0, 0, 1000, 1000);
      disc(paper, 700, 260, 210);
      path(
        "M0 560 L260 210 L505 490 L750 340 L1000 620 V1000 H0Z",
        mix(accent, soft, 0.68),
      );
      path(
        "M0 730 L420 340 L650 610 L860 430 L1000 660 V1000 H0Z",
        mix(accent, soft, 0.25),
      );
      path("M0 940 Q500 610 1000 820 V1000 H0Z", accent);
      for (let i = 0; i < 12; i++) {
        const px = i * 97 - 30,
          top = 480 + (i % 4) * 65,
          ht = 460 - (i % 3) * 50;
        line(`M${px} ${top} V${top + ht}`, ink, 5);
        for (let j = 0; j < 7; j++) {
          const yy = top + (j * ht) / 8,
            spread = 22 + j * 12;
          path(
            `M${px} ${yy - 60} L${px - spread} ${yy + 80} L${px + spread} ${yy + 80}Z`,
            ink,
          );
        }
      }
      for (let i = 0; i < 24; i++)
        line(`M${i * 48 - 40} 1000 L${i * 48 + 65} 880`, paper, 1, 0.22);
      grain(0.19);
      break;
    }
    case "watercolor": {
      line(
        "M550 1000 Q200 700 300 280 M500 875 Q810 600 700 565 M520 920 Q420 800 360 745",
        accent,
        3,
        0.65,
      );
      leaf(460, 860, 0.65, -1, mix(soft, paper, 0.3));
      leaf(620, 780, 0.6, 0.65, mix(soft, paper, 0.4));
      const blooms = [
        [300, 285, 225],
        [700, 565, 190],
        [360, 745, 130],
      ];
      blooms.forEach(([cx, cy, radius], bloom) => {
        for (let petal = 0; petal < 6; petal++) {
          for (let layer = 0; layer < 7; layer++) {
            ctx.save();
            ctx.translate(cx + ((layer % 3) - 1) * 4, cy + (layer % 2) * 3);
            ctx.rotate((petal * Math.PI) / 3 + bloom * 0.6 + layer * 0.012);
            ctx.scale(radius / 220, radius / 220);
            path(
              "M0 15 C-155 -30 -150 -180 -45 -215 C65 -265 155 -110 70 -20 Q35 0 0 15Z",
              layer % 3 ? accent : soft,
              0.055,
            );
            ctx.restore();
          }
        }
        for (let i = 0; i < 19; i++) {
          const a = i * 2.4,
            r = 12 + (i % 4) * 7;
          disc(
            i % 3 ? accent : ink,
            cx + Math.cos(a) * r,
            cy + Math.sin(a) * r,
            3.5,
            0.65,
          );
        }
      });
      grain(0.045);
      break;
    }
    case "gallery": {
      ctx.fillStyle = gradient(mix(soft, paper, 0.1), paper);
      ctx.fillRect(0, 0, 1000, 1000);
      ctx.save();
      ctx.fillStyle = mix(ink, paper, 0.94);
      ctx.beginPath();
      ctx.ellipse(535, 895, 390, 65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = gradient(ink, mix(ink, paper, 0.3), 150, 0, 800, 0);
      ctx.fill(
        new Path2D(
          "M190 875 V400 C190 40 810 40 810 400 V875 H650 V410 C650 210 350 210 350 410 V875Z",
        ),
      );
      ctx.fillStyle = gradient(mix(soft, paper, 0.6), soft, 350, 0, 650, 0);
      ctx.fillRect(350, 485, 300, 390);
      disc(accent, 690, 710, 105);
      line("M70 70 H190 M70 70 V190", ink, 1.2, 0.55);
      grain(0.045);
      break;
    }
    case "magazine": {
      ctx.fillStyle = gradient(
        mix(accent, soft, 0.72),
        mix(soft, paper, 0.55),
        0,
        0,
        1000,
        1000,
      );
      ctx.fillRect(0, 0, 1000, 1000);
      path(
        "M180 1000 V280 C180 -70 820 -70 820 280 V1000Z",
        mix(paper, soft, 0.2),
      );
      rect(accent, 0, 800, 1000, 200);
      ctx.fillStyle = gradient(mix(ink, accent, 0.5), ink, 180, 0, 760, 0);
      ctx.fill(
        new Path2D(
          "M390 575 C165 650 240 850 335 855 H665 C760 850 835 650 610 575 L630 470 H370Z",
        ),
      );
      line(
        "M430 510 C255 240 350 90 280 20 M510 505 Q710 320 750 160 M555 500 Q500 250 550 100",
        accent,
        5,
      );
      leaf(390, 360, 0.8, -0.9, soft);
      leaf(620, 360, 0.82, 0.75, soft);
      leaf(530, 255, 0.7, -0.3, soft);
      flower(285, 130, 150, 7, accent, 0.9);
      disc(ink, 285, 130, 30);
      flower(755, 170, 110, 5, mix(accent, soft, 0.4));
      disc(accent, 755, 170, 22);
      grain(0.055);
      break;
    }
    case "showa": {
      disc(soft, 500, 500, 480);
      for (let i = 0; i < 20; i++) {
        const a = (i * Math.PI) / 10,
          b = a + 0.075;
        path(
          `M500 500 L${500 + Math.cos(a) * 650} ${500 + Math.sin(a) * 650} L${500 + Math.cos(b) * 650} ${500 + Math.sin(b) * 650}Z`,
          accent,
          0.85,
        );
      }
      disc(paper, 500, 500, 310);
      disc(accent, 500, 500, 260);
      for (let i = 0; i < 5; i++)
        line(
          `M${210 + i * 16} ${430 + i * 43} Q510 ${590 + i * 23} ${785 - i * 9} ${400 + i * 38}`,
          paper,
          6,
          0.9,
        );
      grain(0.1);
      break;
    }
    case "washi": {
      for (let i = 0; i < 22; i++) {
        ctx.save();
        ctx.translate(495 + ((i % 3) - 1) * 2, 490 + ((i % 5) - 2) * 3);
        ctx.rotate(-0.12);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          315 + i * 2.3,
          360 + i * 1.7,
          0,
          0.17,
          Math.PI * 1.95,
        );
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.13;
        ctx.lineWidth = 10 + (i % 4) * 2;
        ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i < 18; i++)
        line(
          `M${770 + i * 2} ${530 + i * 5} Q${810 + i * 2} 710 ${630 + i * 3} 825`,
          paper,
          0.8,
          0.65,
        );
      rect(accent, 760, 785, 87, 87);
      line("M775 800 V857 H832 V800Z", paper, 3);
      grain(0.08);
      break;
    }
    case "sticker": {
      ctx.save();
      ctx.translate(490, 500);
      ctx.rotate(-0.1);
      path("M-460 -350 L350 -430 L460 320 L-370 410Z", soft);
      flower(5, 5, 440, 12, ink);
      flower(-10, -12, 412, 12, paper);
      flower(-10, -12, 378, 12, accent);
      disc(soft, -10, -12, 150);
      disc(ink, -10, -12, 32);
      ctx.restore();
      path("M40 870 L470 815 L510 945 L75 990Z", accent);
      line("M65 915 L470 865", paper, 3);
      grain(0.045);
      break;
    }
    case "party": {
      const balloons = [
        [275, 280, -0.16, soft],
        [740, 180, 0.16, mix(accent, paper, 0.55)],
        [570, 545, 0.06, mix(accent, soft, 0.25)],
      ] as const;
      for (const [cx, cy, r, c] of balloons) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(r);
        path("M0 -180 C-230 -175 -205 115 0 190 C205 115 230 -175 0 -180Z", c);
        line(
          "M0 -180 C-235 -170 -197 115 0 190 C202 110 235 -175 0 -180Z",
          ink,
          3,
        );
        path("M0 190 L-22 225 L25 225Z", c);
        line("M0 225 C-80 330 80 410 -10 570", ink, 2);
        line("M-80 -95 Q-135 -20 -70 60", paper, 10, 0.75);
        ctx.restore();
      }
      for (const [cx, cy] of [
        [75, 590],
        [900, 750],
        [600, 60],
      ]) {
        line(
          `M${cx - 28} ${cy} H${cx + 28} M${cx} ${cy - 28} V${cy + 28}`,
          accent,
          4,
        );
        disc(accent, cx + 40, cy + 65, 6);
      }
      break;
    }
    case "serif": {
      line(
        "M470 990 C610 800 230 570 490 250 M410 750 Q730 700 820 420 M455 610 Q170 520 160 390",
        accent,
        3,
      );
      leaf(450, 870, 0.85, -0.7, undefined, accent);
      leaf(550, 770, 0.9, 0.8, undefined, accent);
      leaf(390, 650, 0.65, -0.7, undefined, accent);
      leaf(700, 600, 0.7, 0.55, undefined, accent);
      ctx.save();
      ctx.translate(500, 230);
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 4);
        path(
          "M0 25 C-170 -20 -165 -200 0 -240 C165 -200 170 -20 0 25Z",
          mix(soft, paper, 0.65),
        );
        line(
          "M0 25 C-170 -20 -165 -200 0 -240 C165 -200 170 -20 0 25Z",
          accent,
          1.8,
        );
        for (let j = -2; j <= 2; j++)
          line(`M0 5 Q${j * 28} -130 ${j * 10} -205`, accent, 0.75, 0.55);
        ctx.restore();
      }
      disc(accent, 0, 0, 36);
      ctx.restore();
      break;
    }
    case "swiss":
    case "information":
    case "deco":
      // These are typographic compositions. A photo can occupy this optional slot.
      break;
  }
  ctx.restore();
}
