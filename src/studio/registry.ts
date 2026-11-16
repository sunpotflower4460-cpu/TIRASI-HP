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
    "白抜きの巨大文字、切り貼りした音の波形と出演表。",
    "mono",
    "cut-type-left/sound-strip/right-ticket/stacked-acts",
    "ライブ・バンド告知",
  ),
  template(
    "citypop",
    "シティポップ",
    "80年代",
    "ヤシの影と夕暮れの海。明朝と欧文セリフの余韻。",
    "city",
    "palm-sunset-right/mincho-left/rule-facts/quiet-ledgers",
    "ライブ・ショップ",
  ),
  template(
    "neon",
    "ネオンステージ",
    "80年代",
    "舞台のマイクと光のリボン。夜に浮かぶ大きな題名。",
    "neon",
    "stage-mic/right-light-ribbons/glowing-type/twin-ledgers",
    "夜のライブ・パーティー",
  ),
  template(
    "riso",
    "リソグラフ",
    "80年代",
    "朱と藍の刷り版、細かな網点、余白のある太い文字。",
    "riso",
    "riso-plates-left/type-and-facts-right/reversed-ledgers",
    "ライブ・展示",
  ),
  template(
    "acoustic",
    "アコースティック",
    "音楽",
    "弦まで描いたギターと明朝。音楽をゆっくり読む紙面。",
    "forest",
    "guitar-left/mincho-right/left-notes/right-program",
    "弾き語り・カフェ",
  ),
  template(
    "indie",
    "インディーギグ",
    "音楽",
    "コバルトの放射形と切り紙、勢いのある斜体。",
    "cobalt",
    "cut-starburst-right/italic-type-left/band-facts/stacked-acts",
    "ライブ・作品発表",
  ),
  template(
    "festival",
    "フェス・ラインナップ",
    "音楽",
    "陽光と波の絵、広く使った二列のラインナップ。",
    "summer",
    "sun-waves-right/hero-left/two-column-lineup/bottom-info",
    "出演者の多いイベント",
  ),
  template(
    "botanical",
    "ボタニカル",
    "自然",
    "葉脈まで描いた植物画と、静かな明朝の題名。",
    "forest",
    "botanical-drawing-left/mincho-right/leaf-veins/open-columns",
    "講座・マルシェ",
  ),
  template(
    "forest",
    "フォレストフォーク",
    "自然",
    "重なる山と針葉樹の木版画。クラフト紙の案内。",
    "forest",
    "woodcut-forest-right/serif-left/left-info/right-program",
    "野外イベント・手仕事",
  ),
  template(
    "watercolor",
    "水彩の便り",
    "自然",
    "色を重ねて咲かせた水彩の花と柔らかな文字。",
    "spring",
    "watercolor-flowers/right-blooms/rounded-type/open-ledgers",
    "ワークショップ・教室",
  ),
  template(
    "swiss",
    "スイスグリッド",
    "モダン",
    "開催日の数字を大胆に。軸と罫線で整える文字組み。",
    "cobalt",
    "actual-day-left/cobalt-grid/oversized-type/dual-program",
    "セミナー・展示",
  ),
  template(
    "gallery",
    "ミニマルギャラリー",
    "モダン",
    "彫刻のようなアーチと大きな余白。写真にも。",
    "mono",
    "sculptural-arch-right/open-serif-left/quiet-facts/columns",
    "写真展・作品展",
  ),
  template(
    "magazine",
    "マガジンカバー",
    "モダン",
    "大きな作品枠、印象的なマストヘッドと記事の段組。",
    "plum",
    "serif-masthead/art-left/program-right/full-deck",
    "新商品・展示・人物紹介",
  ),
  template(
    "showa",
    "昭和ポップ",
    "和風",
    "刷り色の太陽と愛嬌のある丸い大文字、切符の日付。",
    "riso",
    "radiant-sun-right/rounded-display/ticket-band/open-ledgers",
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
    "花形のシールと重なる紙。レモンと深緑の楽しさ。",
    "citrus",
    "diecut-flower-right/rounded-type/full-band/offset-ledgers",
    "ショップ・フリマ",
  ),
  template(
    "party",
    "手描きパーティー",
    "ポップ",
    "揺れる風船と紙片。大きな題名で迎える招待状。",
    "spring",
    "drawn-balloons-right/invitation-type/open-program",
    "交流会・親子イベント",
  ),
  template(
    "deco",
    "アールデコ・ナイト",
    "上品",
    "金線の扇とアーチ、左右対称の静かな明朝。",
    "night",
    "gold-fan-corners/center-serif/rule-facts/twin-ledgers",
    "演奏会・夜の催し",
  ),
  template(
    "serif",
    "エレガントセリフ",
    "上品",
    "一輪の花の線画とセリフ。余白を楽しむ案内状。",
    "autumn",
    "etched-flower-right/serif-left/open-facts/unequal-columns",
    "朗読・展示・案内状",
  ),
  template(
    "information",
    "インフォメーション",
    "実用",
    "大きな日付と明確な見出し。必要な情報がすぐ分かる。",
    "mono",
    "date-monument-right/utility-title/twin-table/dual-footer",
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
