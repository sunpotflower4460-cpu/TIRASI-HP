// The purchase backend. Inside the app it is the small StoreKit 2 plugin in
// ios-store (no server and no third-party service). The browser build has no
// store; during development a fake can be injected for tests.
import { isNativeApp } from "../export/native";

export type StoreProduct = { id: string; title: string; price: string };
export type PurchaseOutcome = "purchased" | "cancelled" | "pending";

export interface StoreBackend {
  products(): Promise<StoreProduct[]>;
  owned(): Promise<string[]>;
  purchase(id: string): Promise<PurchaseOutcome>;
  restore(): Promise<void>;
  /** Calls back when a purchase changes outside the app (family approval, refund...). */
  onChange(callback: () => void): () => void;
}

type NativeStorePlugin = {
  products(options: { ids: string[] }): Promise<{ products: StoreProduct[] }>;
  owned(): Promise<{ ids: string[] }>;
  purchase(options: { id: string }): Promise<{ outcome: PurchaseOutcome }>;
  restore(): Promise<void>;
  addListener(event: "entitlementsChanged", callback: () => void): Promise<{ remove: () => Promise<void> }>;
};

let cached: Promise<StoreBackend | null> | undefined;

async function nativeBackend(ids: string[]): Promise<StoreBackend> {
  const { registerPlugin } = await import("@capacitor/core");
  const plugin = registerPlugin<NativeStorePlugin>("TirasiStore");
  // The plugin proxy is wrapped: returning it from an async function would make
  // JavaScript treat it as a promise and call a missing `then` method.
  return {
    products: async () => (await plugin.products({ ids })).products,
    owned: async () => (await plugin.owned()).ids,
    purchase: async (id) => (await plugin.purchase({ id })).outcome,
    restore: async () => {
      await plugin.restore();
    },
    onChange: (callback) => {
      const handle = plugin.addListener("entitlementsChanged", callback);
      return () => void handle.then((listener) => listener.remove()).catch(() => undefined);
    },
  };
}

export function getStoreBackend(ids: string[]): Promise<StoreBackend | null> {
  if (import.meta.env.DEV) {
    const fake = (globalThis as { __tirasiFakeStore?: StoreBackend }).__tirasiFakeStore;
    if (fake) return Promise.resolve(fake);
  }
  if (!isNativeApp()) return Promise.resolve(null);
  cached ??= nativeBackend(ids);
  return cached;
}
