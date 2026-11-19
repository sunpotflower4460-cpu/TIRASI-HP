import { test, expect } from "@playwright/test";

// Realistic-but-demanding event data must render in every layout, never fail
// with a "does not fit" diagnostic, including the square with a full setlist.
test("twelve acts, long notices, titles, prices and venues fit every layout on A4 and square", async ({
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
        schedule: [
          ...Array.from({ length: 12 }, (_, i) =>
            act(
              `出演者${i + 1}`,
              `${12 + (i >> 1)}:${i % 2 ? "30-12:55" : "00-12:25"}`,
            ),
          ),
          { type: "end", label: "- 企画終了 -" },
        ],
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
      longnote: {
        statusNote:
          "※雨天の場合は屋内に会場を変更して開催いたします。\n※駐車場には限りがございますので、公共交通機関でのご来場にご協力ください。\n※飲食物の持ち込みはご遠慮ください。",
        organizer:
          "企画・運営: 館林音楽まつり実行委員会 × しののめむすび × Flower pot studio × 館林市商工会",
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
          if (rendered.errors.length)
            failed.push(
              `${name}/${template.id}/${sizeId}: ${rendered.errors[0]}`,
            );
        }
    }
    return failed;
  });
  expect(failures).toEqual([]);
});

test("free flyers with a long title, a three-line date block and a medium body fit every layout and size", async ({
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
    const { templates, sizes } = await import(`${root}/studio/registry.ts`);
    const record = {
      id: "f",
      name: "f",
      eventData: defaultEvent,
      updatedAt: "",
    };
    const kana = "あいうえおかきくけこさしすせそたちつてと".repeat(13);
    const fixtures: Record<
      string,
      {
        title: string;
        subtitle: string;
        facts: string;
        body: string;
        details: string;
      }
    > = {
      longtitle: {
        title: "週末のよりみちマーケット春の手仕事とコーヒーの小さな祭り",
        subtitle: "Small discoveries, good company",
        facts: "2026.5.9 / 11:00–18:00",
        body: "お気に入りに出会う。",
        details: "まちのアトリエ",
      },
      threelinedate: {
        title: "週末の、よりみち。",
        subtitle: "",
        facts:
          "2026年5月9日（土）11:00〜18:00\n雨天決行・入場無料\nお問い合わせ: info@example.com",
        body: kana.slice(0, 120),
        details: "",
      },
      midbody: {
        title: "週末の、よりみち。",
        subtitle: "Small discoveries, good company.",
        facts: "2026.5.9 / 11:00–18:00",
        body: kana.slice(0, 250),
        details: kana.slice(0, 80),
      },
    };
    const failed: string[] = [];
    for (const [name, fixture] of Object.entries(fixtures))
      for (const template of templates as { id: string; palette: string }[])
        for (const sizeId of Object.keys(sizes)) {
          const doc = createDocument("free-flyer", record);
          doc.content = {
            title: fixture.title,
            subtitle: fixture.subtitle,
            facts: fixture.facts,
            blocks: [
              ...(fixture.body
                ? [{ id: "b", type: "text", visible: true, text: fixture.body }]
                : []),
              ...(fixture.details
                ? [
                    {
                      id: "d",
                      type: "details",
                      visible: true,
                      text: fixture.details,
                    },
                  ]
                : []),
            ],
          };
          doc.design.templateId = template.id;
          doc.design.paletteId = template.palette;
          doc.design.sizeId = sizeId;
          const rendered = await renderScene(
            composeScene(doc, [record]),
            new Map(),
          );
          if (rendered.errors.length)
            failed.push(
              `${name}/${template.id}/${sizeId}: ${rendered.errors[0]}`,
            );
        }
    return failed;
  });
  expect(failures).toEqual([]);
});
