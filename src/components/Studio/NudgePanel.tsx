// Final fine adjustment: pick one block of the flyer and move it a little.
// The offsets belong to the current size, and undo works as for any other edit.
import { useState } from "react";
import type { CreativeDocument, Placement } from "../../studio/document";
import { tr } from "../../i18n";
import "../../styles/nudge.css";

type Key = "titleX" | "titleY" | "factsX" | "factsY" | "programX" | "programY" | "infoX" | "infoY";
type Part = { id: "title" | "facts" | "program" | "info"; label: string; x: Key; y: Key };

const STEP = 4;
const LIMIT = 100;

function parts(doc: Exclude<CreativeDocument, { kind: "image-treatment" }>): Part[] {
  const live = doc.kind === "event-flyer";
  const part = (id: Part["id"], label: string): Part => ({ id, label, x: `${id}X`, y: `${id}Y` });
  return [
    part("title", tr("タイトル")),
    ...(live || doc.content.facts.trim() ? [part("facts", live ? tr("日付・料金") : tr("日時など"))] : []),
    part("program", live ? tr("出演者") : tr("本文")),
    ...(live || doc.content.blocks.some((block) => block.visible && block.type === "details")
      ? [part("info", tr("会場・詳細"))]
      : []),
  ];
}

type Props = {
  doc: Exclude<CreativeDocument, { kind: "image-treatment" }>;
  placement: Placement;
  onChange: (patch: Partial<Placement>) => void;
};

export function NudgePanel({ doc, placement, onChange }: Props) {
  const [chosen, setChosen] = useState<Part["id"]>("facts");
  const list = parts(doc);
  const part = list.find((value) => value.id === chosen) ?? list[0];
  const x = placement[part.x] ?? 0;
  const y = placement[part.y] ?? 0;
  const move = (dx: number, dy: number) => {
    const limit = (value: number) => Math.min(LIMIT, Math.max(-LIMIT, value));
    onChange({ [part.x]: limit(x + dx * STEP), [part.y]: limit(y + dy * STEP) });
  };
  const arrows: [string, string, number, number, boolean][] = [
    ["↑", tr("上へ"), 0, -1, y <= -LIMIT],
    ["↓", tr("下へ"), 0, 1, y >= LIMIT],
    ["←", tr("左へ"), -1, 0, x <= -LIMIT],
    ["→", tr("右へ"), 1, 0, x >= LIMIT],
  ];
  const position = [
    y ? tr("{0}へ{1}", y < 0 ? tr("上") : tr("下"), Math.abs(y) / STEP) : "",
    x ? tr("{0}へ{1}", x < 0 ? tr("左") : tr("右"), Math.abs(x) / STEP) : "",
  ]
    .filter(Boolean)
    .join(tr("・"));
  return (
    <details
      className="nudge-panel print-hidden"
      onToggle={(event) => {
        // On a phone the open panel sits over the lower page: bring the top of
        // the flyer into view so what is being moved can be seen.
        if (!event.currentTarget.open || !window.matchMedia("(max-width: 760px)").matches) return;
        event.currentTarget.parentElement
          ?.querySelector(".studio-paper")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <summary>{tr("位置を微調整")}</summary>
      <div className="nudge-parts" role="group" aria-label={tr("動かす部分")}>
        {list.map((value) => (
          <button
            key={value.id}
            type="button"
            aria-pressed={value.id === part.id}
            onClick={() => setChosen(value.id)}
          >
            {value.label}
          </button>
        ))}
      </div>
      <div className="nudge-arrows">
        {arrows.map(([symbol, label, dx, dy, disabled]) => (
          <button
            key={label}
            type="button"
            aria-label={tr("{0}を{1}", part.label, label)}
            disabled={disabled}
            onClick={() => move(dx, dy)}
          >
            {symbol}
          </button>
        ))}
        <button
          type="button"
          className="nudge-reset"
          disabled={!x && !y}
          onClick={() => onChange({ [part.x]: 0, [part.y]: 0 })}
        >{tr("元の位置")}</button>
      </div>
      <p className="nudge-note" role="status">
        {position ? tr("{0}：{1}。", part.label, position) : tr("このサイズだけに反映します。")}
      </p>
    </details>
  );
}
