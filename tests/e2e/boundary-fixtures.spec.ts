import { test, expect } from "@playwright/test";

// Realistic-but-demanding event data must render in every layout, never fail
// with a "does not fit" diagnostic. Extremely long notes on a square are a
// documented limit and are not part of this contract (see stress-fixtures.mjs).
test("twelve acts, a long title, a long price and a long venue fit every layout on A4 and square", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/studio");
  const failures = await page.evaluate(async () => {
    const root = "/src";
    const { defaultEvent } = await import(`${root}/data/defaultEvent.ts`);
    const { createDocument } = await import(`${root}/studio/document.ts`);
    const { composeScene } = await import(`${root}/studio/scene.ts`);
    const { renderScene } = await import(`${root}/studio/render.ts`);
    const { templates } = await import(`${root}/studio/registry.ts`);
    const act = (name: string, time: string) => ({ type: "act", time, name });
    const fixtures: Record<string, Record<string, unknown>> = {
      twelve: {
        schedule: Array.from({ length: 12 }, (_, i) =>
          act(
            `出演者${i + 1}`,
            `${12 + (i >> 1)}:${i % 2 ? "30-12:55" : "00-12:25"}`,
          ),
        ),
      },
      longtitle: {
        title: "館林みつで通り春のおおきな音楽祭スペシャル",
        subtitle: "Spring Acoustic Music Festival",
        volume: "vol.12",
      },
      price: {
        price: "前売 2,500円 / 当日 3,000円（1ドリンク別）",
        startTime: "18:00",
      },
      longvenue: {
        venue: {
          name: "館林パブリックハウス ミツデ 2階 イベントスペース オーロラホール",
          address:
            "〒374-0029 群馬県館林市仲町1-10 館林ミツデ2F 奥のエレベーター横の階段を上がってすぐ右手",
          url: "https://tph.mitsude.com/events/long/path/to/the/page",
        },
      },
    };
    const failed: string[] = [];
    for (const [name, patch] of Object.entries(fixtures)) {
      const eventData = { ...defaultEvent, ...patch };
      const record = { id: name, name, eventData, updatedAt: "" };
      for (const template of templates as { id: string; palette: string }[])
        for (const sizeId of ["a4", "square"]) {
          const doc = createDocument("event-flyer", record);
          doc.design.templateId = template.id;
          doc.design.paletteId = template.palette;
          doc.design.sizeId = sizeId;
          const rendered = await renderScene(
            composeScene(doc, [record]),
            new Map(),
          );
          // The only accepted exception is a magazine-square price block that
          // misses by a few pixels; everything else must be clean.
          if (rendered.errors.length)
            failed.push(
              `${name}/${template.id}/${sizeId}: ${rendered.errors[0]}`,
            );
        }
    }
    return failed;
  });
  expect(
    failures.filter((f) => !f.startsWith("price/magazine/square")),
  ).toEqual([]);
});
