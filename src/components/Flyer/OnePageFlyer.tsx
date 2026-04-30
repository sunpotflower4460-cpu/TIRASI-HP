import { useRef, useState } from "react";
import type { EventData, ScheduleItem } from "../../types/event";
import "../../styles/one-page-flyer.css";

type Html2Canvas = (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type ShareFileData = { files: File[]; title: string; text?: string };
type NavigatorWithFileShare = Navigator & {
  canShare?: (data: ShareFileData) => boolean;
  share?: (data: ShareFileData) => Promise<void>;
};

function nl2br(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  if (item.type === "break") {
    return <div className="one-page-break">☕ {item.label}</div>;
  }

  if (item.type === "end") {
    return <div className="one-page-end">{item.label}</div>;
  }

  return (
    <div className="one-page-schedule-row">
      <span className="one-page-time">{item.time}</span>
      <strong>{item.name}</strong>
    </div>
  );
}

function waitForFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function getHtml2Canvas(): Promise<Html2Canvas> {
  const html2canvasUrl = "https://esm.sh/html2canvas@1.4.1";
  const importFromUrl = new Function("url", "return import(url)") as (url: string) => Promise<{ default?: Html2Canvas }>;
  const module = await importFromUrl(html2canvasUrl);

  if (!module.default) {
    throw new Error("html2canvas is unavailable");
  }

  return module.default;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function shareOrOpenPng(blob: Blob, setNotice: (message: string) => void) {
  const fileName = "namane-acoustic-live-vol5.png";
  const file = new File([blob], fileName, { type: "image/png" });
  const shareData: ShareFileData = {
    files: [file],
    title: "生音 Acoustic Live vol.5",
    text: "A4チラシPNG"
  };
  const nav = navigator as NavigatorWithFileShare;

  if (nav.canShare?.(shareData) && nav.share) {
    try {
      await nav.share(shareData);
      setNotice("共有画面を開きました。写真に保存、またはファイルに保存を選んでください。");
      return;
    } catch {
      setNotice("共有がキャンセルされました。必要ならもう一度PNG保存を押してください。");
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    setNotice("PNGを新しい画面で開きました。長押し保存、または共有から保存してください。");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  downloadBlob(blob, fileName);
  setNotice("PNGを書き出しました。保存先をご確認ください。");
}

export function OnePageFlyer({ eventData, onPrint }: { eventData: EventData; onPrint: () => void }) {
  const [notice, setNotice] = useState("");
  const sheetRef = useRef<HTMLElement | null>(null);

  const handlePrint = () => {
    setNotice("印刷画面を開きます。反応しない場合は、共有ボタンからSafari/ブラウザで開いてPDF保存してください。");
    onPrint();
  };

  const handlePngExport = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    try {
      setNotice("PNGを書き出しています。共有画面が開くまで少しお待ちください。");
      await document.fonts?.ready;

      const html2canvas = await withTimeout(getHtml2Canvas(), 12000);
      sheet.classList.add("exporting-for-image");
      await waitForFrame();

      const canvas = await withTimeout(
        html2canvas(sheet, {
          backgroundColor: "#fff9fa",
          scale: 3,
          useCORS: true,
          logging: false,
          windowWidth: sheet.scrollWidth,
          windowHeight: sheet.scrollHeight
        }),
        20000
      );

      sheet.classList.remove("exporting-for-image");

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setNotice("PNG書き出しに失敗しました。スクリーンショット保存をお試しください。");
          return;
        }

        await shareOrOpenPng(blob, setNotice);
      }, "image/png");
    } catch {
      sheet.classList.remove("exporting-for-image");
      setNotice("このブラウザではPNG書き出しが止まりました。Safariで開いて再試行、またはスクリーンショット保存をお試しください。");
    }
  };

  return (
    <main className="one-page-flyer-page">
      <div className="one-page-toolbar print-hidden">
        <div className="one-page-toolbar-actions">
          <button type="button" onClick={handlePrint}>PDF / 印刷</button>
          <button type="button" className="secondary" onClick={handlePngExport}>PNG保存</button>
        </div>
        {notice ? <p className="one-page-print-notice">{notice}</p> : null}
      </div>

      <article className="one-page-sheet" ref={sheetRef}>
        <header className="one-page-header">
          <p className="one-page-kicker">{eventData.venueSubtitle}</p>
          <div className="one-page-title-row">
            <div>
              <h1>{eventData.title}</h1>
              <p className="one-page-subtitle">{eventData.subtitle} <span>{eventData.volume}</span></p>
            </div>
            <div className="one-page-date">
              <strong>{eventData.date}</strong>
              <span>({eventData.day})</span>
            </div>
          </div>
          <p className="one-page-organizer">{eventData.organizer}</p>
          <div className="one-page-badges">
            <span>{eventData.price}</span>
            <span>Start {eventData.startTime}</span>
          </div>
          <p className="one-page-note">{nl2br(eventData.statusNote)}</p>
        </header>

        <section className="one-page-main-grid">
          <section className="one-page-schedule">
            <h2>Time Schedule</h2>
            <div className="one-page-schedule-list">
              {eventData.schedule.map((item, index) => (
                <ScheduleRow item={item} key={`${item.type}-${index}`} />
              ))}
            </div>
          </section>

          <aside className="one-page-side">
            <section className="one-page-open-mic">
              <h2>{eventData.openMic.title}</h2>
              <strong>{eventData.openMic.time}</strong>
              <p>{eventData.openMic.lastOrder}</p>
              <p className="one-page-open-headline">{eventData.openMic.headline}</p>
              <small>{eventData.openMic.note} / {eventData.openMic.closeNote}</small>
            </section>

            <section className="one-page-access">
              <h2>{eventData.venue.name}</h2>
              <p>{eventData.venue.address}</p>
              <p>{eventData.venue.url.replace("https://", "")}</p>
            </section>
          </aside>
        </section>

        <footer className="one-page-footer">
          {eventData.socials.map((social) => (
            <span key={social.label}>◎ {social.label}</span>
          ))}
        </footer>
      </article>
    </main>
  );
}
