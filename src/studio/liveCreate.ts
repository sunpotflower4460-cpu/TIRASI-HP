// New live flyers in the store app are created on purpose as either
//  - a new live: its own event, started from the latest entries, or
//  - another design of an existing live: the same event, edited together.
import { ValidationError } from "../domain/validation";
import { MAX_EVENTS } from "../domain/limits";
import { eventName, recordFor } from "../domain/workspace";
import type { EventRecord, Workspace } from "../domain/workspace";
import { createDocument, eventForDocument } from "./document";
import type { CreativeDocument } from "./document";
import { templateById } from "./registry";
import type { TemplateId } from "./registry";
import { tr } from "../i18n";

export const MAX_DOCUMENTS = 100;

type LiveDocument = Extract<CreativeDocument, { kind: "event-flyer" }>;
export type LiveChoice = { kind: "new" } | { kind: "share"; eventId: string };
export type LiveSource = { eventId: string; title: string; date: string; count: number; updatedAt: string };

const linked = (workspace: Workspace): LiveDocument[] =>
  workspace.documents.filter(
    (doc): doc is LiveDocument => doc.kind === "event-flyer" && doc.contentBinding === "linked",
  );
const latest = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/** What the create button does for a second live flyer. Chosen in the store app's settings. */
export type NewLiveMode = "separate" | "share" | "ask";

/** The choice to apply without asking, or undefined when the person should be asked. */
export function automaticChoice(mode: NewLiveMode, workspace: Workspace): LiveChoice | undefined {
  const recent = liveSources(workspace)[0];
  // With no earlier live there is nothing to share or to ask about.
  if (mode === "separate" || !recent) return { kind: "new" };
  return mode === "share" ? { kind: "share", eventId: recent.eventId } : undefined;
}

/** The lives that flyers already use, most recently edited first. */
export function liveSources(workspace: Workspace): LiveSource[] {
  const sources = new Map<string, LiveSource>();
  for (const doc of latest(linked(workspace))) {
    const record = workspace.events.find((event) => event.id === doc.eventId);
    if (!record) continue;
    const found = sources.get(record.id);
    if (found) found.count += 1;
    else
      sources.set(record.id, {
        eventId: record.id,
        title: eventName(record.eventData),
        date: record.eventData.date,
        count: 1,
        updatedAt: doc.updatedAt,
      });
  }
  return [...sources.values()];
}

/** Other flyers that change when this flyer's live information is edited. */
export function sharedFlyers(workspace: Workspace, documentId: string): CreativeDocument[] {
  const own = linked(workspace).find((doc) => doc.id === documentId);
  return own ? linked(workspace).filter((doc) => doc.id !== own.id && doc.eventId === own.eventId) : [];
}

/** Makes room for one more event by dropping an event that no flyer refers to. */
function withEvent(workspace: Workspace, record: EventRecord): EventRecord[] {
  if (workspace.events.length < MAX_EVENTS) return [...workspace.events, record];
  const used = new Set(workspace.documents.flatMap((doc) => (doc.kind === "event-flyer" ? [doc.eventId] : [])));
  const unused = workspace.events.find((event) => !used.has(event.id));
  if (!unused)
    throw new ValidationError(tr("ライブは{0}件までです。不要なチラシを削除してから、もう一度お試しください。", MAX_EVENTS));
  return [...workspace.events.filter((event) => event.id !== unused.id), record];
}

/** Two flyers never get the same name, so the picker stays readable. */
function freeName(workspace: Workspace, name: string): string {
  const taken = new Set(workspace.documents.map((doc) => doc.name));
  if (!taken.has(name)) return name;
  for (let n = 2; ; n += 1) {
    const suffix = ` (${n})`;
    const candidate = `${name.slice(0, 500 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function createLiveFlyer(
  workspace: Workspace,
  choice: LiveChoice,
  options: { templateId?: TemplateId; eventId: string; documentId: string; now: string },
): Workspace {
  if (workspace.documents.length >= MAX_DOCUMENTS)
    throw new ValidationError(
      tr("制作物は{0}件まで保存できます。バックアップしてから不要な制作物を削除してください。", MAX_DOCUMENTS),
    );
  const active = workspace.events.find((event) => event.id === workspace.activeEventId) ?? workspace.events[0];
  let events = workspace.events;
  let record: EventRecord;
  if (choice.kind === "share") {
    const found = events.find((event) => event.id === choice.eventId);
    if (!found) throw new ValidationError(tr("選んだライブが見つかりません。"));
    record = found;
  } else if (!workspace.documents.some((doc) => doc.kind === "event-flyer")) {
    // Nothing uses the starting event yet, so there is nothing to separate from.
    record = active;
  } else {
    // Start from what was typed most recently, in an event of its own.
    const recent = latest(
      workspace.documents.filter((doc): doc is LiveDocument => doc.kind === "event-flyer"),
    )[0];
    record = recordFor(eventForDocument(recent, workspace.events), options.eventId);
    events = withEvent(workspace, record);
  }
  const base = createDocument("event-flyer", record);
  const document: CreativeDocument = {
    ...base,
    id: options.documentId,
    name: freeName(workspace, base.name),
    updatedAt: options.now,
    design: options.templateId
      ? { ...base.design, templateId: options.templateId, paletteId: templateById(options.templateId).palette }
      : base.design,
  };
  return {
    ...workspace,
    events,
    activeEventId: record.id,
    documents: [...workspace.documents, document],
    activeDocumentId: document.id,
  };
}

/** Gives a flyer its own copy of the live information, leaving the others as they are. */
export function detachLiveFlyer(
  workspace: Workspace,
  documentId: string,
  options: { eventId: string; now: string },
): Workspace {
  const doc = linked(workspace).find((item) => item.id === documentId);
  if (!doc) throw new ValidationError(tr("このチラシは、ほかと内容を共有していません。"));
  const record = recordFor(eventForDocument(doc, workspace.events), options.eventId);
  return {
    ...workspace,
    events: withEvent(workspace, record),
    activeEventId: record.id,
    documents: workspace.documents.map((item) =>
      item.id === doc.id
        ? { ...doc, eventId: record.id, snapshot: structuredClone(record.eventData), updatedAt: options.now }
        : item,
    ),
  };
}
