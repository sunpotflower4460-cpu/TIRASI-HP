import { copyFile, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import sharp from "sharp";

const root = "test-results";
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const normal = await readJson("docs/evidence/render-matrix.json");
const photo = await readJson(`${root}/design-polish/photo-layout-report.json`);
const event = await readJson(`${root}/design-final-event/report.json`);
const free = await readJson(`${root}/design-final-free/report.json`);
const before = await readJson(`${root}/design-before-originals/report.json`);
if (
  [...normal.results, ...photo.rows, ...event, ...free, ...before].some(
    (row) => row.errors.length,
  ) ||
  photo.rows.some((row) => row.crossings.length)
)
  throw new Error(
    "Evidence contains failed layouts; correct those before assembling review images.",
  );
if (
  normal.results.length !== 80 ||
  photo.rows.length !== 160 ||
  event.length !== 60 ||
  free.length !== 60 ||
  before.length !== 20 ||
  !photo.movedTitleBlocked ||
  !photo.semanticHeadline?.length ||
  photo.rows.some(
    (row) =>
      !row.imagePresent ||
      JSON.stringify(row.expected) !== JSON.stringify(row.decoded),
  )
)
  throw new Error(
    "Evidence is incomplete; generate all required sizes and fixtures first.",
  );

await copyFile(
  `${root}/design-final-event/contact-square.png`,
  "docs/evidence/designs-square.png",
);
await copyFile(
  `${root}/design-final-event/contact-story.png`,
  "docs/evidence/designs-story.png",
);
await copyFile(
  `${root}/design-final-free/contact-a4.png`,
  "docs/evidence/designs-free.png",
);
for (const id of ["citypop", "botanical"])
  await copyFile(
    `${root}/matrix/${id}-a4.png`,
    `docs/evidence/design-${id}.png`,
  );

const fontfile = createRequire(import.meta.url).resolve(
  "@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2",
);
const label = async (text, size = 22) =>
  sharp({
    text: {
      text,
      font: `Noto Sans JP Thin Bold ${size}`,
      fontfile,
      rgba: true,
    },
  })
    .png()
    .toBuffer();
const selected = [
  ["citypop", "シティポップ"],
  ["acoustic", "アコースティック"],
  ["botanical", "ボタニカル"],
  ["deco", "アールデコ・ナイト"],
];
const tiles = [
  { input: await label("変更前", 28), left: 24, top: 18 },
  { input: await label("変更後", 28), left: 574, top: 18 },
];
for (const [index, [id, name]] of selected.entries()) {
  const top = 78 + index * 770;
  tiles.push({
    input: await sharp(`${root}/design-before-originals/${id}-a4.png`)
      .resize({ width: 500 })
      .png()
      .toBuffer(),
    left: 24,
    top,
  });
  tiles.push({
    input: await sharp(`${root}/design-final-event/${id}-a4.png`)
      .resize({ width: 500 })
      .png()
      .toBuffer(),
    left: 574,
    top,
  });
  tiles.push({ input: await label(name, 17), left: 24, top: top + 721 });
}
await sharp({
  create: { width: 1100, height: 3160, channels: 3, background: "#e9e9e3" },
})
  .composite(tiles)
  .png()
  .toFile("docs/evidence/designs-before-after.png");
await writeFile(
  "docs/evidence/design-polish-summary.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      baseline: "b8d1a11a3fe41d4864beafc15f50d04e016a17d4",
      renderer: normal.renderer,
      normalPngOutputs: normal.results.length,
      imageEventOutputs: photo.rows.filter((row) => row.kind === "event-flyer")
        .length,
      imageFreeOutputs: photo.rows.filter((row) => row.kind === "free-flyer")
        .length,
      measuredTextImageCrossings: photo.rows.reduce(
        (sum, row) => sum + row.crossings.length,
        0,
      ),
      shiftedTitleOverlapBlocked: photo.movedTitleBlocked,
      semanticHeadline: photo.semanticHeadline,
      noImageEventProofs: event.length,
      noImageFreeProofs: free.length,
      smallestNormalText: Math.min(
        ...normal.results.map((row) => row.smallestFontSize),
      ),
      beforeAfter: {
        templates: selected.map(([id]) => id),
        sourceWidth: 1000,
        displayedWidth: 500,
        fixture: "same defaultEvent; recommended palette per template",
      },
      exhaustiveMeasurements:
        "CI artifact: test-results/render-matrix-full.json and test-results/design-polish/photo-layout-report.json",
    },
    null,
    2,
  ) + "\n",
);
console.log("Assembled visual evidence and measured summary.");
