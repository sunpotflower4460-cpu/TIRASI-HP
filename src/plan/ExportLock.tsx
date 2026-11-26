import { highestTier, lockedItems, tierName } from "./entitlements";
import type { CreativeDocument } from "../studio/document";
import { usePlan } from "./PlanContext";
import { tr } from "../i18n";
import "../styles/plan.css";

/**
 * What a preview needs when the shown document uses paid parts: a notice, a mark
 * over the preview and a guard that opens the plan screen instead of exporting.
 */
export function useExportLock(doc: CreativeDocument) {
  const plan = usePlan();
  const locks = plan.gated ? lockedItems(doc, plan.tier) : [];
  const guard = () => {
    if (!locks.length) return true;
    plan.openPaywall(locks);
    return false;
  };
  const notice = locks.length ? (
    <div className="lock-notice print-hidden">
      <p>{tr("お試し表示中です。保存・印刷・共有には")}<strong>{tr("{0}プラン", tierName[highestTier(locks)])}</strong>{tr("が必要です（")}{locks.map((item) => item.label).join(tr("、"))}{tr("）。")}</p>
      <button type="button" onClick={() => plan.openPaywall(locks)}>{tr("プランを見る")}</button>
    </div>
  ) : null;
  const mark = locks.length ? (
    <div className="trial-mark print-hidden" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <span key={row}>{tr("お試し表示")}</span>
      ))}
    </div>
  ) : null;
  return { locked: locks.length > 0, guard, notice, mark };
}
