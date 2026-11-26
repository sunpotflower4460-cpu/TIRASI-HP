import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { productIds, tierFromPurchases } from "./entitlements";
import type { Requirement, Tier } from "./entitlements";
import { getStoreBackend } from "./store";
import type { StoreBackend, StoreProduct } from "./store";
import { Paywall } from "./Paywall";
import { tr } from "../i18n";

export type PlanValue = {
  /** False in the personal app: nothing is ever locked there. */
  gated: boolean;
  tier: Tier;
  openPaywall: (blocked?: Requirement[]) => void;
};

const PlanContext = createContext<PlanValue>({ gated: false, tier: "full", openPaywall: () => undefined });
export const usePlan = () => useContext(PlanContext);

const allIds = Object.values(productIds);

/** Wraps the store app: reads what has been bought and shows the plan screen. */
export function PlanProvider({ children }: { children: (openPlans: () => void, tier: Tier) => ReactNode }) {
  const [tier, setTier] = useState<Tier>("free");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState<Requirement[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const backend = useRef<StoreBackend | null>(null);

  const refreshOwned = useCallback(async () => {
    if (!backend.current) return undefined;
    const next = tierFromPurchases(await backend.current.owned());
    setTier(next);
    return next;
  }, []);
  const loadProducts = useCallback(async () => {
    if (!backend.current) return;
    try {
      setProducts(await backend.current.products());
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    void getStoreBackend(allIds)
      .then(async (value) => {
        if (cancelled || !value) return;
        backend.current = value;
        stop = value.onChange(() => void refreshOwned().catch(() => undefined));
        await Promise.all([refreshOwned(), loadProducts()]);
      })
      .catch(() => undefined);
    // A purchase can be approved or refunded while the app is in the background.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshOwned().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      stop?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshOwned, loadProducts]);

  const openPaywall = useCallback(
    (items: Requirement[] = []) => {
      setBlocked(items);
      setMessage("");
      setOpen(true);
      if (!products.length) void loadProducts();
    },
    [products.length, loadProducts],
  );

  const buy = async (id: string) => {
    if (!backend.current || busy) return;
    setBusy(true);
    setMessage(tr("App Storeに接続しています…"));
    try {
      const outcome = await backend.current.purchase(id);
      await refreshOwned();
      setMessage(
        outcome === "purchased"
          ? tr("購入ありがとうございます。機能を解放しました。")
          : outcome === "pending"
            ? tr("購入は承認待ちです。承認されると自動で解放されます。")
            : tr("購入をキャンセルしました。"),
      );
    } catch {
      setMessage(tr("購入できませんでした。通信状態を確認して、もう一度お試しください。"));
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!backend.current || busy) return;
    setBusy(true);
    setMessage(tr("購入内容を確認しています…"));
    try {
      await backend.current.restore();
      const next = await refreshOwned();
      setMessage(next && next !== "free" ? tr("購入内容を復元しました。") : tr("復元できる購入はありませんでした。"));
    } catch {
      setMessage(tr("復元できませんでした。通信状態を確認して、もう一度お試しください。"));
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<PlanValue>(() => ({ gated: true, tier, openPaywall }), [tier, openPaywall]);
  return (
    <PlanContext.Provider value={value}>
      {children(() => openPaywall(), tier)}
      {open && (
        <Paywall
          tier={tier}
          products={products}
          blocked={blocked}
          busy={busy}
          message={message}
          onBuy={(id) => void buy(id)}
          onRestore={() => void restore()}
          onClose={() => setOpen(false)}
        />
      )}
    </PlanContext.Provider>
  );
}
