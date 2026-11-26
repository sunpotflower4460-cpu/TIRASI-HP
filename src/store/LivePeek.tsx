// While colours, sizes and layout are being adjusted, the flyer stays in sight:
// a small live drawing pinned under the app header (phones only; wider screens
// already show the preview beside the controls).
import { useState } from "react";
import type { CreativeDocument } from "../studio/document";
import type { EventRecord } from "../domain/workspace";
import { paletteById, sizes, templateById } from "../studio/registry";
import { DocumentPreview } from "../components/Studio/DocumentPreview";
import "./livePeek.css";

type Props = {
  doc: CreativeDocument;
  events: EventRecord[];
  onOpen: () => void;
};

export function LivePeek({ doc, events, onOpen }: Props) {
  const [large, setLarge] = useState(false);
  return (
    <div className={`live-peek print-hidden${large ? " large" : ""}`}>
      <button type="button" className="live-peek-paper" aria-label="仕上がりを開く" onClick={onOpen}>
        <DocumentPreview document={doc} events={events} thumbnail peek />
      </button>
      <div className="live-peek-side">
        <strong>今の仕上がり</strong>
        {doc.kind !== "image-treatment" && (
          <>
            <small>{templateById(doc.design.templateId).label}</small>
            <small>{paletteById(doc.design.paletteId).label}</small>
          </>
        )}
        <small>{sizes[doc.design.sizeId].label}</small>
        <button type="button" aria-pressed={large} onClick={() => setLarge((value) => !value)}>
          {large ? "小さくする" : "大きくする"}
        </button>
      </div>
    </div>
  );
}
