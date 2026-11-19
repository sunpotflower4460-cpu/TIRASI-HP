import type { ModernTemplateId, Palette } from "./registry";

type Stock = "paper" | "soft" | "ink" | "accent";
type Illustration =
  | "bleed"
  | "arch"
  | "round"
  | "specimen"
  | "torn"
  | "mount"
  | "none";
type Lineup = "bill" | "timeline" | "recital" | "table" | "editorial";

type PosterStyle = { stock: Stock; illustration: Illustration; lineup: Lineup };
export const posterStyles: Record<ModernTemplateId, PosterStyle> = {
  livehouse: { stock: "ink", illustration: "bleed", lineup: "bill" },
  citypop: { stock: "soft", illustration: "bleed", lineup: "timeline" },
  neon: { stock: "paper", illustration: "bleed", lineup: "timeline" },
  riso: { stock: "paper", illustration: "round", lineup: "table" },
  acoustic: { stock: "paper", illustration: "arch", lineup: "recital" },
  indie: { stock: "accent", illustration: "torn", lineup: "bill" },
  festival: { stock: "soft", illustration: "bleed", lineup: "bill" },
  botanical: { stock: "paper", illustration: "specimen", lineup: "recital" },
  forest: { stock: "ink", illustration: "bleed", lineup: "editorial" },
  watercolor: { stock: "paper", illustration: "specimen", lineup: "editorial" },
  swiss: { stock: "paper", illustration: "none", lineup: "table" },
  gallery: { stock: "paper", illustration: "mount", lineup: "editorial" },
  magazine: { stock: "soft", illustration: "bleed", lineup: "editorial" },
  showa: { stock: "accent", illustration: "arch", lineup: "bill" },
  washi: { stock: "paper", illustration: "specimen", lineup: "recital" },
  sticker: { stock: "soft", illustration: "round", lineup: "timeline" },
  party: { stock: "paper", illustration: "round", lineup: "editorial" },
  deco: { stock: "paper", illustration: "none", lineup: "recital" },
  serif: { stock: "paper", illustration: "specimen", lineup: "recital" },
  information: { stock: "paper", illustration: "none", lineup: "table" },
};

export function stockInks(palette: Palette, stock: Stock) {
  switch (stock) {
    case "ink":
      return { text: palette.paper, accent: palette.soft };
    case "accent":
      return { text: palette.onAccent, accent: palette.onAccent };
    case "soft":
      return { text: palette.ink, accent: palette.ink };
    case "paper":
      return { text: palette.ink, accent: palette.accent };
  }
}
