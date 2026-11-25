import { highestTier, lockedItems, tierName } from "./entitlements";
import type { CreativeDocument } from "../studio/document";
import { usePlan } from "./PlanContext";
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
      <p>
        お試し表示中です。保存・印刷・共有には<strong>{tierName[highestTier(locks)]}プラン</strong>が必要です（
        {locks.map((item) => item.label).join("、")}）。
      </p>
      <button type="button" onClick={() => plan.openPaywall(locks)}>
        プランを見る
      </button>
    </div>
  ) : null;
  const mark = locks.length ? (
    <div className="trial-mark print-hidden" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <span key={row}>お試し表示</span>
      ))}
    </div>
  ) : null;
  return { locked: locks.length > 0, guard, notice, mark };
}
