import { describe, expect, it } from "vitest";
import { initialWorkspace, parseWorkspace } from "../../src/domain/workspace";
import type { Workspace } from "../../src/domain/workspace";
import { MAX_EVENTS } from "../../src/domain/limits";
import { eventForDocument } from "../../src/studio/document";
import type { CreativeDocument } from "../../src/studio/document";
import { liveManagementName } from "../../src/studio/live";
import {
  automaticChoice,
  createLiveFlyer,
  detachLiveFlyer,
  liveSources,
  sharedFlyers,
} from "../../src/studio/liveCreate";

let n = 0;
const ids = () => ({ eventId: `event-${++n}`, documentId: `doc-${n}`, now: new Date(2026, 10, 25, 0, n).toISOString() });
type Live = Extract<CreativeDocument, { kind: "event-flyer" }>;
const live = (workspace: Workspace, index: number) => workspace.documents[index] as Live;
const retitle = (workspace: Workspace, eventId: string, title: string): Workspace => ({
  ...workspace,
  events: workspace.events.map((event) => (event.id === eventId ? { ...event, eventData: { ...event.eventData, title } } : event)),
});
const one = () => createLiveFlyer(initialWorkspace(), { kind: "new" }, ids());

describe("separate or shared live flyers", () => {
  it("uses the starting event for the very first flyer", () => {
    const first = one();
    expect(first.events).toHaveLength(1);
    expect(live(first, 0).eventId).toBe(first.events[0].id);
    expect(liveSources(first)).toMatchObject([{ count: 1 }]);
  });

  it("makes a new live that starts from the latest entries and then changes on its own", () => {
    let workspace = retitle(one(), "default-event", "春のライブ");
    workspace = createLiveFlyer(workspace, { kind: "new" }, ids());
    const [a, b] = [live(workspace, 0), live(workspace, 1)];
    expect(b.eventId).not.toBe(a.eventId);
    expect(eventForDocument(b, workspace.events).title).toBe("春のライブ");
    expect(sharedFlyers(workspace, b.id)).toEqual([]);
    expect(b.name).not.toBe(a.name);
    workspace = retitle(workspace, b.eventId, "夏のライブ");
    expect(eventForDocument(a, workspace.events).title).toBe("春のライブ");
    expect(liveSources(workspace)).toHaveLength(2);
    expect(() => parseWorkspace(workspace)).not.toThrow();
  });

  it("makes another design of the same live when asked, edited together", () => {
    let workspace = one();
    workspace = createLiveFlyer(workspace, { kind: "share", eventId: live(workspace, 0).eventId }, { ...ids(), templateId: "acoustic" });
    const [a, b] = [live(workspace, 0), live(workspace, 1)];
    expect(b.eventId).toBe(a.eventId);
    expect(b.design).toMatchObject({ templateId: "acoustic", paletteId: "autumn" });
    expect(sharedFlyers(workspace, a.id).map((doc) => doc.id)).toEqual([b.id]);
    expect(liveSources(workspace)).toMatchObject([{ count: 2 }]);
    workspace = retitle(workspace, a.eventId, "合同ライブ");
    expect(eventForDocument(b, workspace.events).title).toBe("合同ライブ");
  });

  it("separates one shared flyer without touching the others", () => {
    let workspace = one();
    workspace = createLiveFlyer(workspace, { kind: "share", eventId: live(workspace, 0).eventId }, ids());
    const before = live(workspace, 0);
    const originalTitle = eventForDocument(before, workspace.events).title;
    workspace = detachLiveFlyer(workspace, live(workspace, 1).id, ids());
    expect(live(workspace, 1).eventId).not.toBe(before.eventId);
    expect(sharedFlyers(workspace, before.id)).toEqual([]);
    workspace = retitle(workspace, live(workspace, 1).eventId, "別のライブ");
    expect(eventForDocument(before, workspace.events).title).toBe(originalTitle);
    expect(() => detachLiveFlyer(workspace, "missing", ids())).toThrow();
  });

  it("applies the chosen setting, asking only when told to and when there is something to share", () => {
    const empty = initialWorkspace();
    for (const mode of ["separate", "share", "ask"] as const)
      expect(automaticChoice(mode, empty), mode).toEqual({ kind: "new" });
    const workspace = one();
    expect(automaticChoice("separate", workspace)).toEqual({ kind: "new" });
    expect(automaticChoice("share", workspace)).toEqual({ kind: "share", eventId: live(workspace, 0).eventId });
    expect(automaticChoice("ask", workspace)).toBeUndefined();
  });

  it("keeps a numbered name following the title", () => {
    const doc = { ...live(one(), 0), name: "生音 vol.1 (2)" };
    const before = { ...initialWorkspace().events[0].eventData, title: "生音", volume: "vol.1" };
    expect(liveManagementName(doc, before, { ...before, title: "春" })).toBe("春 vol.1 (2)");
    expect(liveManagementName({ ...doc, name: "自分で付けた名前 (2)" }, before, { ...before, title: "春" })).toBe("自分で付けた名前 (2)");
  });

  it("makes room at the event limit by giving up an event no flyer uses", () => {
    let workspace = one();
    const filler = Array.from({ length: MAX_EVENTS - 1 }, (_, i) => ({ ...workspace.events[0], id: `unused-${i}` }));
    workspace = { ...workspace, events: [...workspace.events, ...filler] };
    const next = createLiveFlyer(workspace, { kind: "new" }, ids());
    expect(next.events).toHaveLength(MAX_EVENTS);
    expect(next.events.some((event) => event.id === "unused-0")).toBe(false);
  });
});
