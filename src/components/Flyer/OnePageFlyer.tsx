import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { getThemeClassName } from "../../data/themes";
import type { EventData, ScheduleItem } from "../../types/event";
import "../../styles/one-page-flyer.css";

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

function createExportClone(sheet: HTMLElement, themeClassName: string) {
  const stage = document.createElement("div");
  stage.className = `one-page-export-stage ${themeClassName}`;

  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.classList.add("exporting-for-image", "export-image-copy");

  stage.appendChild(clone);
  document.body.appendChild(stage);

  return { stage, clone };
}

function makePngFileName(eventData: EventData) {
  const safeTitle = `${eventData.title}-${eventData.subtitle}-${eventData.volume}`
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .toLowerCase();
  return `${safeTitle || "event-flyer"}.png`;
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

async function shareOrOpenPng(blob: Blob, eventData: EventData, setNotice: (message: string) => void) {
  const fileName = makePngFileName(eventData);
  const file = new File([blob], fileName, { type: "image/png" });
  const shareData: ShareFileData = {
    files: [file],
    title: `${eventData.title} ${eventData.subtitle} ${eventData.volume}`,
    text: "A4チラシPNG"
  };
  const nav = navigator as NavigatorWithFileShare;

  if (nav.canShare?.(shareData) && nav.share) {
    try {
      await nav.share(shareData);
      setNotice("共有画面を開きました。写真に保存、またはファイルに保存を選んでください。");
      return;
    } catch {
      setNotice("共有を開けなかったため、PNG表示/保存に切り替えます。");
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
  const themeClassName = getThemeClassName(eventData.themeId);

  const handlePrint = () => {
    setNotice("印刷画面を開きます。反応しない場合は、共有ボタンからSafari/ブラウザで開いてPDF保存してください。");
    onPrint();
  };

  const handlePngExport = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let stage: HTMLDivElement | null = null;

    try {
      setNotice("PNGを書き出しています。共有画面が開くまで少しお待ちください。");
      await document.fonts?.ready;

      const exportClone = createExportClone(sheet, themeClassName);
      stage = exportClone.stage;
      await waitForFrame();

      const canvas = await withTimeout(
        html2canvas(exportClone.clone, {
          backgroundColor: null,
          scale: 3,
          useCORS: true,
          logging: false,
          windowWidth: exportClone.clone.scrollWidth,
          windowHeight: exportClone.clone.scrollHeight
        }),
        20000
      );

      stage.remove();
      stage = null;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setNotice("PNG書き出しに失敗しました。スクリーンショット保存をお試しください。");
          return;
        }

        try {
          await shareOrOpenPng(blob, eventData, setNotice);
        } catch {
          setNotice("共有処理中にエラーが発生しました。Safariで開くか、スクリーンショット保存をお試しください。");
        }
      }, "image/png");
    } catch {
      stage?.remove();
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
