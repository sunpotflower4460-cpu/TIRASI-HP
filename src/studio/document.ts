import type { EventData } from "../types/event";
import type { SizeId, TemplateId } from "./registry";
import { allTemplates, palettes, sizes } from "./registry";
import {
  array,
  object,
  parseEvent,
  string,
  ValidationError,
} from "../domain/validation";
import type { EventRecord } from "../domain/workspace";
import { newId } from "../domain/workspace";
export type ContentBlock = {
  id: string;
  type: "heading" | "text" | "details";
  text: string;
  visible: boolean;
};
export type Placement = {
  titleX: number;
  titleY: number;
  imageX: number;
  imageY: number;
  zoom: number;
  opacity: number;
  fit: "contain" | "cover";
};
export const defaultPlacement: Placement = {
  titleX: 0,
  titleY: 0,
  imageX: 50,
  imageY: 50,
  zoom: 1,
  opacity: 1,
  fit: "cover",
};
export type EffectId =
  | "fresh1985"
  | "aged1985"
  | "photocopy"
  | "risograph"
  | "neon"
  | "film";
export type Treatment = {
  preset: EffectId;
  intensity: number;
  grain: number;
  halftone: number;
  registration: number;
  fade: number;
  warmth: number;
  scratches: number;
  vignette: number;
  seed: number;
  stamp: string;
};
export const defaultTreatment: Treatment = {
  preset: "fresh1985",
  intensity: 0.55,
  grain: 0.15,
  halftone: 0.15,
  registration: 0.2,
  fade: 0.1,
  warmth: 0.15,
  scratches: 0,
  vignette: 0.15,
  seed: 1985,
  stamp: "",
};
export type Design = {
  templateId: TemplateId;
  paletteId: string;
  sizeId: SizeId;
  fontSet: "auto" | "sans" | "serif" | "rounded";
  decorations: boolean;
  visibility: {
    schedule: boolean;
    openMic: boolean;
    notes: boolean;
    performers: boolean;
    socials: boolean;
  };
  placements: Partial<Record<SizeId, Placement>>;
};
type BaseDocument = {
  schemaVersion: 2;
  id: string;
  name: string;
  design: Design;
  assetRefs: string[];
  updatedAt: string;
};
export type CreativeDocument = BaseDocument &
  (
    | {
        kind: "event-flyer";
        eventId: string;
        contentBinding: "linked" | "snapshot";
        snapshot: EventData;
        content: {
          titleOverride?: string;
          subtitleOverride?: string;
          blocks: ContentBlock[];
        };
      }
    | {
        kind: "free-flyer";
        content: {
          title: string;
          subtitle: string;
          facts: string;
          blocks: ContentBlock[];
        };
      }
    | {
        kind: "image-treatment";
        content: { sourceAssetId?: string; recipe: Treatment };
      }
  );
export function defaultDesign(): Design {
  return {
    templateId: "citypop",
    paletteId: "city",
    sizeId: "a4",
    fontSet: "auto",
    decorations: true,
    visibility: {
      schedule: true,
      openMic: true,
      notes: true,
      performers: false,
      socials: true,
    },
    placements: {},
  };
}
export function createDocument(
  kind: CreativeDocument["kind"],
  event?: { id: string; eventData: EventData },
): CreativeDocument {
  const base: BaseDocument = {
    schemaVersion: 2,
    id: newId(),
    name:
      kind === "event-flyer"
        ? "イベントのチラシ"
        : kind === "free-flyer"
          ? "自由制作のチラシ"
          : "画像のレトロ加工",
    design: defaultDesign(),
    assetRefs: [],
    updatedAt: new Date().toISOString(),
  };
  if (kind === "event-flyer") {
    if (!event) throw new ValidationError("イベントを選択してください。");
    return {
      ...base,
      design: {
        ...base.design,
        paletteId: palettes.some((p) => p.id === event.eventData.themeId)
          ? event.eventData.themeId
          : "spring",
        visibility: {
          ...base.design.visibility,
          performers: event.eventData.flyerOptions.showPerformerProfiles,
        },
      },
      kind,
      eventId: event.id,
      contentBinding: "linked",
      snapshot: parseEvent(event.eventData),
      content: { blocks: [] },
    };
  }
  if (kind === "free-flyer")
    return {
      ...base,
      design: { ...base.design, templateId: "gallery", paletteId: "mono" },
      kind,
      content: {
        title: "新しいチラシ",
        subtitle: "ここから、伝えたいことを。",
        facts: "",
        blocks: [
          {
            id: newId(),
            type: "text",
            text: "本文を入力してください。画像がなくてもチラシを作れます。",
            visible: true,
          },
        ],
      },
    };
  return { ...base, kind, content: { recipe: { ...defaultTreatment } } };
}
export function bounded(
  value: unknown,
  path: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new ValidationError(`${path}: ${min}〜${max}の数値が必要です。`);
  return value;
}
function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean")
    throw new ValidationError(`${path}: 真偽値が必要です。`);
  return value;
}
export function parseDocument(value: unknown): CreativeDocument {
  const d = { ...object(value, "制作物") };
  if (d.schemaVersion !== 2)
    throw new ValidationError("制作物のバージョンが未対応です。");
  const design = object(d.design, "デザイン");
  const templateId = string(design.templateId, "templateId", 50);
  const paletteId = string(design.paletteId, "paletteId", 50);
  const sizeId = string(design.sizeId, "sizeId", 50);
  if (
    !allTemplates.some((t) => t.id === templateId) ||
    !palettes.some((p) => p.id === paletteId) ||
    !Object.prototype.hasOwnProperty.call(sizes, sizeId)
  )
    throw new ValidationError("未対応のテンプレート・配色・サイズです。");
  if (
    templateId === "legacy" &&
    (sizeId !== "a4" ||
      d.kind !== "event-flyer" ||
      !["spring", "summer", "autumn", "night"].includes(paletteId))
  )
    throw new ValidationError(
      "旧版デザインはイベントチラシのA4に対応しています。",
    );
  if (!["auto", "sans", "serif", "rounded"].includes(String(design.fontSet)))
    throw new ValidationError("未対応の文字設定です。");
  const visibility = object(design.visibility, "表示設定");
  for (const key of ["schedule", "openMic", "notes", "performers", "socials"])
    boolean(visibility[key], key);
  boolean(design.decorations, "装飾");
  const placements = object(design.placements, "配置");
  for (const [size, v] of Object.entries(placements)) {
    if (!Object.prototype.hasOwnProperty.call(sizes, size))
      throw new ValidationError("未対応のサイズ別配置です。");
    const p = object(v, "配置");
    bounded(p.titleX, "タイトルX", -100, 100);
    bounded(p.titleY, "タイトルY", -100, 100);
    bounded(p.imageX, "画像X", 0, 100);
    bounded(p.imageY, "画像Y", 0, 100);
    bounded(p.zoom, "拡大率", 1, 3);
    bounded(p.opacity, "透明度", 0.1, 1);
    if (!["contain", "cover"].includes(String(p.fit)))
      throw new ValidationError("画像の配置形式が不正です。");
  }
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(string(d.id, "制作物id", 200)))
    throw new ValidationError("制作物IDが不正です。");
  string(d.name, "制作物名", 500);
  string(d.updatedAt, "更新日", 100);
  array(d.assetRefs, "画像参照", 20).forEach((id) => string(id, "画像ID", 200));
  const content = object(d.content, "本文");
  if (d.kind === "image-treatment") {
    if (content.sourceAssetId !== undefined) {
      const id = string(content.sourceAssetId, "元画像", 200);
      if (!(d.assetRefs as string[]).includes(id))
        throw new ValidationError("元画像の参照が一致しません。");
    }
    const recipe = object(content.recipe, "加工設定");
    if (
      ![
        "fresh1985",
        "aged1985",
        "photocopy",
        "risograph",
        "neon",
        "film",
      ].includes(String(recipe.preset))
    )
      throw new ValidationError("未対応の加工です。");
    for (const k of [
      "intensity",
      "grain",
      "halftone",
      "registration",
      "fade",
      "warmth",
      "scratches",
      "vignette",
    ])
      bounded(recipe[k], k, 0, 1);
    bounded(recipe.seed, "seed", 0, 4294967295);
    if (!Number.isInteger(recipe.seed))
      throw new ValidationError("seedは整数が必要です。");
    string(recipe.stamp, "日付スタンプ", 40);
  } else {
    if (d.kind === "event-flyer") {
      string(d.eventId, "eventId", 200);
      d.snapshot = parseEvent(d.snapshot);
      if (!["linked", "snapshot"].includes(String(d.contentBinding)))
        throw new ValidationError("イベント反映方法が不正です。");
      if (content.titleOverride !== undefined)
        string(content.titleOverride, "タイトル上書き", 1000);
      if (content.subtitleOverride !== undefined)
        string(content.subtitleOverride, "サブタイトル上書き", 1000);
    } else if (d.kind === "free-flyer") {
      string(content.title, "タイトル", 1000);
      string(content.subtitle, "サブタイトル", 2000);
      string(content.facts, "日時・料金等", 3000);
    } else throw new ValidationError("制作物の種類が不正です。");
    const ids = new Set<string>();
    array(content.blocks, "ブロック", 30).forEach((v) => {
      const b = object(v);
      const id = string(b.id, "ブロックid", 200);
      if (ids.has(id))
        throw new ValidationError("ブロックIDが重複しています。");
      ids.add(id);
      if (!["text", "heading", "details"].includes(String(b.type)))
        throw new ValidationError("ブロックの種類が不正です。");
      string(b.text, "ブロック本文", 10000);
      boolean(b.visible, "ブロック表示");
    });
  }
  return structuredClone(d) as CreativeDocument;
}
export function changeTemplate(
  doc: CreativeDocument,
  templateId: TemplateId,
): CreativeDocument {
  // Text overrides, blocks, visibility, image references and every size's placement are independent of a recipe.
  return {
    ...doc,
    design: {
      ...doc.design,
      templateId,
      ...(templateId === "legacy"
        ? {
            sizeId: "a4" as const,
            paletteId: ["spring", "summer", "autumn", "night"].includes(
              doc.design.paletteId,
            )
              ? doc.design.paletteId
              : "summer",
          }
        : {}),
    },
    updatedAt: new Date().toISOString(),
  };
}
export const effects: { id: EffectId; label: string; description: string }[] = [
  {
    id: "fresh1985",
    label: "1985 新品印刷",
    description: "鮮明な色と、わずかな印刷粒子。",
  },
  {
    id: "aged1985",
    label: "1985 経年ポスター",
    description: "退色、温かな紙、細かい擦れ。",
  },
  {
    id: "photocopy",
    label: "昭和コピー機",
    description: "高コントラストのモノクロと網点。",
  },
  {
    id: "risograph",
    label: "リソグラフ2色刷り",
    description: "朱と藍の二色と微かな版ずれ。",
  },
  {
    id: "neon",
    label: "ネオンライブ",
    description: "ピンクと青の明暗に置き換える色調。",
  },
  {
    id: "film",
    label: "古いフィルム写真",
    description: "柔らかな色、粒子、周辺の陰影。",
  },
];
export const starters = [
  {
    id: "exhibition",
    label: "作品展・写真展",
    title: "余白を、飾る。",
    subtitle: "ART & PHOTO EXHIBITION",
    template: "gallery",
    text: "作品や作家の紹介をここに。\n会期・場所・お問い合わせ先を追加してください。",
  },
  {
    id: "workshop",
    label: "ワークショップ",
    title: "手を動かす、\n週末の時間。",
    subtitle: "WEEKEND WORKSHOP",
    template: "botanical",
    text: "体験できること・対象・持ち物をここに。\n定員・参加費・申込方法を追加してください。",
  },
  {
    id: "shop",
    label: "お店・セール",
    title: "ちいさなお店の\nお知らせ",
    subtitle: "NEW ARRIVALS / SPECIAL DAYS",
    template: "sticker",
    text: "商品やサービスの紹介をここに。\n価格・営業時間・所在地を追加してください。",
  },
  {
    id: "menu",
    label: "カフェ・メニュー",
    title: "きょうの、\nおすすめ。",
    subtitle: "CAFE MENU",
    template: "serif",
    text: "季節のプレート　¥ 000\n本日のコーヒー　¥ 000\n\n商品名と価格を編集してください。",
  },
  {
    id: "lesson",
    label: "教室・講座",
    title: "はじめてを、\n楽しもう。",
    subtitle: "LESSON & SEMINAR",
    template: "information",
    text: "学べること・対象・講師の紹介をここに。\n日時・会場・受講料・申込先を追加してください。",
  },
  {
    id: "community",
    label: "地域の催し・交流会",
    title: "まちで、会おう。",
    subtitle: "COMMUNITY DAY",
    template: "showa",
    text: "催しの内容や参加方法をここに。\n日時・会場・参加費・連絡先を追加してください。",
  },
] as const;
export function mapBlocks(
  doc: CreativeDocument,
  fn: (blocks: ContentBlock[]) => ContentBlock[],
): CreativeDocument {
  if (doc.kind === "image-treatment") return doc;
  if (doc.kind === "event-flyer")
    return {
      ...doc,
      content: { ...doc.content, blocks: fn(doc.content.blocks) },
    };
  return {
    ...doc,
    content: { ...doc.content, blocks: fn(doc.content.blocks) },
  };
}

export function eventForDocument(
  doc: Extract<CreativeDocument, { kind: "event-flyer" }>,
  events: EventRecord[],
): EventData {
  return doc.contentBinding === "linked"
    ? (events.find((event) => event.id === doc.eventId)?.eventData ??
        doc.snapshot)
    : doc.snapshot;
}
