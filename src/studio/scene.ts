import type { ScheduleItem } from "../types/event";
import { eventDay } from "../domain/date";
import type { EventRecord } from "../domain/workspace";
import type { CreativeDocument } from "./document";
import { defaultPlacement } from "./document";
import { paletteById, sizes, templateById } from "./registry";
import type { Palette, ModernTemplateId } from "./registry";
export type Rect = { x: number; y: number; w: number; h: number };
export type TextNode = Rect & {
  kind: "text";
  id: string;
  text: string;
  size: number;
  minSize: number;
  color: string;
  weight?: number;
  align?: "left" | "center" | "right";
  family?: string;
  lineHeight?: number;
  required?: boolean;
  vertical?: boolean;
  shadow?: "glow" | "registration";
  italic?: boolean;
};
export type ShapeNode = Rect & {
  kind: "rect" | "ellipse";
  color: string;
  stroke?: string;
  lineWidth?: number;
  radius?: number;
};
export type SceneNode =
  | TextNode
  | ShapeNode
  | (Rect & { kind: "image"; id: string; assetId: string })
  | (Rect & {
      kind: "art";
      art: ModernTemplateId;
      color: string;
      soft: string;
      ink: string;
    });
export type Scene = {
  width: number;
  height: number;
  background: string;
  nodes: SceneNode[];
  errors: string[];
  palette: Palette;
  document: CreativeDocument;
  signature: string;
};
type Slots = {
  hero: number[];
  facts: number[];
  program: number[];
  info: number[];
  art?: number[];
  align?: "left" | "center";
  panel?: "line" | "fill" | "round" | "none";
};
// Independent compositions; coordinates are within each size's safe content area.
export const compositions: Record<ModernTemplateId, Slots> = {
  livehouse: {
    hero: [0, 0, 0.68, 0.23],
    facts: [0.72, 0, 0.28, 0.26],
    program: [0, 0.35, 0.54, 0.65],
    info: [0.59, 0.31, 0.41, 0.69],
    art: [0, 0.26, 0.64, 0.05],
    panel: "fill",
  },
  citypop: {
    hero: [0, 0, 0.59, 0.25],
    facts: [0, 0.27, 1, 0.08],
    program: [0, 0.39, 0.52, 0.61],
    info: [0.58, 0.39, 0.42, 0.61],
    art: [0.65, 0, 0.35, 0.24],
    panel: "line",
  },
  neon: {
    hero: [0.1, 0.01, 0.8, 0.23],
    facts: [0.06, 0.27, 0.88, 0.09],
    program: [0, 0.4, 0.51, 0.6],
    info: [0.57, 0.4, 0.43, 0.6],
    align: "center",
    panel: "line",
  },
  riso: {
    hero: [0.34, 0.1, 0.66, 0.2],
    facts: [0, 0, 1, 0.085],
    program: [0.47, 0.35, 0.53, 0.65],
    info: [0, 0.35, 0.41, 0.65],
    art: [0, 0.1, 0.28, 0.19],
    panel: "none",
  },
  acoustic: {
    hero: [0, 0, 0.66, 0.23],
    facts: [0, 0.26, 1, 0.09],
    program: [0, 0.39, 0.56, 0.61],
    info: [0.62, 0.39, 0.38, 0.61],
    art: [0.73, 0, 0.27, 0.22],
    panel: "fill",
  },
  indie: {
    hero: [0.05, 0.02, 0.54, 0.25],
    facts: [0.66, 0.12, 0.34, 0.19],
    program: [0.02, 0.4, 0.5, 0.6],
    info: [0.59, 0.35, 0.41, 0.65],
    art: [0.65, 0, 0.35, 0.08],
    panel: "fill",
  },
  festival: {
    hero: [0, 0, 1, 0.2],
    facts: [0, 0.24, 1, 0.09],
    program: [0, 0.39, 1, 0.26],
    info: [0, 0.7, 1, 0.3],
    panel: "fill",
  },
  botanical: {
    hero: [0.13, 0.01, 0.74, 0.23],
    facts: [0.1, 0.27, 0.8, 0.09],
    program: [0, 0.4, 0.48, 0.6],
    info: [0.54, 0.4, 0.46, 0.6],
    align: "center",
    panel: "line",
  },
  forest: {
    hero: [0.32, 0.01, 0.68, 0.23],
    facts: [0, 0.28, 1, 0.09],
    program: [0.46, 0.41, 0.54, 0.59],
    info: [0, 0.41, 0.4, 0.59],
    art: [0, 0, 0.26, 0.23],
    panel: "line",
  },
  watercolor: {
    hero: [0.09, 0.02, 0.82, 0.23],
    facts: [0.04, 0.28, 0.92, 0.09],
    program: [0, 0.42, 0.52, 0.58],
    info: [0.58, 0.42, 0.42, 0.58],
    align: "center",
    panel: "round",
  },
  swiss: {
    hero: [0.35, 0, 0.65, 0.29],
    facts: [0, 0, 0.29, 0.29],
    program: [0, 0.36, 1, 0.27],
    info: [0, 0.69, 1, 0.31],
    panel: "line",
  },
  gallery: {
    hero: [0, 0.06, 0.62, 0.26],
    facts: [0.68, 0.17, 0.32, 0.15],
    program: [0, 0.4, 0.5, 0.6],
    info: [0.56, 0.4, 0.44, 0.6],
    art: [0.72, 0, 0.28, 0.13],
    panel: "none",
  },
  magazine: {
    hero: [0, 0, 1, 0.18],
    facts: [0, 0.59, 1, 0.07],
    program: [0.48, 0.23, 0.52, 0.31],
    info: [0, 0.71, 1, 0.29],
    art: [0, 0.23, 0.41, 0.31],
    panel: "line",
  },
  showa: {
    hero: [0, 0.04, 0.68, 0.24],
    facts: [0.73, 0.04, 0.27, 0.28],
    program: [0, 0.38, 0.5, 0.62],
    info: [0.56, 0.38, 0.44, 0.62],
    panel: "line",
  },
  washi: {
    hero: [0.66, 0, 0.34, 0.33],
    facts: [0, 0, 0.58, 0.14],
    program: [0, 0.2, 0.58, 0.43],
    info: [0, 0.69, 1, 0.31],
    panel: "none",
  },
  sticker: {
    hero: [0, 0, 0.64, 0.25],
    facts: [0.7, 0.04, 0.3, 0.27],
    program: [0.01, 0.41, 0.51, 0.59],
    info: [0.58, 0.38, 0.42, 0.62],
    art: [0, 0.28, 0.6, 0.06],
    panel: "fill",
  },
  party: {
    hero: [0.06, 0.04, 0.88, 0.22],
    facts: [0, 0.29, 1, 0.09],
    program: [0.03, 0.43, 0.49, 0.57],
    info: [0.58, 0.43, 0.42, 0.57],
    align: "center",
    panel: "round",
  },
  deco: {
    hero: [0.1, 0.035, 0.8, 0.22],
    facts: [0.06, 0.28, 0.88, 0.09],
    program: [0, 0.42, 0.52, 0.58],
    info: [0.58, 0.42, 0.42, 0.58],
    align: "center",
    panel: "line",
  },
  serif: {
    hero: [0, 0.03, 0.65, 0.25],
    facts: [0.72, 0.05, 0.28, 0.23],
    program: [0, 0.4, 0.54, 0.6],
    info: [0.6, 0.36, 0.4, 0.64],
    panel: "none",
  },
  information: {
    hero: [0, 0, 1, 0.18],
    facts: [0, 0.22, 1, 0.1],
    program: [0, 0.37, 1, 0.26],
    info: [0, 0.68, 1, 0.32],
    panel: "line",
  },
};
export function responsiveRecipe(
  id: ModernTemplateId,
  sizeId: keyof typeof sizes,
): Slots {
  const slots = structuredClone(compositions[id]);
  if (sizeId === "story") {
    // Story: reserve space for platform chrome, reflow the program and details into stacked wide ledgers.
    slots.hero[1] = 0;
    slots.hero[3] = 0.23;
    slots.facts = [0, 0.27, 1, 0.08];
    slots.program = [0, 0.38, 1, 0.27];
    slots.info = [0, 0.69, 1, 0.31];
    if (id === "magazine") {
      slots.hero[2] = 0.68;
      slots.art = [0.74, 0, 0.26, 0.23];
    }
  } else if (sizeId === "square") {
    if (id === "magazine") {
      slots.program[3] = 0.375;
      slots.art = [0, 0.23, 0.41, 0.375];
      slots.facts = [0, 0.63, 1, 0.065];
    }
    // Square: give the denser details column extra width; preserve the composition's left/right order.
    if (slots.info[2] < 0.9 && slots.info[0] > 0) {
      slots.info[0] -= 0.035;
      slots.info[2] += 0.035;
      slots.program[2] -= 0.035;
    } else if (slots.info[2] < 0.9) {
      slots.info[2] += 0.035;
      slots.program[0] += 0.035;
      slots.program[2] -= 0.035;
    }
  } else if (sizeId === "portrait") {
    slots.hero[3] += 0.01;
  }
  return slots;
}
const displayUrl = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");
export function composeScene(
  doc: CreativeDocument,
  events: EventRecord[],
): Scene {
  const size = sizes[doc.design.sizeId];
  const palette = paletteById(doc.design.paletteId);
  const nodes: SceneNode[] = [];
  const errors: string[] = [];
  const base = {
    width: 1000,
    height: size.baseHeight,
    background: palette.paper,
    nodes,
    errors,
    palette,
    document: doc,
    signature: templateById(doc.design.templateId).compositionSignature,
  };
  if (doc.kind === "image-treatment" || doc.design.templateId === "legacy")
    return base;
  const templateId = doc.design.templateId;
  let scheduleForTable: ScheduleItem[] | undefined;
  let title = "",
    subtitle = "",
    facts = "",
    kicker = "",
    program = "",
    info = "";
  if (doc.kind === "event-flyer") {
    const bound = events.find((e) => e.id === doc.eventId);
    if (doc.contentBinding === "linked" && !bound)
      errors.push(
        "参照するイベントが見つかりません。固定コピーに切り替えるかイベントを選んでください。",
      );
    const event =
      doc.contentBinding === "linked" && bound ? bound.eventData : doc.snapshot;
    title = doc.content.titleOverride ?? event.title;
    subtitle =
      doc.content.subtitleOverride ??
      `${event.subtitle} ${event.volume}`.trim();
    kicker = event.venueSubtitle;
    facts = `${event.date} (${eventDay(event)})\nSTART ${event.startTime}   /   ${event.price}`;
    if (
      !title.trim() ||
      !event.date.trim() ||
      !event.startTime.trim() ||
      !event.price.trim() ||
      !event.venue.name.trim()
    )
      errors.push(
        "イベント名・開催日・開始時間・料金・会場名を入力してください。",
      );
    program = doc.design.visibility.schedule
      ? [
          "TIME SCHEDULE",
          ...event.schedule.map((item) =>
            item.type === "act" ? `${item.time}   ${item.name}` : item.label,
          ),
        ].join("\n")
      : "";
    if (
      doc.design.visibility.schedule &&
      !doc.design.visibility.performers &&
      !doc.content.blocks.some((block) => block.visible)
    )
      scheduleForTable = event.schedule;
    if (doc.design.visibility.performers && event.performers.length)
      program += `\n\nARTISTS\n${event.performers.map((p) => [p.name, p.catchcopy, p.bio].filter(Boolean).join("\n")).join("\n\n")}`;
    info = [
      "VENUE",
      event.venue.name,
      event.venue.address,
      displayUrl(event.venue.url),
      event.organizer,
      doc.design.visibility.notes ? event.statusNote : "",
      doc.design.visibility.openMic
        ? [
            "\n" + event.openMic.title,
            event.openMic.time,
            event.openMic.lastOrder,
            event.openMic.headline,
            event.openMic.note,
            event.openMic.closeNote,
          ]
            .filter(Boolean)
            .join("\n")
        : "",
      doc.design.visibility.socials
        ? event.socials.map((s) => s.label).join("  /  ")
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    title = doc.content.title;
    subtitle = doc.content.subtitle;
    facts = doc.content.facts;
  }
  const blocks = doc.content.blocks.filter((b) => b.visible);
  const mainBlocks = blocks.filter((b) => b.type !== "details");
  const detailBlocks = blocks.filter((b) => b.type === "details");
  program = [program, ...mainBlocks.map((b) => b.text)]
    .filter(Boolean)
    .join("\n\n");
  info = [info, ...detailBlocks.map((b) => b.text)]
    .filter(Boolean)
    .join("\n\n");
  if (!title.trim()) errors.push("チラシのタイトルを入力してください。");
  const slots = responsiveRecipe(templateId, doc.design.sizeId);
  if (
    doc.kind === "free-flyer" &&
    templateId === "gallery" &&
    doc.design.sizeId !== "story"
  ) {
    slots.hero = [0, 0, 0.64, 0.24];
    slots.facts = [0, 0.27, 1, 0.08];
    slots.art = [0, 0.4, 0.53, 0.6];
    slots.program = [0.6, 0.4, 0.4, 0.3];
    slots.info = [0.6, 0.75, 0.4, 0.25];
  }
  const safeX = size.safe,
    safeY = doc.design.sizeId === "story" ? 120 : size.safe;
  const usableH =
    size.baseHeight - safeY - (doc.design.sizeId === "story" ? 150 : size.safe);
  const box = (slot: number[]): Rect => ({
    x: safeX + slot[0] * (1000 - safeX * 2),
    y: safeY + slot[1] * usableH,
    w: slot[2] * (1000 - safeX * 2),
    h: slot[3] * usableH,
  });
  if (doc.design.decorations)
    nodes.push({
      kind: "art",
      art: templateId,
      x: 0,
      y: 0,
      w: 1000,
      h: size.baseHeight,
      color: palette.accent,
      soft: palette.soft,
      ink: palette.ink,
    });
  const shape = (b: Rect, fill: string, stroke?: string, radius = 0) =>
    nodes.push({
      ...b,
      kind: "rect",
      color: fill,
      stroke,
      lineWidth: 1.5,
      radius,
    });
  if (slots.art) {
    const art = box(slots.art);
    if (doc.assetRefs[0])
      nodes.push({
        kind: "image",
        id: "main-image",
        assetId: doc.assetRefs[0],
        ...art,
      });
    else if (doc.design.decorations)
      nodes.push({
        kind: "art",
        art: templateId,
        color: palette.accent,
        soft: palette.soft,
        ink: palette.ink,
        ...art,
      });
  } else if (doc.assetRefs[0]) {
    // Background photograph stays beneath opaque content cards so key text retains contrast.
    nodes.push({
      kind: "image",
      id: "main-image",
      assetId: doc.assetRefs[0],
      x: safeX,
      y: safeY,
      w: 1000 - safeX * 2,
      h: usableH * 0.32,
    });
  }
  const p = doc.design.placements[doc.design.sizeId] ?? defaultPlacement;
  const hero = box(slots.hero);
  hero.x += p.titleX;
  hero.y += p.titleY;
  const reversedHero = templateId === "livehouse";
  shape(hero, reversedHero ? palette.ink : palette.paper);
  const titleColor = reversedHero ? palette.paper : palette.ink;
  const subtitleColor = reversedHero ? palette.paper : palette.accent;
  const family =
    doc.design.fontSet === "serif" ||
    (doc.design.fontSet === "auto" &&
      ["washi", "deco", "serif", "citypop", "forest"].includes(
        doc.design.templateId,
      ))
      ? '"Noto Serif JP", "Yu Mincho", serif'
      : doc.design.fontSet === "rounded"
        ? '"Zen Maru Gothic", "Noto Sans JP", sans-serif'
        : '"Noto Sans JP", sans-serif';
  const text = (
    id: string,
    value: string,
    b: Rect,
    fontSize = 22,
    minSize = 18,
    align: TextNode["align"] = "left",
    color = palette.ink,
    weight = 400,
    font = '"Noto Sans JP", sans-serif',
  ) => {
    if (value)
      nodes.push({
        ...b,
        kind: "text",
        id,
        text: value,
        size: fontSize,
        minSize,
        color,
        weight,
        align,
        family: font,
        lineHeight: 1.42,
      });
  };
  const headerPad = doc.design.templateId === "information" ? 0 : 4;
  if (kicker)
    text(
      "kicker",
      kicker,
      {
        x: hero.x + headerPad,
        y: hero.y,
        w: hero.w - 2 * headerPad,
        h: hero.h * 0.2,
      },
      19,
      16,
      slots.align,
      reversedHero ? palette.paper : palette.ink,
    );
  const titleY = hero.y + (kicker ? hero.h * 0.23 : 0);
  text(
    "title",
    title,
    {
      x: hero.x + headerPad,
      y: titleY,
      w: hero.w - 2 * headerPad,
      h: hero.h * (kicker ? 0.49 : 0.66),
    },
    doc.design.sizeId === "square" ? 92 : 122,
    28,
    slots.align,
    titleColor,
    700,
    family,
  );
  const titleNode = nodes[nodes.length - 1];
  if (titleNode?.kind === "text") {
    titleNode.lineHeight = 1.12;
    titleNode.shadow =
      templateId === "neon"
        ? "glow"
        : templateId === "riso"
          ? "registration"
          : undefined;
    titleNode.italic = templateId === "indie";
  }
  if (
    doc.design.templateId === "washi" &&
    nodes[nodes.length - 1]?.kind === "text" &&
    /^[^A-Za-z0-9]{1,8}$/.test(title)
  ) {
    const n = nodes[nodes.length - 1] as TextNode;
    n.vertical = true;
    n.size = 60;
    n.lineHeight = 1.15;
  }
  text(
    "subtitle",
    subtitle,
    {
      x: hero.x + headerPad,
      y: hero.y + hero.h * 0.76,
      w: hero.w - 2 * headerPad,
      h: hero.h * 0.24,
    },
    29,
    18,
    slots.align,
    subtitleColor,
    700,
    family,
  );
  const factsBox = box(slots.facts);
  const factsFilled = [
    "livehouse",
    "indie",
    "festival",
    "showa",
    "sticker",
    "information",
  ].includes(doc.design.templateId);
  if (facts) {
    const roundSeal = templateId === "sticker";
    if (roundSeal)
      nodes.push({ ...factsBox, kind: "ellipse", color: palette.accent });
    else
      shape(
        factsBox,
        factsFilled ? palette.accent : palette.paper,
        templateId === "gallery" || templateId === "serif"
          ? undefined
          : palette.accent,
        templateId === "showa" ? 16 : 0,
      );
    const factsContent =
      factsBox.w > 600 && factsBox.h < 100
        ? facts.replace(/\n/g, "  /  ")
        : facts;
    if (templateId === "swiss" && doc.design.sizeId !== "story") {
      text(
        "facts",
        factsContent,
        {
          x: factsBox.x + 12,
          y: factsBox.y + 10,
          w: factsBox.w - 24,
          h: factsBox.h * 0.4,
        },
        24,
        18,
        "left",
        palette.ink,
        700,
      );
      const day =
        doc.kind === "event-flyer"
          ? (doc.contentBinding === "linked"
              ? (events.find((e) => e.id === doc.eventId)?.eventData.date ??
                doc.snapshot.date)
              : doc.snapshot.date
            ).match(/(\d{1,2})日?$/)?.[1]
          : undefined;
      if (day) {
        text(
          "day-monument",
          day.padStart(2, "0"),
          {
            x: factsBox.x + 12,
            y: factsBox.y + factsBox.h * 0.47,
            w: factsBox.w - 24,
            h: factsBox.h * 0.51,
          },
          104,
          36,
          "left",
          palette.accent,
          700,
        );
        const n = nodes[nodes.length - 1];
        if (n?.kind === "text") n.lineHeight = 1.05;
      }
    } else {
      text(
        "facts",
        factsContent,
        {
          x: factsBox.x + (roundSeal ? factsBox.w * 0.15 : 14),
          y: factsBox.y + (roundSeal ? factsBox.h * 0.2 : 10),
          w: factsBox.w * (roundSeal ? 0.7 : 1) - (roundSeal ? 0 : 28),
          h: factsBox.h * (roundSeal ? 0.6 : 1) - (roundSeal ? 0 : 20),
        },
        factsBox.w > 600 ? 27 : 32,
        18,
        roundSeal || factsBox.w > 600 ? "center" : "left",
        factsFilled ? palette.onAccent : palette.ink,
        700,
      );
    }
  }
  const panel = (slot: number[], value: string, id: string) => {
    if (!value) return;
    const b = box(slot);
    const fill = slots.panel === "fill" || slots.panel === "round";
    shape(
      b,
      palette.paper,
      slots.panel === "line" || fill ? palette.accent : undefined,
      slots.panel === "round" ? 25 : 0,
    );
    if (fill) shape({ x: b.x, y: b.y, w: b.w, h: 6 }, palette.accent);
    const pad = slots.panel === "none" ? 0 : 16;
    if (id === "program" && scheduleForTable) {
      text(
        "program-heading",
        "TIME SCHEDULE",
        { x: b.x + pad, y: b.y + pad + 5, w: b.w - pad * 2, h: 30 },
        18,
        18,
        "left",
        palette.accent,
        700,
      );
      const columns = b.w > 700 ? 2 : 1;
      const rows = Math.ceil(scheduleForTable.length / columns);
      const gap = columns === 2 ? 30 : 0;
      const colWidth = (b.w - pad * 2 - gap) / columns;
      const rowHeight = Math.min(70, (b.h - pad * 2 - 48) / Math.max(1, rows));
      scheduleForTable.forEach((item, index) => {
        const column = Math.floor(index / Math.max(1, rows));
        const row = index % Math.max(1, rows);
        const x = b.x + pad + column * (colWidth + gap),
          y = b.y + pad + 46 + row * rowHeight;
        if (item.type === "act") {
          const timeWidth = colWidth * 0.39;
          text(
            `time-${index}`,
            item.time,
            { x, y: y + 3, w: timeWidth - 8, h: rowHeight - 5 },
            19,
            18,
            "left",
            palette.accent,
            700,
          );
          text(
            `act-${index}`,
            item.name,
            {
              x: x + timeWidth,
              y: y + 2,
              w: colWidth - timeWidth,
              h: rowHeight - 4,
            },
            27,
            18,
            "left",
            palette.ink,
            700,
          );
          const actNode = nodes[nodes.length - 1];
          if (actNode.kind === "text") actNode.lineHeight = 1.2;
          const timeNode = nodes[nodes.length - 2];
          if (timeNode.kind === "text") timeNode.lineHeight = 1.2;
          shape({ x, y: y + rowHeight - 1, w: colWidth, h: 0.8 }, palette.soft);
        } else {
          if (item.type === "break")
            shape(
              { x, y: y + 2, w: colWidth, h: rowHeight - 4 },
              palette.soft,
              undefined,
              9,
            );
          text(
            `schedule-${index}`,
            item.label,
            { x: x + 4, y: y + 3, w: colWidth - 8, h: rowHeight - 5 },
            20,
            18,
            "center",
            palette.ink,
            item.type === "break" ? 700 : 400,
          );
        }
        const last = nodes[nodes.length - 1];
        if (last?.kind === "text") last.lineHeight = 1.2;
        const previous = nodes[nodes.length - 3];
        if (item.type === "act" && previous?.kind === "text")
          previous.lineHeight = 1.2;
      });
      return;
    }
    const columns = b.w > 700 ? 2 : 1;
    const lines = value.split("\n");
    const split = Math.ceil(lines.length / 2);
    const values =
      columns === 2
        ? [lines.slice(0, split).join("\n"), lines.slice(split).join("\n")]
        : [value];
    values.forEach((part, column) => {
      const gap = columns === 2 ? 28 : 0;
      const width = (b.w - pad * 2 - gap) / columns;
      text(
        columns === 2 ? `${id}-${column + 1}` : id,
        part,
        {
          x: b.x + pad + column * (width + gap),
          y: b.y + pad + (fill ? 4 : 0),
          w: width,
          h: b.h - pad * 2 - (fill ? 4 : 0),
        },
        id === "program" ? (columns === 2 ? 27 : 25) : 22,
        18,
        "left",
        palette.ink,
        id === "program" ? 700 : 400,
      );
      const node = nodes[nodes.length - 1];
      if (node?.kind === "text" && id === "program") node.lineHeight = 1.7;
    });
  };
  panel(slots.program, program, "program");
  panel(slots.info, info, "details");
  return base;
}
