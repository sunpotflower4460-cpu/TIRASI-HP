import type { ModernTemplateId, SizeId } from "./registry";

export type Slot = [number, number, number, number];
export type Layout = {
  hero: Slot;
  facts: Slot;
  program: Slot;
  info: Slot;
  art?: Slot;
  align?: "left" | "center";
  titleSize: number;
  factsStyle: "band" | "rule" | "ticket" | "plain" | "date";
};

// Coordinates describe the safe content area, not the page. Artwork and type have
// separate space; no external picture is needed to finish a poster.
export const compositions: Record<ModernTemplateId, Layout> = {
  livehouse: {
    hero: [0, 0.025, 0.53, 0.28],
    facts: [0, 0.35, 1, 0.08],
    art: [0.57, 0, 0.43, 0.32],
    program: [0, 0.46, 0.53, 0.54],
    info: [0.61, 0.46, 0.39, 0.54],
    titleSize: 224,
    factsStyle: "ticket",
  },
  citypop: {
    hero: [0, 0.04, 0.49, 0.3],
    art: [0.54, 0, 0.46, 0.36],
    facts: [0, 0.39, 1, 0.07],
    program: [0, 0.51, 0.51, 0.49],
    info: [0.58, 0.51, 0.42, 0.49],
    titleSize: 188,
    factsStyle: "rule",
  },
  neon: {
    hero: [0, 0.045, 0.54, 0.28],
    art: [0.58, 0, 0.42, 0.35],
    facts: [0.03, 0.39, 0.94, 0.07],
    program: [0, 0.51, 0.52, 0.49],
    info: [0.6, 0.51, 0.4, 0.49],
    titleSize: 206,
    factsStyle: "rule",
  },
  riso: {
    hero: [0.42, 0.04, 0.58, 0.25],
    art: [0, 0, 0.35, 0.42],
    facts: [0.42, 0.32, 0.58, 0.1],
    program: [0.46, 0.49, 0.54, 0.51],
    info: [0, 0.49, 0.38, 0.51],
    titleSize: 196,
    factsStyle: "plain",
  },
  acoustic: {
    hero: [0.43, 0.03, 0.57, 0.29],
    art: [0, 0, 0.35, 0.42],
    facts: [0.43, 0.36, 0.57, 0.1],
    program: [0.48, 0.51, 0.52, 0.49],
    info: [0, 0.51, 0.4, 0.49],
    titleSize: 182,
    factsStyle: "rule",
  },
  indie: {
    hero: [0, 0.04, 0.51, 0.29],
    art: [0.56, 0, 0.44, 0.35],
    facts: [0, 0.39, 1, 0.075],
    program: [0, 0.51, 0.51, 0.49],
    info: [0.59, 0.51, 0.41, 0.49],
    titleSize: 218,
    factsStyle: "plain",
  },
  festival: {
    hero: [0, 0.01, 0.47, 0.23],
    art: [0.53, 0, 0.47, 0.35],
    facts: [0, 0.27, 0.49, 0.085],
    program: [0, 0.4, 1, 0.26],
    info: [0, 0.72, 1, 0.28],
    titleSize: 190,
    factsStyle: "plain",
  },
  botanical: {
    hero: [0.49, 0.04, 0.51, 0.27],
    art: [0, 0, 0.44, 0.4],
    facts: [0.49, 0.34, 0.51, 0.09],
    program: [0, 0.48, 0.52, 0.52],
    info: [0.6, 0.48, 0.4, 0.52],
    titleSize: 172,
    factsStyle: "rule",
  },
  forest: {
    hero: [0, 0.03, 0.43, 0.28],
    art: [0.49, 0, 0.51, 0.4],
    facts: [0, 0.35, 0.43, 0.11],
    program: [0.48, 0.51, 0.52, 0.49],
    info: [0, 0.51, 0.4, 0.49],
    titleSize: 182,
    factsStyle: "plain",
  },
  watercolor: {
    hero: [0, 0.05, 0.53, 0.27],
    art: [0.58, 0, 0.42, 0.37],
    facts: [0, 0.38, 1, 0.08],
    program: [0, 0.51, 0.52, 0.49],
    info: [0.6, 0.51, 0.4, 0.49],
    titleSize: 174,
    factsStyle: "plain",
  },
  swiss: {
    hero: [0.44, 0.01, 0.56, 0.32],
    facts: [0, 0.01, 0.38, 0.32],
    program: [0, 0.43, 1, 0.25],
    info: [0, 0.73, 1, 0.27],
    titleSize: 218,
    factsStyle: "date",
  },
  gallery: {
    hero: [0.03, 0.045, 0.42, 0.31],
    art: [0.53, 0, 0.47, 0.37],
    facts: [0, 0.4, 1, 0.075],
    program: [0, 0.53, 0.5, 0.47],
    info: [0.58, 0.53, 0.42, 0.47],
    titleSize: 172,
    factsStyle: "plain",
  },
  magazine: {
    hero: [0, 0, 1, 0.19],
    art: [0, 0.24, 0.43, 0.34],
    program: [0.5, 0.24, 0.5, 0.34],
    facts: [0, 0.63, 1, 0.065],
    info: [0, 0.735, 1, 0.265],
    titleSize: 194,
    factsStyle: "band",
  },
  showa: {
    hero: [0, 0.03, 0.54, 0.3],
    art: [0.6, 0, 0.4, 0.34],
    facts: [0, 0.39, 1, 0.08],
    program: [0, 0.52, 0.52, 0.48],
    info: [0.6, 0.52, 0.4, 0.48],
    titleSize: 218,
    factsStyle: "ticket",
  },
  washi: {
    hero: [0.71, 0, 0.29, 0.37],
    art: [0, 0, 0.6, 0.28],
    facts: [0, 0.32, 0.63, 0.105],
    program: [0, 0.49, 0.51, 0.51],
    info: [0.59, 0.49, 0.41, 0.51],
    titleSize: 154,
    factsStyle: "plain",
  },
  sticker: {
    hero: [0, 0.03, 0.51, 0.28],
    art: [0.57, 0, 0.43, 0.32],
    facts: [0, 0.36, 1, 0.1],
    program: [0.02, 0.51, 0.5, 0.49],
    info: [0.6, 0.51, 0.4, 0.49],
    titleSize: 198,
    factsStyle: "band",
  },
  party: {
    hero: [0, 0.04, 0.52, 0.27],
    art: [0.58, 0.01, 0.42, 0.34],
    facts: [0, 0.38, 1, 0.08],
    program: [0, 0.51, 0.52, 0.49],
    info: [0.6, 0.51, 0.4, 0.49],
    titleSize: 176,
    factsStyle: "plain",
  },
  deco: {
    hero: [0.12, 0.07, 0.76, 0.27],
    facts: [0.08, 0.39, 0.84, 0.07],
    program: [0, 0.51, 0.51, 0.49],
    info: [0.59, 0.51, 0.41, 0.49],
    align: "center",
    titleSize: 184,
    factsStyle: "rule",
  },
  serif: {
    hero: [0, 0.05, 0.55, 0.28],
    art: [0.61, 0, 0.39, 0.35],
    facts: [0, 0.39, 1, 0.08],
    program: [0, 0.52, 0.52, 0.48],
    info: [0.6, 0.5, 0.4, 0.5],
    titleSize: 184,
    factsStyle: "plain",
  },
  information: {
    hero: [0, 0.02, 0.5, 0.24],
    facts: [0.56, 0.02, 0.44, 0.25],
    program: [0, 0.34, 1, 0.3],
    info: [0, 0.71, 1, 0.29],
    titleSize: 172,
    factsStyle: "date",
  },
};

export function responsiveRecipe(
  id: ModernTemplateId,
  size: SizeId,
  hasImage = false,
): Layout {
  const recipe = structuredClone(compositions[id]);
  // Reserve photo space before size reflow so a square photo cannot push the
  // date or subtitle into the program. Artwork and photographs share one slot.
  if (hasImage && !recipe.art) {
    if (id === "swiss") {
      recipe.hero[2] = 0.34;
      recipe.art = [0.82, 0.01, 0.18, 0.32];
    } else if (id === "information") {
      recipe.hero[2] = 0.34;
      recipe.art = [0.375, 0.02, 0.15, 0.23];
    } else {
      recipe.hero = [0, 0.05, 0.62, 0.29];
      recipe.art = [0.7, 0.01, 0.3, 0.34];
    }
  }
  if (size === "square") {
    for (const slot of [recipe.hero, recipe.facts, recipe.art]) {
      if (slot) {
        slot[1] *= 0.78;
        slot[3] *= 0.78;
      }
    }
    recipe.titleSize *= 0.84;
    if (id === "magazine") {
      recipe.hero = [0, 0, 0.6, 0.25];
      recipe.art = [0.65, 0, 0.35, 0.25];
      recipe.program = [0, 0.38, 1, 0.25];
      recipe.facts = [0, 0.29, 1, 0.065];
      recipe.info = [0, 0.68, 1, 0.32];
    } else if (recipe.program[2] > 0.9) {
      recipe.program = [0, 0.32, 1, 0.27];
      recipe.info = [0, 0.65, 1, 0.35];
    } else {
      recipe.program[1] = 0.37;
      recipe.program[3] = 0.63;
      recipe.info[1] = 0.37;
      recipe.info[3] = 0.63;
      // Slightly wider details, without reversing the composition's reading order.
      if (recipe.info[0] > 0) {
        recipe.info[0] -= 0.025;
        recipe.info[2] += 0.025;
        recipe.program[2] -= 0.025;
      } else {
        recipe.info[2] += 0.025;
        recipe.program[0] += 0.025;
        recipe.program[2] -= 0.025;
      }
    }
  } else if (size === "story") {
    recipe.hero[3] += 0.015;
    if (recipe.art) recipe.art[3] += 0.025;
    if (
      [
        "citypop",
        "festival",
        "gallery",
        "magazine",
        "swiss",
        "information",
        "serif",
      ].includes(id)
    ) {
      // Keep each headline/art relationship; make the lower information easier to
      // scan on a phone instead of turning every template into the same header.
      recipe.program = [0, 0.46, 1, 0.23];
      recipe.info = [0, 0.75, 1, 0.25];
      if (id === "magazine") {
        recipe.hero = [0, 0, 0.63, 0.3];
        recipe.art = [0.7, 0, 0.3, 0.36];
        recipe.facts = [0, 0.39, 1, 0.065];
      }
    } else {
      recipe.program[1] += 0.015;
      recipe.program[3] -= 0.015;
      recipe.info[1] += 0.015;
      recipe.info[3] -= 0.015;
    }
  } else if (size === "portrait") {
    recipe.hero[3] *= 0.94;
    recipe.program[1] -= 0.015;
    recipe.program[3] += 0.015;
    recipe.info[1] -= 0.015;
    recipe.info[3] += 0.015;
  }
  return recipe;
}

/** Event flyers reserve more space for artists and venue than the free-flyer compositions. */
export function liveRecipe(
  id: ModernTemplateId,
  size: SizeId,
  hasImage = false,
): Layout {
  const recipe = responsiveRecipe(id, size, hasImage);
  const square = size === "square";
  const scale = square ? 0.94 : 0.78;
  for (const slot of [recipe.hero, recipe.art])
    if (slot) {
      slot[1] *= scale;
      slot[3] *= scale;
    }
  recipe.facts[1] *= scale;
  if (recipe.facts[3] > 0.15) recipe.facts[3] *= scale;
  recipe.titleSize *= square ? 0.95 : 0.86;
  if (id === "magazine") {
    recipe.hero = [0, 0, 0.53, square ? 0.2 : 0.22];
    recipe.art = [0.57, 0, 0.43, square ? 0.22 : 0.25];
    recipe.facts = [0, square ? 0.26 : 0.29, 1, 0.07];
    recipe.program = [0, square ? 0.37 : 0.4, 1, 0.27];
    recipe.info = [0, square ? 0.69 : 0.73, 1, square ? 0.31 : 0.27];
    return recipe;
  }
  if (id === "swiss" || id === "information") {
    // Carry the date and title almost to the first table rule.
    const bottom = Math.min(
      recipe.program[1] - (square ? 0.04 : 0.08),
      square ? 0.28 : 0.34,
    );
    for (const slot of [recipe.hero, recipe.facts, recipe.art])
      if (slot) slot[3] = Math.max(slot[3], bottom - slot[1]);
  }
  const headerEnd = Math.max(
    ...[recipe.hero, recipe.facts, recipe.art]
      .filter((slot): slot is Slot => !!slot)
      .map((slot) => slot[1] + slot[3]),
  );
  if (recipe.program[2] > 0.9) {
    if (square) recipe.program[3] += 0.02;
    else {
      const start = Math.max(headerEnd + 0.035, recipe.program[1] - 0.05);
      const infoStart = recipe.info[1] - 0.02;
      recipe.program = [
        recipe.program[0],
        start,
        recipe.program[2],
        infoStart - start - 0.04,
      ];
      recipe.info[1] = infoStart;
      recipe.info[3] = 1 - infoStart;
    }
  } else
    for (const slot of [recipe.program, recipe.info]) {
      slot[1] = Math.max(
        headerEnd + (square ? 0.02 : 0.035),
        slot[1] - (square ? 0.02 : 0.08),
      );
      slot[3] = 1 - slot[1];
    }
  return recipe;
}

// Short free-form copy can share a column with the headline, or leave room
// for a panoramic plate. Dense copy keeps the original measured text slots.
export function freePosterLayout(
  recipe: Layout,
  id: ModernTemplateId,
  size: SizeId,
  copy: string,
  details: string,
  facts: string,
  pageHeight: number,
) {
  const square = size === "square";
  const lineDemand = (s: string) =>
    s
      .split("\n")
      .reduce(
        (n, line) =>
          n +
          Math.max(1, Math.ceil(Array.from(line).length / (square ? 12 : 16))),
        0,
      );
  const short =
    lineDemand(copy) <= (square ? 7 : 11) &&
    lineDemand(details) <= (square ? 5 : 8) &&
    !facts.includes("\n");
  if (!short || id === "gallery" || id === "magazine") return;
  if (["citypop", "forest"].includes(id)) {
    const plateH = square ? 0.27 : 0.34;
    recipe.art = [0, 0, 1, plateH];
    recipe.hero = [0, plateH + 0.026, facts ? 0.58 : 1, square ? 0.24 : 0.22];
    recipe.facts = [0.64, plateH + 0.04, 0.36, 0.17];
    const bodyY = plateH + 0.3;
    recipe.program = [0, bodyY, details ? 0.54 : 1, 1 - bodyY];
    recipe.info = [0.6, bodyY, 0.4, 1 - bodyY];
    return;
  }
  if (["botanical", "acoustic", "watercolor", "serif"].includes(id)) {
    const artLeft = id === "botanical" || id === "acoustic";
    const textX = artLeft ? 0.51 : 0;
    const artX = artLeft ? 0 : 0.55;
    const detailH = Math.min(0.4, (lineDemand(details) * 33 + 25) / pageHeight);
    recipe.hero = [textX, 0.025, 0.49, 0.26];
    recipe.facts = [textX, 0.33, 0.49, 0.1];
    recipe.art = [artX, 0.035, 0.45, details ? 0.9 - detailH : 0.9];
    const bodyY = facts ? 0.48 : 0.35;
    recipe.program = [textX, bodyY, 0.49, 1 - bodyY];
    recipe.info = [artX, 1 - detailH, 0.45, detailH];
    return;
  }
  if (["livehouse", "festival"].includes(id)) {
    recipe.hero = [0, 0, 1, 0.19];
    recipe.art = [0, 0.215, 1, square ? 0.2 : 0.29];
    const dateY = recipe.art[1] + recipe.art[3] + 0.02;
    recipe.facts = [0, dateY, 1, 0.09];
    const bodyY = dateY + (facts ? 0.13 : 0.04);
    recipe.program = [0, bodyY, details ? 0.53 : 1, 1 - bodyY];
    recipe.info = [0.6, bodyY, 0.4, 1 - bodyY];
    return;
  }
  // Enlarge the upper composition while reserving actual lines of type below.
  const start = Math.min(recipe.program[1], recipe.info[1]);
  const stacked = recipe.program[2] > 0.9 && details.length > 0;
  const rows = stacked
    ? lineDemand(copy) + lineDemand(details)
    : Math.max(lineDemand(copy), lineDemand(details));
  const target = Math.min(0.77, 1 - (rows * 43 + 42) / pageHeight);
  if (target <= start) return;
  const stretch = target / start;
  for (const slot of [recipe.hero, recipe.art, recipe.facts]) {
    if (slot) {
      slot[1] *= stretch;
      slot[3] *= stretch;
    }
  }
  for (const slot of [recipe.program, recipe.info]) {
    slot[1] = target + ((slot[1] - start) * (1 - target)) / (1 - start);
    slot[3] *= (1 - target) / (1 - start);
  }
}
