import type { Workspace, EventRecord } from "../domain/workspace";
import type { CreativeDocument } from "./document";
import { ValidationError } from "../domain/validation";

export type HistoryFrame = {
  document: CreativeDocument;
  event?: EventRecord;
  expectedEvent?: EventRecord;
};
export function restoreHistoryFrame(
  state: Workspace,
  frame: HistoryFrame,
  now: string,
): Workspace {
  if (!state.documents.some((doc) => doc.id === frame.document.id))
    throw new ValidationError(
      "このチラシは見つかりません。制作物を選び直してください。",
    );
  if (frame.event) {
    const current = state.events.find((event) => event.id === frame.event!.id);
    if (
      !current ||
      !frame.expectedEvent ||
      current.name !== frame.expectedEvent.name ||
      JSON.stringify(current.eventData) !==
        JSON.stringify(frame.expectedEvent.eventData)
    )
      throw new ValidationError(
        "他のチラシで内容が更新されています。最新の内容を確認して編集してください。",
      );
  }
  return {
    ...state,
    documents: state.documents.map((doc) =>
      doc.id === frame.document.id
        ? { ...structuredClone(frame.document), updatedAt: now }
        : doc,
    ),
    events: frame.event
      ? state.events.map((event) =>
          event.id === frame.event!.id
            ? {
                ...event,
                name: frame.event!.name,
                eventData: structuredClone(frame.event!.eventData),
                updatedAt: now,
              }
            : event,
        )
      : state.events,
  };
}
