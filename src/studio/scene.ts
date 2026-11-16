import type { ScheduleItem } from "../types/event";
import { dateISO, eventDay } from "../domain/date";
import type { EventRecord } from "../domain/workspace";
import type { CreativeDocument } from "./document";
import { defaultPlacement, eventForDocument } from "./document";
import { paletteById, sizes, templateById } from "./registry";
import type { Palette } from "./registry";
import type { ArtworkNode } from "./artwork";
import { responsiveRecipe } from "./layouts";
export { compositions, responsiveRecipe } from "./layouts";

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
  valign?: "top" | "center";
  maxLines?: number;
  balanced?: boolean;
};
export type FlowBlock = Omit<TextNode, keyof Rect | "kind"> & {
  gapBefore?: number;
};
export type FlowNode = Rect & { kind: "flow"; id: string; blocks: FlowBlock[] };
export type ShapeNode = Rect & {
  kind: "rect" | "ellipse";
  color: string;
  stroke?: string;
  lineWidth?: number;
  radius?: number;
};
export type SceneNode =
  | TextNode
  | FlowNode
  | ShapeNode
  | ArtworkNode
  | (Rect & { kind: "image"; id: string; assetId: string });
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

const sans = '"Noto Sans JP", sans-serif';
const serif = '"Noto Serif JP", serif';
const rounded = '"Zen Maru Gothic", "Noto Sans JP", sans-serif';
const condensed = '"Barlow Condensed", "Noto Sans JP", sans-serif';
const elegant = '"Cormorant Garamond", "Noto Serif JP", serif';
const displayUrl = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function composeScene(
  doc: CreativeDocument,
  events: EventRecord[],
): Scene {
  const size = sizes[doc.design.sizeId],
    palette = paletteById(doc.design.paletteId);
  const nodes: SceneNode[] = [],
    errors: string[] = [];
  const scene: Scene = {
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
    return scene;
  const templateId = doc.design.templateId;
  const recipe = responsiveRecipe(
    templateId,
    doc.design.sizeId,
    !!doc.assetRefs[0],
  );
  const p = doc.design.placements[doc.design.sizeId] ?? defaultPlacement;
  const safeX = size.safe,
    safeY = doc.design.sizeId === "story" ? 120 : size.safe;
  const usableH =
    size.baseHeight - safeY - (doc.design.sizeId === "story" ? 150 : size.safe);
  const box = (slot: number[]): Rect => ({
    x: safeX + slot[0] * (1000 - 2 * safeX),
    y: safeY + slot[1] * usableH,
    w: slot[2] * (1000 - 2 * safeX),
    h: slot[3] * usableH,
  });
  const shape = (b: Rect, color: string, stroke?: string, radius = 0) =>
    nodes.push({ ...b, kind: "rect", color, stroke, lineWidth: 1.3, radius });
  const rule = (b: Rect, color = palette.soft, width = b.w) =>
    shape({ x: b.x, y: b.y, w: width, h: 1.5 }, color);
  const text = (
    id: string,
    value: string,
    b: Rect,
    fontSize = 22,
    minSize = 18,
    color = palette.ink,
    weight = 400,
    family = sans,
    align: TextNode["align"] = "left",
    extra: Partial<TextNode> = {},
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
        family,
        align,
        lineHeight: 1.35,
        ...extra,
      });
  };
  const flowBlock = (
    id: string,
    value: string,
    fontSize = 21,
    weight = 400,
    color = palette.ink,
    gapBefore = 7,
    family = sans,
  ): FlowBlock => ({
    id,
    text: value,
    size: fontSize,
    minSize: fontSize >= 28 ? 24 : 18,
    color,
    weight,
    family,
    lineHeight: 1.4,
    gapBefore,
  });
  const flow = (id: string, b: Rect, blocks: FlowBlock[]) => {
    const visible = blocks.filter((block) => block.text.trim());
    if (visible.length) nodes.push({ ...b, kind: "flow", id, blocks: visible });
  };

  let title = "",
    subtitle = "",
    kicker = "",
    facts = "",
    program = "",
    eventDayNumber = "";
  let schedule: ScheduleItem[] | undefined;
  let venueBlocks: FlowBlock[] = [],
    additionalBlocks: FlowBlock[] = [];
  if (doc.kind === "event-flyer") {
    if (
      doc.contentBinding === "linked" &&
      !events.some((event) => event.id === doc.eventId)
    )
      errors.push(
        "参照するイベントが見つかりません。固定コピーに切り替えるかイベントを選んでください。",
      );
    const event = eventForDocument(doc, events);
    title = doc.content.titleOverride ?? event.title;
    subtitle =
      doc.content.subtitleOverride ??
      `${event.subtitle} ${event.volume}`.trim();
    kicker = event.venueSubtitle;
    facts = `${event.date} (${eventDay(event)})\n開始 ${event.startTime}   /   ${event.price}`;
    const parsedDate = dateISO(event.date);
    eventDayNumber = parsedDate ? parsedDate.slice(8) : "";
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
    if (doc.design.visibility.schedule) {
      program = event.schedule
        .map((item) =>
          item.type === "act" ? `${item.time}   ${item.name}` : item.label,
        )
        .join("\n");
      if (
        !doc.design.visibility.performers &&
        !doc.content.blocks.some((block) => block.visible)
      )
        schedule = event.schedule;
    }
    if (doc.design.visibility.performers && event.performers.length)
      program += `\n\n${event.performers.map((artist) => [artist.name, artist.catchcopy, artist.bio].filter(Boolean).join("\n")).join("\n\n")}`;
    venueBlocks = [
      flowBlock("details-label", "会場", 18, 700, palette.accent, 0),
      flowBlock("details-venue", event.venue.name, 25, 700),
      flowBlock("details-address", event.venue.address, 21),
      flowBlock("details-url", displayUrl(event.venue.url), 20),
      flowBlock("details-organizer", event.organizer, 19, 400, palette.ink, 14),
      ...(doc.design.visibility.notes
        ? [flowBlock("details-note", event.statusNote, 19)]
        : []),
    ];
    if (doc.design.visibility.openMic)
      additionalBlocks.push(
        flowBlock(
          "details-openmic-title",
          event.openMic.title,
          33,
          700,
          palette.accent,
          18,
          elegant,
        ),
        flowBlock(
          "details-openmic-times",
          [event.openMic.time, event.openMic.lastOrder]
            .filter(Boolean)
            .join("\n"),
          21,
        ),
        flowBlock(
          "details-openmic-invitation",
          event.openMic.headline,
          22,
          700,
        ),
        flowBlock(
          "details-openmic-note",
          [event.openMic.note, event.openMic.closeNote]
            .filter(Boolean)
            .join("\n"),
          19,
        ),
      );
    if (doc.design.visibility.socials)
      additionalBlocks.push(
        flowBlock(
          "details-socials",
          event.socials.map((social) => social.label).join(" / "),
          18,
          400,
          palette.ink,
          15,
        ),
      );
  } else {
    title = doc.content.title;
    subtitle = doc.content.subtitle;
    facts = doc.content.facts;
  }
  const blocks = doc.content.blocks.filter((block) => block.visible);
  program = [
    program,
    ...blocks
      .filter((block) => block.type !== "details")
      .map((block) => block.text),
  ]
    .filter(Boolean)
    .join("\n\n");
  additionalBlocks.push(
    ...blocks
      .filter((block) => block.type === "details")
      .map((block) => flowBlock(`details-block-${block.id}`, block.text, 22)),
  );
  if (!title.trim()) errors.push("チラシのタイトルを入力してください。");

  if (doc.kind === "free-flyer" && templateId === "gallery") {
    recipe.hero = [0, 0, 1, 0.28];
    recipe.facts = [0, 0.31, 1, 0.07];
    recipe.art = [0, 0.43, 0.53, 0.57];
    recipe.program = [0.61, 0.43, 0.39, additionalBlocks.length ? 0.31 : 0.57];
    recipe.info = [0.61, 0.79, 0.39, 0.21];
  } else if (
    doc.kind === "free-flyer" &&
    !additionalBlocks.length &&
    templateId !== "magazine"
  ) {
    recipe.program[0] = 0;
    recipe.program[2] = 1;
  }
  const artwork = (role: ArtworkNode["role"], b: Rect): ArtworkNode => ({
    ...b,
    kind: "art",
    art: templateId,
    role,
    color: palette.accent,
    soft: palette.soft,
    ink: palette.ink,
    paper: palette.paper,
  });
  if (doc.design.decorations)
    nodes.push(artwork("ambient", { x: 0, y: 0, w: 1000, h: size.baseHeight }));
  if (recipe.art) {
    const art = box(recipe.art);
    if (doc.assetRefs[0])
      nodes.push({
        ...art,
        kind: "image",
        id: "main-image",
        assetId: doc.assetRefs[0],
      });
    else if (doc.design.decorations) nodes.push(artwork("hero", art));
  }

  const hero = box(recipe.hero);
  hero.x += p.titleX;
  hero.y += p.titleY;
  const reversed = templateId === "livehouse";
  const heroPad = reversed ? 18 : 0;
  if (reversed) shape(hero, palette.ink);
  const serifDefault = [
    "citypop",
    "acoustic",
    "botanical",
    "forest",
    "gallery",
    "magazine",
    "washi",
    "deco",
    "serif",
  ].includes(templateId);
  const roundDefault = ["party", "watercolor", "showa", "sticker"].includes(
    templateId,
  );
  const family =
    doc.design.fontSet === "serif"
      ? serif
      : doc.design.fontSet === "rounded"
        ? rounded
        : doc.design.fontSet === "sans"
          ? sans
          : serifDefault
            ? serif
            : roundDefault
              ? rounded
              : sans;
  const color = reversed ? palette.paper : palette.ink;
  const inset = {
    x: hero.x + heroPad,
    y: hero.y + heroPad,
    w: hero.w - heroPad * 2,
    h: hero.h - heroPad * 2,
  };
  const kickerWidth = Array.from(kicker).reduce(
    (sum, char) => sum + (/[^\u0000-\u007f]/.test(char) ? 18 : 9.5),
    0,
  );
  const kickerHeight = kicker
    ? Math.max(27, Math.ceil(kickerWidth / inset.w) * 26)
    : 0;
  if (kicker)
    text(
      "kicker",
      kicker,
      { ...inset, h: kickerHeight },
      18,
      18,
      color,
      700,
      condensed,
      recipe.align,
    );
  const titleOffset = kicker ? kickerHeight + 7 : 0;
  const titleBox = {
    ...inset,
    y: inset.y + titleOffset,
    h: Math.max(38, inset.h * 0.79 - titleOffset),
  };
  const vertical =
    templateId === "washi" &&
    /^[^A-Za-z0-9]{1,8}$/.test(title) &&
    Array.from(title).length * 28 * 1.08 <= titleBox.h;
  text(
    "title",
    title,
    titleBox,
    recipe.titleSize,
    28,
    color,
    700,
    family,
    recipe.align,
    {
      lineHeight: 1.08,
      valign: "center",
      vertical,
      balanced: true,
      maxLines: vertical ? undefined : Math.max(2, title.split("\n").length),
      shadow:
        templateId === "neon"
          ? "glow"
          : templateId === "riso"
            ? "registration"
            : undefined,
      italic: templateId === "indie",
    },
  );
  text(
    "subtitle",
    subtitle,
    { ...inset, y: inset.y + inset.h * 0.83, h: inset.h * 0.17 },
    35,
    18,
    reversed ? palette.paper : palette.accent,
    700,
    serifDefault ? elegant : condensed,
    recipe.align,
    { lineHeight: 1.16, maxLines: 1 },
  );

  const fb = box(recipe.facts),
    style = recipe.factsStyle;
  if (facts) {
    const filled =
      style === "band" ||
      style === "ticket" ||
      (style === "date" && templateId === "information");
    if (filled) shape(fb, palette.accent);
    if (style === "rule") {
      rule(fb, palette.accent);
      rule({ ...fb, y: fb.y + fb.h }, palette.accent);
    }
    const factsColor = filled ? palette.onAccent : palette.ink;
    if (style === "date" && eventDayNumber) {
      text(
        "facts",
        facts,
        { x: fb.x + 12, y: fb.y + 8, w: fb.w - 24, h: fb.h * 0.4 },
        26,
        18,
        factsColor,
        700,
        sans,
      );
      text(
        "day-monument",
        eventDayNumber,
        { x: fb.x + 8, y: fb.y + fb.h * 0.43, w: fb.w - 16, h: fb.h * 0.55 },
        190,
        40,
        filled ? palette.onAccent : palette.accent,
        700,
        condensed,
        "left",
        { lineHeight: 1, valign: "center" },
      );
      if (!filled) rule({ ...fb, y: fb.y + fb.h }, palette.accent);
    } else {
      const wide = fb.w > 440 && fb.h < 160;
      text(
        "facts",
        wide ? facts.replace(/\n/g, "   /   ") : facts,
        { x: fb.x + 12, y: fb.y + 6, w: fb.w - 24, h: fb.h - 12 },
        wide ? 32 : 35,
        18,
        factsColor,
        700,
        condensed,
        wide ? "center" : "left",
        {
          lineHeight: 1.25,
          valign: "center",
          ...(wide ? { maxLines: 1 } : {}),
        },
      );
    }
  }

  const pb = box(recipe.program);
  if (schedule) {
    const wide = pb.w > 700,
      columns = wide ? 2 : 1,
      gap = wide ? 38 : 0;
    const rows = Math.ceil(schedule.length / columns),
      columnWidth = (pb.w - gap) / columns;
    const headingHeight = 42;
    text(
      "program-heading",
      "出演・タイムテーブル",
      { ...pb, h: 31 },
      22,
      18,
      palette.accent,
      700,
    );
    rule({ ...pb, y: pb.y + 35 }, palette.accent);
    for (let column = 0; column < columns; column++) {
      const items = schedule.slice(column * rows, (column + 1) * rows);
      const actCount = items.filter((item) => item.type === "act").length;
      const unit =
        (pb.h - headingHeight - (items.length - actCount) * 33) /
        Math.max(1, actCount);
      let y = pb.y + headingHeight;
      items.forEach((item, row) => {
        const index = column * rows + row,
          x = pb.x + column * (columnWidth + gap);
        const rowHeight = item.type === "act" ? unit : 33;
        if (item.type === "act") {
          const stacked =
            (wide || ["livehouse", "indie"].includes(templateId)) &&
            rowHeight >= 65;
          if (stacked) {
            const timeH = 25;
            text(
              `time-${index}`,
              item.time,
              { x, y: y + 4, w: columnWidth, h: timeH },
              21,
              18,
              palette.accent,
              700,
              condensed,
              "left",
              { lineHeight: 1.1 },
            );
            text(
              `act-${index}`,
              item.name,
              {
                x,
                y: y + timeH + 6,
                w: columnWidth,
                h: rowHeight - timeH - 10,
              },
              wide ? 33 : 40,
              18,
              palette.ink,
              700,
              sans,
              "left",
              { lineHeight: 1.15 },
            );
          } else {
            const timeWidth = columnWidth * 0.35;
            text(
              `time-${index}`,
              item.time,
              { x, y: y + 6, w: timeWidth - 10, h: rowHeight - 12 },
              22,
              18,
              palette.accent,
              700,
              condensed,
              "left",
              { lineHeight: 1.2, valign: "center" },
            );
            text(
              `act-${index}`,
              item.name,
              {
                x: x + timeWidth,
                y: y + 5,
                w: columnWidth - timeWidth,
                h: rowHeight - 10,
              },
              32,
              18,
              palette.ink,
              700,
              sans,
              "left",
              { lineHeight: 1.2, valign: "center" },
            );
          }
          rule({ x, y: y + rowHeight - 1, w: columnWidth, h: 1 });
        } else {
          if (item.type === "break")
            shape(
              { x, y: y + 5, w: columnWidth, h: rowHeight - 10 },
              palette.soft,
            );
          text(
            `schedule-${index}`,
            item.label,
            { x: x + 5, y: y + 5, w: columnWidth - 10, h: rowHeight - 10 },
            19,
            18,
            palette.ink,
            item.type === "break" ? 700 : 400,
            sans,
            "center",
            { lineHeight: 1.2, valign: "center" },
          );
        }
        y += rowHeight;
      });
    }
  } else if (program) {
    text(
      "program",
      program,
      pb,
      doc.kind === "free-flyer" ? 31 : 28,
      18,
      palette.ink,
      doc.kind === "free-flyer" ? 400 : 700,
      sans,
      "left",
      { lineHeight: 1.65 },
    );
  }
  const ib = box(recipe.info);
  if (venueBlocks.length || additionalBlocks.length) {
    rule(
      { ...ib, y: ib.y - 10 },
      palette.accent,
      ib.w > 700 ? ib.w : Math.min(66, ib.w),
    );
    if (ib.w > 700 && venueBlocks.length && additionalBlocks.length) {
      const gap = 40,
        width = (ib.w - gap) / 2;
      flow("details-left", { ...ib, w: width }, venueBlocks);
      flow(
        "details-right",
        { ...ib, x: ib.x + width + gap, w: width },
        additionalBlocks,
      );
    } else flow("details", ib, [...venueBlocks, ...additionalBlocks]);
  }
  return scene;
}
