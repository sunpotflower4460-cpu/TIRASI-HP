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
    "ギターのモノクロ写真と白抜き見出し。日付はミシン目入りの切符に。",
    "mono",
    "film-guitar/knockout-title/perforated-date/stacked-bill",
    "ライブ・バンド告知",
  ),
  template(
    "citypop",
    "シティポップ",
    "80年代",
    "夕暮れの海岸道路を広く刷ったレコードジャケット風の紙面。",
    "city",
    "sunset-panorama/mincho-head/date-rule/timeline",
    "ライブ・ショップ",
  ),
  template(
    "neon",
    "ネオンステージ",
    "80年代",
    "青とピンクの光を受けたマイクと、暗がりに浮かぶ題名。",
    "neon",
    "rim-lit-mic/knockout-glow/date-rule/club-timeline",
    "夜のライブ・パーティー",
  ),
  template(
    "riso",
    "リソグラフ",
    "80年代",
    "朱と藍のターンテーブル。丸く抜いた図版と太い活字を対に。",
    "riso",
    "round-turntable/registration/staggered-type/striped-setlist",
    "ライブ・展示",
  ),
  template(
    "acoustic",
    "アコースティック",
    "音楽",
    "木目と弦の銅版画をアーチ窓に。明朝で組む演奏会のプログラム。",
    "autumn",
    "arched-etching/mincho/left-notes/names-first",
    "弾き語り・カフェ",
  ),
  template(
    "indie",
    "インディーギグ",
    "音楽",
    "コバルトの刷り地に破いたスピーカー写真と斜体の大見出し。",
    "cobalt",
    "torn-speaker/italic-knockout/plain-date/stacked-bill",
    "ライブ・作品発表",
  ),
  template(
    "festival",
    "フェス・ラインナップ",
    "音楽",
    "夏空に広がる野外ステージと日よけの幕。出演者は二列に。",
    "summer",
    "festival-canopy/offset-title/two-column-bill/venue-footer",
    "出演者の多いイベント",
  ),
  template(
    "botanical",
    "ボタニカル",
    "自然",
    "オリーブの枝を標本のように配し、余白に明朝の題名を添えて。",
    "forest",
    "olive-specimen/mincho-title/recital-columns",
    "講座・マルシェ",
  ),
  template(
    "forest",
    "フォレストフォーク",
    "自然",
    "月明かりの杉林を描いた木版画。深い地色に抜いた明朝。",
    "forest",
    "woodblock-landscape/reversed-title/left-info/right-program",
    "野外イベント・手仕事",
  ),
  template(
    "watercolor",
    "水彩の便り",
    "自然",
    "紙色に透けるポピーの水彩と、丸ゴシックで綴る便り。",
    "spring",
    "poppy-wash/paper-ground/round-title/editorial-columns",
    "ワークショップ・教室",
  ),
  template(
    "swiss",
    "スイスグリッド",
    "モダン",
    "大きな日付の色面と太い水平線。整列した活字のグリッド。",
    "cobalt",
    "bleed-date-block/oversized-type/ruled-matrix",
    "セミナー・展示",
  ),
  template(
    "gallery",
    "ミニマルギャラリー",
    "モダン",
    "斜光に浮かぶ石の彫刻。作品の余白を生かした展示案内。",
    "mono",
    "mounted-sculpture/open-serif/catalogue-columns",
    "写真展・作品展",
  ),
  template(
    "magazine",
    "マガジンカバー",
    "モダン",
    "青い花器の静物写真と大きな明朝。雑誌の表紙のような段組。",
    "plum",
    "ceramic-still-life/serif-masthead/date-band/editorial-spread",
    "新商品・展示・人物紹介",
  ),
  template(
    "showa",
    "昭和ポップ",
    "和風",
    "クリームソーダの刷り絵に白抜きの太字。喫茶店の切符を思わせる日付帯。",
    "riso",
    "soda-arch/reversed-display/ticket-band/stacked-bill",
    "地域の催し・セール",
  ),
  template(
    "washi",
    "和紙と墨",
    "和風",
    "筆の円相、紙の繊維、右から読む縦の題名。",
    "mono",
    "enso-left/vertical-title-right/left-facts/twin-ledgers",
    "和の展示・お稽古",
  ),
  template(
    "sticker",
    "ポップステッカー",
    "ポップ",
    "型抜きしたカセットプレーヤーと、レモン色の台紙。",
    "citrus",
    "diecut-cassette/pop-type/full-band/track-list",
    "ショップ・フリマ",
  ),
  template(
    "party",
    "手描きパーティー",
    "ポップ",
    "切り紙の風船とリボン。丸い窓をあしらった招待状。",
    "spring",
    "paper-balloons/oval-window/invitation-type",
    "交流会・親子イベント",
  ),
  template(
    "deco",
    "アールデコ・ナイト",
    "上品",
    "金線の扇とアーチ、左右対称の静かな明朝。",
    "night",
    "radial-gold-fans/center-serif/rule-date/recital",
    "演奏会・夜の催し",
  ),
  template(
    "serif",
    "エレガントセリフ",
    "上品",
    "アイリスの銅版画と繊細な罫。出演者の名前から読む案内状。",
    "autumn",
    "etched-iris/serif-title/names-first/colophon",
    "朗読・展示・案内状",
  ),
  template(
    "information",
    "インフォメーション",
    "実用",
    "日付を掲示板のように際立たせ、出演表と会場を分けた案内。",
    "mono",
    "date-sign-right/utility-head/striped-table/tinted-footer",
    "講座・自治会・お知らせ",
  ),
];
export const legacyTemplate: Template = {
  id: "legacy",
  // No venue name in the store app.
  label: import.meta.env?.VITE_EDITION === "store" ? "旧版 A4" : "旧版 / 生音 A4",
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
