import { useRef, useState } from "react";
import type { EventData, ScheduleItem } from "../../types/event";
import "../../styles/one-page-flyer.css";

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

function copyComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const targetElement = target as HTMLElement;
  targetElement.style.cssText = computed.cssText;

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children[index];
    if (targetChild) copyComputedStyles(sourceChild, targetChild);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
      setNotice("PNGを書き出しています。少しだけお待ちください。");
      await document.fonts?.ready;

      const width = sheet.offsetWidth;
      const height = sheet.offsetHeight;
      const scale = 3;
      const clone = sheet.cloneNode(true) as HTMLElement;
      clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      copyComputedStyles(sheet, clone);
      clone.style.transform = "none";
      clone.style.margin = "0";
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;

      const serialized = new XMLSerializer().serializeToString(clone);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">
          <foreignObject width="${width}" height="${height}">${serialized}</foreignObject>
        </svg>
      `;
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(svgUrl);
          setNotice("PNG書き出しに失敗しました。ブラウザのスクリーンショット保存をお試しください。");
          return;
        }

        context.scale(scale, scale);
        context.drawImage(image, 0, 0);
        URL.revokeObjectURL(svgUrl);
        canvas.toBlob((blob) => {
          if (!blob) {
            setNotice("PNG書き出しに失敗しました。ブラウザのスクリーンショット保存をお試しください。");
            return;
          }

          downloadBlob(blob, "namane-acoustic-live-vol5.png");
          setNotice("PNGを書き出しました。保存先をご確認ください。");
        }, "image/png");
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        setNotice("このブラウザではPNG書き出しができませんでした。Safariで開くか、スクリーンショット保存をお試しください。");
      };

      image.src = svgUrl;
    } catch {
      setNotice("PNG書き出しに失敗しました。Safariで開くか、スクリーンショット保存をお試しください。");
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
