import { useEffect, useRef } from "react";
import { highestTier, planCounts, productIds, tierName, tierRank } from "./entitlements";
import type { Requirement, Tier } from "./entitlements";
import type { StoreProduct } from "./store";
import { Icon } from "../store/Icon";
import "../styles/plan.css";

type Props = {
  tier: Tier;
  products: StoreProduct[];
  blocked: Requirement[];
  busy: boolean;
  message: string;
  onBuy: (id: string) => void;
  onRestore: () => void;
  onClose: () => void;
};

const columns: Tier[] = ["free", "standard", "full"];

export function Paywall({ tier, products, blocked, busy, message, onBuy, onRestore, onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const price = (id: string) => products.find((product) => product.id === id)?.price;
  // Prices always come from the App Store; without them nothing can be bought.
  const buyButton = (id: string, label: string) => (
    <button type="button" className="plan-buy" disabled={busy || !price(id)} onClick={() => onBuy(id)}>
      {price(id) ? (
        <>
          {label}　<b>{price(id)}</b>
        </>
      ) : (
        `${label}（価格を取得できません）`
      )}
    </button>
  );
  const needed = highestTier(blocked);
  const counts = columns.map(planCounts);
  const rows: [string, (string | boolean)[]][] = [
    ["デザイン", counts.map((c) => `${c.designs}`)],
    ["配色", counts.map((c) => `${c.palettes}`)],
    ["サイズ", counts.map((c) => `${c.sizes}`)],
    ["画像加工", counts.map((c) => `${c.effects}`)],
    ["写真保存・PDF・印刷", [true, true, true]],
  ];
  return (
    <div className="plan-backdrop print-hidden" onClick={onClose}>
      <div
        className="plan-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        tabIndex={-1}
        ref={dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="plan-header">
          <h2 id="plan-title">プラン</h2>
          <button type="button" className="plan-close" onClick={onClose}>
            閉じる
          </button>
        </header>
        {blocked.length > 0 && (
          <div className="plan-blocked">
            <p>
              <strong>保存には{tierName[needed]}プランが必要です</strong>
            </p>
            <ul>
              {blocked.map((item) => (
                <li key={item.label}>
                  {item.label}（{tierName[item.tier]}）
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="plan-note">
          <b>買い切り</b>で、毎月の支払いはありません。
        </p>
        <table className="plan-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">内容</span>
              </th>
              {columns.map((column) => (
                <th scope="col" key={column} className={column === tier ? "current" : ""}>
                  {column === "standard" ? "スタン­ダード" : tierName[column]}
                  {column === tier && <span>利用中</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, values]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {values.map((value, index) => (
                  <td key={columns[index]} className={columns[index] === tier ? "current" : ""}>
                    {value === true ? (
                      <>
                        <Icon name="check" size={18} />
                        <span className="visually-hidden">あり</span>
                      </>
                    ) : (
                      value
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="plan-fineprint">各デザインのおすすめ色は、どのプランでも使えます。</p>
        {tier === "full" && <p className="plan-owned">すべての機能が使えます。ありがとうございます。</p>}
        {tier === "free" && (
          <section className="plan-offer best">
            <span className="plan-ribbon">おすすめ</span>
            <h3>フル</h3>
            <p>20デザインすべて・全配色・全加工</p>
            {buyButton(productIds.full, "購入する")}
          </section>
        )}
        {tier === "standard" && (
          <section className="plan-offer best">
            <h3>フルへアップグレード</h3>
            <p>差額だけで、すべて使えるようになります。</p>
            {buyButton(productIds.upgrade, "アップグレード")}
          </section>
        )}
        {tierRank[tier] < tierRank.standard && (
          <section className="plan-offer">
            <h3>スタンダード</h3>
            <p>11デザインと、SNS向けを含む全サイズ</p>
            {buyButton(productIds.standard, "購入する")}
          </section>
        )}
        <p role="status" aria-live="polite" className="plan-message">
          {message}
        </p>
        <button type="button" className="plan-restore" disabled={busy} onClick={onRestore}>
          購入を復元
        </button>
      </div>
    </div>
  );
}
