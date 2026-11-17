import type { ScheduleItem } from "../types/event";
import { dateISO, eventDay } from "../domain/date";
import type { EventRecord } from "../domain/workspace";
import type { CreativeDocument } from "./document";
import { defaultPlacement, eventForDocument } from "./document";
import { paletteById, sizes, templateById } from "./registry";
import type { Palette } from "./registry";
import type { ArtworkNode } from "./artwork";
import { responsiveRecipe, liveRecipe } from "./layouts";
import type { Slot } from "./layouts";
import { missingArtistNames } from "./live";
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
const condensed = '"Barlow Condensed", "Noto Sans JP", sans-serif';
const elegant = '"Cormorant Garamond", "Noto Serif JP", serif';
// Display faces chosen per composition. Each is a single real weight, so the
// canvas never synthesises a fake bold.
type Face = { family: string; weight: number };
const faces = {
  dela: {
    family: '"Dela Gothic One", "Noto Sans JP", sans-serif',
    weight: 400,
  },
  mincho: {
    family: '"Shippori Mincho B1", "Noto Serif JP", serif',
    weight: 800,
  },
  kaku: {
    family: '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif',
    weight: 900,
  },
  rock: {
    family: '"RocknRoll One", "Zen Maru Gothic", sans-serif',
    weight: 400,
  },
  decol: { family: '"Kaisei Decol", "Noto Serif JP", serif', weight: 700 },
  maru: {
    family: '"Zen Maru Gothic", "Noto Sans JP", sans-serif',
    weight: 700,
  },
} satisfies Record<string, Face>;
const titleFaces: Record<string, Face> = {
  livehouse: faces.dela,
  citypop: faces.decol,
  neon: faces.kaku,
  riso: faces.dela,
  acoustic: faces.mincho,
  indie: faces.dela,
  festival: faces.kaku,
  botanical: faces.mincho,
  forest: faces.decol,
  watercolor: faces.maru,
  swiss: faces.kaku,
  gallery: faces.mincho,
  magazine: faces.mincho,
  showa: faces.dela,
  washi: faces.mincho,
  sticker: faces.rock,
  party: faces.rock,
  deco: faces.decol,
  serif: faces.mincho,
  information: faces.kaku,
};
/** Rough advance width in px; Latin and digits are narrower than CJK glyphs. */
const estimate = (value: string, px: number, narrow = false) =>
  Array.from(value).reduce(
    (sum, char) =>
      sum +
      px *
        (/[^\u0000-\u007f]/.test(char)
          ? 1
          : narrow
            ? /[0-9]/.test(char)
              ? 0.5
              : 0.34
            : 0.6),
    0,
  );
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
  const recipe = (doc.kind === "event-flyer" ? liveRecipe : responsiveRecipe)(
    templateId,
    doc.design.sizeId,
    !!doc.assetRefs[0],
  );
  const showTimes = doc.design.visibility.times !== false;
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
  let dateParts:
    | {
        year: string;
        monthDay: string;
        weekday: string;
        english: string;
        start: string;
        price: string;
      }
    | undefined;
  let priceInDetails = false;
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
    scene.signature = `live/${scene.signature}`;
    if (doc.design.visibility.schedule)
      errors.push(...missingArtistNames(event));
    title = doc.content.titleOverride ?? event.title;
    subtitle =
      doc.content.subtitleOverride ??
      `${event.subtitle} ${event.volume}`.trim();
    kicker = event.venueSubtitle;
    // A long price ("前売 2,500円 / 当日 3,000円（1ドリンク別）") cannot live in
    // the date strip without shrinking everything; it moves to the details
    // column, which wraps and scales gracefully.
    const priceText = event.price.trim();
    priceInDetails = priceText.includes("\n") || estimate(priceText, 22) > 230;
    facts = priceInDetails
      ? `${event.date} (${eventDay(event)})\n開始 ${event.startTime}`
      : `${event.date} (${eventDay(event)})\n開始 ${event.startTime}   /   ${event.price}`;
    const parsedDate = dateISO(event.date);
    eventDayNumber = parsedDate ? parsedDate.slice(8) : "";
    if (parsedDate) {
      // Keep the writer's own month/day separator ("5/9", "5.9") so the
      // flyer reads the way it was typed, only larger.
      const raw = event.date
        .trim()
        .match(/^(\d{4})[.\-/年](\d{1,2})([.\-/月])(\d{1,2})/);
      const separator = raw && raw[3] !== "-" && raw[3] !== "月" ? raw[3] : "/";
      const day = eventDay(event);
      const englishDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const japaneseIndex = "日月火水木金土".indexOf(day);
      dateParts = {
        year: parsedDate.slice(0, 4),
        monthDay: `${Number(parsedDate.slice(5, 7))}${separator}${Number(parsedDate.slice(8))}`,
        weekday: day,
        english:
          day.length === 1 && japaneseIndex >= 0
            ? englishDays[japaneseIndex]
            : "",
        start: event.startTime.trim() ? `開始 ${event.startTime.trim()}` : "",
        price: priceInDetails ? "" : priceText,
      };
    }
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
        .filter((item) => showTimes || item.type === "act")
        .map((item) =>
          item.type === "act"
            ? showTimes
              ? `${item.time}   ${item.name}`
              : item.name
            : item.label,
        )
        .join("\n");
      if (
        !doc.design.visibility.performers &&
        !doc.content.blocks.some((block) => block.visible)
      )
        schedule = event.schedule.filter(
          (item) => showTimes || item.type === "act",
        );
    }
    if (doc.design.visibility.performers && event.performers.length)
      program += `\n\n${event.performers.map((artist) => [artist.name, artist.catchcopy, artist.bio].filter(Boolean).join("\n")).join("\n\n")}`;
    venueBlocks = [
      ...(priceInDetails
        ? [
            flowBlock(
              "details-price-label",
              "料金",
              18,
              700,
              palette.accent,
              0,
            ),
            flowBlock(
              "details-price",
              event.price.trim(),
              25,
              700,
              palette.ink,
              4,
            ),
          ]
        : []),
      flowBlock(
        "details-label",
        "会場",
        18,
        700,
        palette.accent,
        priceInDetails ? 18 : 0,
      ),
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
  // If the details column cannot hold its text even at the smallest allowed
  // sizes, let it span the full width under a compact two-column lineup rather
  // than failing the export (the common case is a long note on a square).
  if (
    doc.kind === "event-flyer" &&
    (venueBlocks.length || additionalBlocks.length)
  ) {
    const flowNeed = (blocks: FlowBlock[], width: number) =>
      blocks
        .filter((block) => block.text.trim())
        .reduce((sum, block, index) => {
          const lines = block.text
            .split("\n")
            .reduce(
              (n, line) =>
                n +
                Math.max(1, Math.ceil(estimate(line, block.minSize) / width)),
              0,
            );
          return (
            sum +
            lines * block.minSize * (block.lineHeight ?? 1.4) +
            (index ? (block.gapBefore ?? 7) : 0)
          );
        }, 0);
    if (recipe.program[2] <= 0.9) {
      const info = box(recipe.info);
      if (flowNeed([...venueBlocks, ...additionalBlocks], info.w) > info.h) {
        const headerEnd = Math.max(
          ...[recipe.hero, recipe.facts, recipe.art]
            .filter((slot): slot is Slot => !!slot)
            .map((slot) => slot[1] + slot[3]),
        );
        const start = headerEnd + 0.02;
        const programHeight = doc.design.sizeId === "story" ? 0.23 : 0.27;
        const infoStart = start + programHeight + 0.022;
        recipe.program = [0, start, 1, programHeight];
        recipe.info = [0, infoStart, 1, 1 - infoStart];
      }
    }
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
  // Washi sets a short title vertically in a narrow column. A longer title gets
  // a wide headline slot next to a smaller brush mark instead of failing.
  const kickerPx = Array.from(kicker).reduce(
    (sum, char) => sum + (/[^\u0000-\u007f]/.test(char) ? 18 : 9.5),
    0,
  );
  const titleHeightIn = (b: Rect) => {
    const kh = kicker ? Math.max(27, Math.ceil(kickerPx / b.w) * 26) : 0;
    return Math.max(38, b.h * 0.79 - (kicker ? kh + 7 : 0));
  };
  let vertical = false;
  if (templateId === "washi") {
    vertical =
      /^[^A-Za-z0-9]{1,8}$/.test(title) &&
      Array.from(title).length * 28 * 1.08 <= titleHeightIn(box(recipe.hero));
    if (!vertical && recipe.art) {
      const top = Math.min(recipe.hero[1], recipe.art[1]);
      const height = Math.max(0.16, recipe.facts[1] - top - 0.02);
      recipe.hero = [0.33, top, 0.67, height];
      recipe.art = [0, top, 0.29, height];
    }
  }
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
  const face: Face =
    doc.design.fontSet === "serif"
      ? faces.mincho
      : doc.design.fontSet === "rounded"
        ? faces.maru
        : doc.design.fontSet === "sans"
          ? { family: sans, weight: 700 }
          : (titleFaces[templateId] ?? { family: sans, weight: 700 });
  const family = face.family;
  // Artist names follow the headline's voice in a lighter, legible cut.
  const nameFace: Face =
    doc.design.fontSet === "sans"
      ? { family: sans, weight: 700 }
      : face === faces.mincho || face === faces.decol
        ? faces.mincho
        : face === faces.rock
          ? faces.rock
          : face === faces.maru
            ? faces.maru
            : { family: sans, weight: 700 };
  // The Open Mic heading speaks in the layout's own voice: Latin serif for the
  // mincho layouts, condensed grotesk for the gothic ones.
  const openMicTitle = additionalBlocks.find(
    (block) => block.id === "details-openmic-title",
  );
  if (openMicTitle && doc.design.fontSet !== "serif") {
    const latinFace =
      face === faces.rock || face === faces.maru
        ? face
        : face === faces.mincho || face === faces.decol
          ? { family: elegant, weight: 700 }
          : { family: condensed, weight: 700 };
    openMicTitle.family = latinFace.family;
    openMicTitle.weight = latinFace.weight;
    if (latinFace.family === condensed) openMicTitle.size = 36;
    if (latinFace === faces.rock || latinFace === faces.maru)
      openMicTitle.size = 29;
  }
  const color = reversed ? palette.paper : palette.ink;
  const inset = {
    x: hero.x + heroPad,
    y: hero.y + heroPad,
    w: hero.w - heroPad * 2,
    h: hero.h - heroPad * 2,
  };
  const kickerHeight = kicker
    ? Math.max(27, Math.ceil(kickerPx / inset.w) * 26)
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
  text(
    "title",
    title,
    titleBox,
    recipe.titleSize,
    28,
    color,
    face.weight,
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
    } else if (dateParts) {
      // A flyer is read for "when" right after "what": the date becomes a
      // display numeral instead of one more line of body copy.
      const d = dateParts;
      const pad = filled ? 22 : 12;
      const inner = { x: fb.x + pad, y: fb.y, w: fb.w - pad * 2, h: fb.h };
      const accentInk = filled ? palette.onAccent : palette.accent;
      const weekdayLabel = d.english
        ? `${d.english} (${d.weekday})`
        : d.weekday
          ? `(${d.weekday})`
          : "";
      const horizontal =
        inner.w >= 330 && (inner.h < 220 || inner.w / inner.h > 4.2);
      if (horizontal) {
        const infoText = (px: number) =>
          Math.max(estimate(d.start, px), estimate(d.price, px)) + 10;
        // Shrink the numeral until numeral + weekday + details share one line;
        // in a narrow strip the details drop to a second row instead.
        const measure = (rowH: number, beside: boolean) => {
          for (let big = Math.min(132, Math.max(44, rowH * 0.94)); ; big -= 4) {
            const small = Math.max(18, Math.min(30, big * 0.32));
            const infoSize = Math.max(19, Math.min(34, big * 0.36));
            const numberWidth = estimate(d.monthDay, big, true) + 8;
            const sideWidth =
              Math.max(
                estimate(d.year, small, true),
                estimate(weekdayLabel, small * 1.15, true),
              ) + 10;
            const fixed = numberWidth + 16 + sideWidth + (beside ? 56 : 0);
            const need = beside
              ? fixed + Math.min(infoText(infoSize), 260)
              : fixed;
            if (need <= inner.w || big <= 44)
              return {
                big,
                small,
                infoSize,
                numberWidth,
                sideWidth,
                fixed,
                fits: need <= inner.w,
              };
          }
        };
        let row = measure(inner.h, true);
        const twoRows = inner.h >= 110 && (!row.fits || row.big < 64);
        const rowH = twoRows ? inner.h * 0.64 : inner.h;
        if (twoRows) row = measure(rowH, false);
        const { big, small, infoSize, numberWidth, sideWidth, fixed } = row;
        const infoWidth = twoRows
          ? 0
          : Math.max(120, Math.min(inner.w - fixed, infoText(infoSize)));
        const total = fixed + infoWidth;
        const centered = recipe.align === "center" || style === "rule";
        let x = centered
          ? inner.x + Math.max(0, (inner.w - total) / 2)
          : inner.x;
        text(
          "facts-date",
          d.monthDay,
          { x, y: inner.y, w: numberWidth, h: rowH },
          big,
          28,
          factsColor,
          700,
          condensed,
          "left",
          { lineHeight: 1, valign: "center", maxLines: 1 },
        );
        x += numberWidth + 16;
        const stackH = small * 1.2 + small * 1.15 * 1.2;
        const stackY = inner.y + (rowH - stackH) / 2;
        text(
          "facts-year",
          d.year,
          { x, y: stackY, w: sideWidth, h: small * 1.2 },
          small,
          16,
          accentInk,
          700,
          condensed,
          "left",
          { lineHeight: 1.1, maxLines: 1 },
        );
        text(
          "facts-weekday",
          weekdayLabel,
          {
            x,
            y: stackY + small * 1.2,
            w: sideWidth,
            h: small * 1.15 * 1.2,
          },
          small * 1.15,
          16,
          factsColor,
          700,
          condensed,
          "left",
          { lineHeight: 1.1, maxLines: 1 },
        );
        if (twoRows)
          text(
            "facts-detail",
            [d.start, d.price].filter(Boolean).join("  /  "),
            { x: inner.x, y: inner.y + rowH, w: inner.w, h: inner.h - rowH },
            Math.max(19, Math.min(30, (inner.h - rowH) * 0.6)),
            16,
            factsColor,
            700,
            sans,
            centered ? "center" : "left",
            { lineHeight: 1.2, valign: "center" },
          );
        else {
          x += sideWidth + 27;
          shape(
            { x, y: inner.y + inner.h * 0.2, w: 2, h: inner.h * 0.6 },
            filled ? palette.onAccent : palette.soft,
          );
          x += 27;
          text(
            "facts-detail",
            [d.start, d.price].filter(Boolean).join("\n"),
            {
              x,
              y: inner.y + 4,
              w: Math.min(infoWidth, inner.x + inner.w - x),
              h: inner.h - 8,
            },
            infoSize,
            17,
            factsColor,
            700,
            sans,
            "left",
            { lineHeight: 1.22, valign: "center" },
          );
        }
      } else {
        // Stacked ticket: numeral, then weekday/year, then start and price.
        const big = Math.min(150, Math.max(40, inner.h * 0.42));
        const small = Math.max(18, Math.min(28, big * 0.3));
        const align = recipe.align === "center" ? "center" : "left";
        const numberH = big * 1.04;
        const lineH = small * 1.3;
        const detailLines = [d.start, d.price].filter(Boolean).join("\n");
        const detailH = Math.max(small * 1.3, inner.h - numberH - lineH - 22);
        const startY =
          inner.y +
          Math.max(6, (inner.h - (numberH + lineH + detailH + 12)) / 2);
        text(
          "facts-date",
          d.monthDay,
          { x: inner.x, y: startY, w: inner.w, h: numberH },
          big,
          28,
          factsColor,
          700,
          condensed,
          align,
          { lineHeight: 1, valign: "center", maxLines: 1 },
        );
        text(
          "facts-weekday",
          [weekdayLabel, d.year].filter(Boolean).join("  "),
          { x: inner.x, y: startY + numberH, w: inner.w, h: lineH },
          small,
          16,
          accentInk,
          700,
          condensed,
          align,
          { lineHeight: 1.15, maxLines: 1 },
        );
        text(
          "facts-detail",
          detailLines,
          {
            x: inner.x,
            y: startY + numberH + lineH + 12,
            w: inner.w,
            h: detailH,
          },
          Math.max(20, Math.min(30, small * 1.08)),
          17,
          factsColor,
          700,
          sans,
          align,
          { lineHeight: 1.3 },
        );
      }
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
      showTimes ? "出演・タイムテーブル" : "出演者",
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
            showTimes &&
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
              wide ? 36 : 42,
              18,
              palette.ink,
              nameFace.weight,
              nameFace.family,
              "left",
              { lineHeight: 1.15 },
            );
          } else {
            const timeWidth = showTimes ? columnWidth * 0.35 : 0;
            // Dense lineups (10+ acts in a square) get less padding instead of
            // text boxes shorter than their own minimum font size.
            const pad = Math.max(1, Math.min(6, (rowHeight - 24) / 2));
            if (showTimes)
              text(
                `time-${index}`,
                item.time,
                { x, y: y + pad, w: timeWidth - 10, h: rowHeight - pad * 2 },
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
                y: y + pad,
                w: columnWidth - timeWidth,
                h: rowHeight - pad * 2,
              },
              showTimes ? 36 : 44,
              18,
              palette.ink,
              nameFace.weight,
              nameFace.family,
              "left",
              { lineHeight: 1.2, valign: "center" },
            );
          }
          rule({ x, y: y + rowHeight - 1, w: columnWidth, h: 1 });
        } else {
          if (item.type === "break") {
            // A quiet interlude marker: a short pill between hairlines rather
            // than a full-width bar competing with the artist names.
            const pill = Math.min(columnWidth * 0.62, 300);
            const px = x + (columnWidth - pill) / 2;
            shape(
              {
                x,
                y: y + rowHeight / 2,
                w: (columnWidth - pill) / 2 - 10,
                h: 1,
              },
              palette.soft,
            );
            shape(
              {
                x: px + pill + 10,
                y: y + rowHeight / 2,
                w: (columnWidth - pill) / 2 - 10,
                h: 1,
              },
              palette.soft,
            );
            shape(
              { x: px, y: y + 4, w: pill, h: rowHeight - 8 },
              palette.soft,
              undefined,
              (rowHeight - 8) / 2,
            );
          }
          const labelWidth =
            item.type === "break"
              ? Math.min(columnWidth * 0.62, 300) - 20
              : columnWidth - 10;
          text(
            `schedule-${index}`,
            item.label,
            {
              x: x + (columnWidth - labelWidth) / 2,
              y: y + 5,
              w: labelWidth,
              h: rowHeight - 10,
            },
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
