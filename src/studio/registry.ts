export const sizes = {
  a4: {
    label: "A4 縦",
    width: 2480,
    height: 3508,
    baseWidth: 1000,
    baseHeight: (3508 / 2480) * 1000,
    print: true,
    safe: 44,
  },
  portrait: {
    label: "SNS 縦",
    width: 1080,
    height: 1350,
    baseWidth: 1000,
    baseHeight: 1250,
    print: false,
    safe: 44,
  },
  square: {
    label: "SNS 正方形",
    width: 1080,
    height: 1080,
    baseWidth: 1000,
    baseHeight: 1000,
    print: false,
    safe: 44,
  },
  story: {
    label: "ストーリー",
    width: 1080,
    height: 1920,
    baseWidth: 1000,
    baseHeight: (1920 / 1080) * 1000,
    print: false,
    safe: 56,
  },
} as const;
export type SizeId = keyof typeof sizes;
export type Palette = {
  id: string;
  label: string;
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  onAccent: string;
};
export const palettes: Palette[] = [
  {
    id: "spring",
    label: "桜と若葉",
    paper: "#fff7f6",
    ink: "#392b32",
    accent: "#983e5b",
    soft: "#ebd9d6",
    onAccent: "#ffffff",
  },
  {
    id: "summer",
    label: "空と海",
    paper: "#f3fbff",
    ink: "#173746",
    accent: "#24678e",
    soft: "#c9e6e9",
    onAccent: "#ffffff",
  },
  {
    id: "autumn",
    label: "木の実と夕暮れ",
    paper: "#fff7e8",
    ink: "#413022",
    accent: "#8e4628",
    soft: "#e7cda7",
    onAccent: "#ffffff",
  },
  {
    id: "night",
    label: "夜と金",
    paper: "#171c2d",
    ink: "#faf1dd",
    accent: "#e5bc68",
    soft: "#323c56",
    onAccent: "#171c2d",
  },
  {
    id: "neon",
    label: "ネオンピンク",
    paper: "#171526",
    ink: "#faf4ff",
    accent: "#ff8fce",
    soft: "#38284f",
    onAccent: "#171526",
  },
  {
    id: "city",
    label: "サンセット",
    paper: "#fff1de",
    ink: "#3d2545",
    accent: "#933252",
    soft: "#f4c39d",
    onAccent: "#ffffff",
  },
  {
    id: "riso",
    label: "朱と藍",
    paper: "#f6efd9",
    ink: "#192c46",
    accent: "#a1372b",
    soft: "#e4d8b7",
    onAccent: "#ffffff",
  },
  {
    id: "forest",
    label: "森とクラフト",
    paper: "#e9e2ca",
    ink: "#28382b",
    accent: "#365b3e",
    soft: "#c3c7a6",
    onAccent: "#ffffff",
  },
  {
    id: "mono",
    label: "白と墨",
    paper: "#fafaf7",
    ink: "#20201e",
    accent: "#333332",
    soft: "#e3e3dc",
    onAccent: "#ffffff",
  },
  {
    id: "cobalt",
    label: "コバルト",
    paper: "#f2f2eb",
    ink: "#172c68",
    accent: "#1e3fa2",
    soft: "#cdd6ec",
    onAccent: "#ffffff",
  },
  {
    id: "plum",
    label: "すみれ",
    paper: "#f7f2fc",
    ink: "#38294b",
    accent: "#70438f",
    soft: "#e2d6ed",
    onAccent: "#ffffff",
  },
  {
    id: "citrus",
    label: "レモンと深緑",
    paper: "#fffde3",
    ink: "#28382b",
    accent: "#3f6037",
    soft: "#eee88e",
    onAccent: "#ffffff",
  },
];
export type ModernTemplateId =
  | "livehouse"
  | "citypop"
  | "neon"
  | "riso"
  | "acoustic"
  | "indie"
  | "festival"
  | "botanical"
  | "forest"
  | "watercolor"
  | "swiss"
  | "gallery"
  | "magazine"
  | "showa"
  | "washi"
  | "sticker"
  | "party"
  | "deco"
  | "serif"
  | "information";
export type TemplateId = ModernTemplateId | "legacy";
export type Template = {
  id: TemplateId;
  label: string;
  family: string;
  description: string;
  palette: string;
  compositionSignature: string;
  recommended: string;
  supportedSizes: SizeId[];
};
const template = (
  id: TemplateId,
  label: string,
  family: string,
  description: string,
  palette: string,
  compositionSignature: string,
  recommended: string,
): Template => ({
  id,
  label,
  family,
  description,
  palette,
  compositionSignature,
  recommended,
  supportedSizes: ["a4", "portrait", "square", "story"],
});
export const templates: Template[] = [
  template(
    "livehouse",
    "1985 ライブハウス",
    "80年代",
    "黒帯のヘッドラインと切り貼りした縦長の告知欄。",
    "mono",
    "left-masthead/right-ticket/offset-program",
    "ライブ・バンド告知",
  ),
  template(
    "citypop",
    "シティポップ",
    "80年代",
    "大きな夕日と水平線、左に寄せたタイトル。",
    "city",
    "sunset-right/title-left/horizontal-facts",
    "ライブ・ショップ",
  ),
  template(
    "neon",
    "ネオンステージ",
    "80年代",
    "光のアーチで囲む中央タイトルと舞台風の二段組。",
    "neon",
    "arch-center/center-title/lower-split",
    "夜のライブ・パーティー",
  ),
  template(
    "riso",
    "リソグラフ",
    "80年代",
    "版ずれの円と上端の日付、左右を入れ替えた情報欄。",
    "riso",
    "top-facts/right-title/left-info/right-program",
    "ライブ・展示",
  ),
  template(
    "acoustic",
    "アコースティック",
    "音楽",
    "レコードの円、広いタイトルと木目の仕切り。",
    "forest",
    "record-right/wide-title/program-left/narrow-info",
    "弾き語り・カフェ",
  ),
  template(
    "indie",
    "インディーギグ",
    "音楽",
    "左右で大きさを変えた見出しと階段状のパネル。",
    "cobalt",
    "vertical-sideband/stepped-title/low-facts",
    "ライブ・作品発表",
  ),
  template(
    "festival",
    "フェス・ラインナップ",
    "音楽",
    "帯の見出しと中央の大きなプログラム一覧。",
    "summer",
    "banner-top/wide-program/bottom-info",
    "出演者の多いイベント",
  ),
  template(
    "botanical",
    "ボタニカル",
    "自然",
    "左右の葉と細い枠、中央に余白を持つ構図。",
    "forest",
    "leaf-corners/center-hero/bordered-columns",
    "講座・マルシェ",
  ),
  template(
    "forest",
    "フォレストフォーク",
    "自然",
    "版画風の山並みと左の縦長インフォメーション。",
    "forest",
    "mountain-header/info-left/program-right",
    "野外イベント・手仕事",
  ),
  template(
    "watercolor",
    "水彩の便り",
    "自然",
    "にじみの円を背景に、丸いカードを並べる。",
    "spring",
    "wash-bubbles/center-title/rounded-cards",
    "ワークショップ・教室",
  ),
  template(
    "swiss",
    "スイスグリッド",
    "モダン",
    "細い罫線と大きな日付欄で情報を整理。",
    "mono",
    "red-square/rule-grid/left-facts/right-title",
    "セミナー・展示",
  ),
  template(
    "gallery",
    "ミニマルギャラリー",
    "モダン",
    "右上の小さな作品枠と左下に広がるタイトル。",
    "mono",
    "top-art/right-facts/low-title/quiet-columns",
    "写真展・作品展",
  ),
  template(
    "magazine",
    "マガジンカバー",
    "モダン",
    "横長のマストヘッドと、写真枠を挟んだ記事欄。",
    "plum",
    "full-masthead/art-left/program-right/bottom-deck",
    "新商品・展示・人物紹介",
  ),
  template(
    "showa",
    "昭和ポップ",
    "和風",
    "大きな丸と二重の額縁、切符のような日付。",
    "riso",
    "double-frame/circle-title/ticket-facts",
    "地域の催し・セール",
  ),
  template(
    "washi",
    "和紙と墨",
    "和風",
    "墨の柱と細い縦罫線、和紙の余白。",
    "mono",
    "vertical-title-right/program-left/dual-footer",
    "和の展示・お稽古",
  ),
  template(
    "sticker",
    "ポップステッカー",
    "ポップ",
    "貼り紙の見出し、丸い価格シールと色面。",
    "citrus",
    "label-title/round-facts/offset-papers",
    "ショップ・フリマ",
  ),
  template(
    "party",
    "手描きパーティー",
    "ポップ",
    "手描きの星、旗、中央の大きな招待状。",
    "spring",
    "bunting-header/invitation-title/dotted-columns",
    "交流会・親子イベント",
  ),
  template(
    "deco",
    "アールデコ・ナイト",
    "上品",
    "幾何学の二重アーチと中央揃えの上品な見出し。",
    "night",
    "stepped-arch/center-title/gold-rule/twin-ledgers",
    "演奏会・夜の催し",
  ),
  template(
    "serif",
    "エレガントセリフ",
    "上品",
    "細い飾り罫と左に広く取ったタイポグラフィ。",
    "autumn",
    "thin-rules/left-title/right-date/unequal-columns",
    "朗読・展示・案内状",
  ),
  template(
    "information",
    "インフォメーション",
    "実用",
    "日時と会場を上にまとめ、白地で読みやすく。",
    "mono",
    "utility-header/full-facts/twin-table/dual-footer",
    "講座・自治会・お知らせ",
  ),
];
export const legacyTemplate: Template = {
  id: "legacy",
  label: "旧版 / 生音 A4",
  family: "旧版",
  description:
    "丸いカードと大きな日付。これまで使っていたA4のデザインをそのまま選べます。",
  palette: "summer",
  compositionSignature:
    "legacy-rounded-date/header/timetable-left/openmic-right",
  recommended: "従来のイベントチラシ",
  supportedSizes: ["a4"],
};
export const allTemplates = [legacyTemplate, ...templates];
export const templateById = (id: string) =>
  allTemplates.find((t) => t.id === id) ?? templates[19];
export const paletteById = (id: string) =>
  palettes.find((p) => p.id === id) ?? palettes[0];
export const capabilityMatrix = {
  text: { screen: "tested", png: "tested", print: "tested" },
  geometry: { screen: "tested", png: "tested", print: "tested" },
  imageCrop: { screen: "tested", png: "tested", print: "tested" },
  grainAndHalftone: { screen: "tested", png: "tested", print: "tested" },
  legacyDom: { screen: "tested", png: "approximation", print: "tested" },
} as const;
