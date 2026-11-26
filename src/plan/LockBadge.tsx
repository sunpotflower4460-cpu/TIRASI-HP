import { tierName, tierRank } from "./entitlements";
import type { Tier } from "./entitlements";
import { usePlan } from "./PlanContext";
import { tr } from "../i18n";

/** A small "🔒 plan" mark on a choice the current plan cannot save yet. */
export function LockBadge({ need }: { need: Tier }) {
  const plan = usePlan();
  if (!plan.gated || tierRank[need] <= tierRank[plan.tier]) return null;
  return <span className="lock-badge">🔒 {tierName[need]}</span>;
}

/** Suffix for <option> labels, which cannot contain elements. */
export function useLockSuffix() {
  const plan = usePlan();
  return (need: Tier) => (plan.gated && tierRank[need] > tierRank[plan.tier] ? tr("（🔒{0}）", tierName[need]) : "");
}

/**
 * Lets pickers show what the person can use first. In the personal app nothing
 * is locked, so lists keep their original order.
 */
export function useAccess() {
  const plan = usePlan();
  const locked = (need: Tier) => plan.gated && tierRank[need] > tierRank[plan.tier];
  return {
    plan,
    locked,
    /** Usable items first, then locked ones; each group keeps its own order. */
    split<T>(items: readonly T[], need: (item: T) => Tier) {
      return {
        usable: items.filter((item) => !locked(need(item))),
        paid: items.filter((item) => locked(need(item))),
      };
    },
    usableFirst<T>(items: readonly T[], need: (item: T) => Tier): T[] {
      return [...items].sort((a, b) => Number(locked(need(a))) - Number(locked(need(b))));
    },
  };
}
