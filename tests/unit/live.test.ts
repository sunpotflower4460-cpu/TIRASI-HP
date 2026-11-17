import { describe, expect, it } from "vitest";
import { initialWorkspace, parseWorkspace } from "../../src/domain/workspace";
import {
  createDocument,
  defaultPlacement,
  parseDocument,
} from "../../src/studio/document";
import {
  appendArtistNames,
  artistSuggestions,
  buildTimetable,
  liveDate,
  nextLiveValues,
  nextVolume,
  repeatLiveWorkspace,
} from "../../src/studio/live";
import { restoreHistoryFrame } from "../../src/studio/history";
import { eventWarnings } from "../../src/domain/date";

function fixture() {
  const state = parseWorkspace(initialWorkspace());
  const doc = createDocument("event-flyer", state.events[0]);
  if (doc.kind !== "event-flyer") throw new Error();
  state.documents = [doc];
  state.activeDocumentId = doc.id;
  return { state, doc };
}
const identity = {
  eventId: "next-event",
  documentId: "next-document",
  now: "2026-06-01T12:00:00.000Z",
};

describe("the next live flyer", () => {
  it("suggests an editable next edition while preserving the label style", () => {
    expect(nextVolume("vol.6")).toBe("vol.7");
    expect(nextVolume("第09回")).toBe("第10回");
    expect(nextVolume("2026 / vol.009")).toBe("2026 / vol.010");
    expect(nextVolume("特別編")).toBe("特別編");
    expect(nextVolume("99999999999999999999")).toBe("99999999999999999999");
  });
  it("creates an independent event and document, retaining the design, assets and artist order without changing the original", () => {
    const { state, doc } = fixture();
    doc.assetRefs = ["original-image"];
    doc.design.placements.a4 = { ...defaultPlacement, imageX: 31 };
    state.events[0].eventData = {
      ...state.events[0].eventData,
      extra: { preserve: true },
    } as (typeof state.events)[0]["eventData"];
    const original = structuredClone(state);
    const values = { ...nextLiveValues(doc, state.events), date: "2026-06-13" };
    const next = repeatLiveWorkspace(state, doc.id, values, identity);
    expect(state).toEqual(original);
    expect(next.events).toHaveLength(2);
    expect(next.documents).toHaveLength(2);
    expect(next.events[1].eventData).toMatchObject({
      date: "2026.6/13",
      day: "土",
      volume: "vol.7",
      extra: { preserve: true },
    });
    expect(next.events[1].eventData.schedule).toEqual(
      state.events[0].eventData.schedule,
    );
    expect(next.documents[1]).toMatchObject({
      eventId: identity.eventId,
      contentBinding: "linked",
      design: doc.design,
      assetRefs: ["original-image"],
    });
    expect(parseWorkspace(next)).toEqual(next);
    next.events[1].eventData.schedule[0] = {
      type: "act",
      name: "次の出演者",
      time: "15:00-15:20",
    };
    expect(state.events[0].eventData.schedule[0]).toEqual(
      original.events[0].eventData.schedule[0],
    );
  });
  it("lets an explicit choice start with no lineup while keeping venue and all original data", () => {
    const { state, doc } = fixture();
    const next = repeatLiveWorkspace(
      state,
      doc.id,
      {
        ...nextLiveValues(doc, state.events),
        date: "2026-06-13",
        keepLineup: false,
      },
      identity,
    );
    expect(next.events[1].eventData.schedule).toEqual([]);
    expect(next.events[1].eventData.performers).toEqual([]);
    expect(next.events[1].eventData.venue).toEqual(
      state.events[0].eventData.venue,
    );
    expect(state.events[0].eventData.schedule.length).toBeGreaterThan(0);
  });
  it("copies the frozen content and transfers visible overrides into the new event, including an explicit edition", () => {
    const { state, doc } = fixture();
    doc.contentBinding = "snapshot";
    doc.content.titleOverride = "紙面のタイトル";
    doc.content.subtitleOverride = "Special Live vol.6";
    state.events[0].eventData.title = "後から変更した元イベント";
    const values = nextLiveValues(doc, state.events);
    expect(values).toMatchObject({
      title: "紙面のタイトル",
      subtitle: "Special Live",
      volume: "vol.7",
      date: "",
    });
    const next = repeatLiveWorkspace(
      state,
      doc.id,
      { ...values, date: "2026-06-13" },
      identity,
    );
    expect(next.events[1].eventData).toMatchObject({
      title: "紙面のタイトル",
      subtitle: "Special Live",
      volume: "vol.7",
    });
    expect(
      next.documents[1].kind === "event-flyer" &&
        next.documents[1].content.titleOverride,
    ).toBeUndefined();
    expect(doc.content.titleOverride).toBe("紙面のタイトル");
  });
  it("rejects invalid dates, repeated IDs and either collection limit before adding anything", () => {
    const { state, doc } = fixture(),
      original = structuredClone(state);
    const values = { ...nextLiveValues(doc, state.events), date: "2026-02-30" };
    expect(() => repeatLiveWorkspace(state, doc.id, values, identity)).toThrow(
      "開催日",
    );
    values.date = "2026-06-13";
    expect(() =>
      repeatLiveWorkspace(state, doc.id, values, {
        ...identity,
        documentId: doc.id,
      }),
    ).toThrow("重複");
    for (const capped of [
      {
        ...state,
        events: Array.from({ length: 100 }, (_, i) => ({
          ...state.events[0],
          id: `event-${i}`,
        })),
      },
      {
        ...state,
        documents: Array.from({ length: 100 }, (_, i) => ({
          ...doc,
          id: i ? `doc-${i}` : doc.id,
        })),
      },
    ])
      expect(() =>
        repeatLiveWorkspace(capped, doc.id, values, identity),
      ).toThrow("上限");
    expect(state).toEqual(original);
  });
  it("keeps the date style but calculates the new weekday instead of copying a special old weekday", () => {
    expect(liveDate("2026-06-13", "2026.5/9")).toBe("2026.6/13");
    expect(liveDate("2026-06-13", "2026-05-09")).toBe("2026-06-13");
    expect(liveDate("2026.6/13", "2026.5/9")).toBe("2026.6/13");
    const { state, doc } = fixture();
    state.events[0].eventData.dayOverride = true;
    state.events[0].eventData.day = "祝";
    const next = repeatLiveWorkspace(
      state,
      doc.id,
      { ...nextLiveValues(doc, state.events), date: "2026-06-14" },
      identity,
    );
    expect(next.events[1].eventData).toMatchObject({
      day: "日",
      dayOverride: false,
    });
  });
});
describe("artist entry and timing", () => {
  it("appends a pasted lineup before the ending, retaining existing times and enforcing the save limit", () => {
    const { state } = fixture(),
      schedule = state.events[0].eventData.schedule;
    const next = appendArtistNames(
      schedule,
      " 新しい出演者A\r\n\n新しい出演者B ",
    );
    expect(next.slice(-3)).toEqual([
      { type: "act", name: "新しい出演者A", time: "" },
      { type: "act", name: "新しい出演者B", time: "" },
      schedule[schedule.length - 1],
    ]);
    expect(next[0]).toEqual(schedule[0]);
    expect(() => appendArtistNames(schedule, "名前\n".repeat(100))).toThrow(
      "100件",
    );
  });
  it("assigns times around rest labels, supports an overnight show and leaves names and other content untouched", () => {
    const { state } = fixture(),
      source = state.events[0].eventData.schedule;
    const next = buildTimetable(source, "14:30", 20, 10);
    expect(next[2]).toMatchObject({ time: "15:30-15:50" });
    expect(next[5]).toMatchObject({ time: "16:35-16:55" });
    expect(next[4]).toEqual(source[4]);
    expect(source[2]).toMatchObject({ time: "15:30-15:55" });
    const overnight = buildTimetable(source.slice(0, 3), "23:30", 30, 10);
    expect(overnight[1]).toMatchObject({ time: "00:10-00:40" });
    expect(
      eventWarnings({
        ...state.events[0].eventData,
        schedule: overnight,
      }).filter(
        (warning) => warning.includes("重な") || warning.includes("終了が"),
      ),
    ).toEqual([]);
    expect(() => buildTimetable(source, "14:30", 0, 10)).toThrow("1〜180");
  });
  it("offers existing artists without duplicates or mutation of stored events", () => {
    const { state } = fixture(),
      before = structuredClone(state);
    state.events.push({
      ...structuredClone(state.events[0]),
      id: "repeat-record",
    });
    const names = artistSuggestions(state, state.events[0].eventData);
    expect(names.filter((name) => name === "FP/AD")).toHaveLength(1);
    expect(names).toContain("結城和也");
    expect(state.events[0]).toEqual(before.events[0]);
  });
});
describe("shared live editing", () => {
  it("restores event and document together without touching another event", () => {
    const { state, doc } = fixture(),
      before = structuredClone(state.events[0]);
    state.events.push({ ...structuredClone(before), id: "other" });
    state.events[0].eventData.title = "編集後";
    const restored = restoreHistoryFrame(
      state,
      {
        document: doc,
        event: before,
        expectedEvent: structuredClone(state.events[0]),
      },
      "new-time",
    );
    expect(restored.events[0].eventData.title).toBe("生音");
    expect(restored.events[1]).toEqual(state.events[1]);
    expect(state.events[0].eventData.title).toBe("編集後");
  });
  it("refuses stale shared-event undo instead of overwriting changes made through another flyer", () => {
    const { state, doc } = fixture(),
      before = structuredClone(state.events[0]),
      expected = structuredClone(before);
    expected.eventData.title = "最初の編集";
    state.events[0].eventData.title = "別チラシからの最新編集";
    expect(() =>
      restoreHistoryFrame(
        state,
        { document: doc, event: before, expectedEvent: expected },
        "now",
      ),
    ).toThrow("他のチラシ");
    expect(state.events[0].eventData.title).toBe("別チラシからの最新編集");
  });
  it("defaults new event documents to the old A4, reads earlier visibility settings and validates the optional timing flag", () => {
    const { doc } = fixture();
    expect(doc.design.templateId).toBe("legacy");
    delete doc.design.visibility.times;
    expect(parseDocument(doc)).toEqual(doc);
    expect(() =>
      parseDocument({
        ...doc,
        design: {
          ...doc.design,
          visibility: { ...doc.design.visibility, times: "false" },
        },
      }),
    ).toThrow("真偽");
  });
});
