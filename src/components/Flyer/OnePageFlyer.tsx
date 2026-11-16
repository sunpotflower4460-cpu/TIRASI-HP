import { useEffect, useRef, useState } from "react";
import { eventDay } from '../../domain/date';
import { canvasBlob, withTimeout } from '../../export/files';
import { ExportActions } from '../../export/ExportActions';
import { SheetViewport } from './SheetViewport';
import { FlyerPerformerProfiles } from './FlyerPerformerProfiles';
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

const EMPTY_BLOCKS: { id: string; text: string; visible: boolean }[] = [];

export function OnePageFlyer({ eventData, onPrint, thumbnail = false, extraErrors = [], visibility, extraBlocks = EMPTY_BLOCKS }: { eventData: EventData; onPrint: () => void; thumbnail?: boolean; extraErrors?: string[]; visibility?: { schedule: boolean; openMic: boolean; notes: boolean; socials: boolean }; extraBlocks?: { id: string; text: string; visible: boolean }[] }) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const bounds = sheet.getBoundingClientRect();
      const out: string[] = [];
      if (!eventData.title.trim() || !eventData.date.trim() || !eventData.startTime.trim() || !eventData.price.trim() || !eventData.venue.name.trim()) out.push('イベント名・日付・開始時間・料金・会場名を入力してください。');
      if (sheet.scrollHeight > sheet.clientHeight + 2 || sheet.scrollWidth > sheet.clientWidth + 2 || [...sheet.querySelectorAll('p, strong, h1, h2, small, .one-page-time')].some(el => { const box = el.getBoundingClientRect(); return box.right > bounds.right + 1 || box.bottom > bounds.bottom + 1; })) out.push('内容がA4の紙面からはみ出しています。文章を短くするか、出演者紹介を減らしてください。');
      setErrors(out);
    }, 150);
    return () => clearTimeout(timer);
  }, [eventData, visibility, extraBlocks]);
  const generate = async (light: boolean) => {
    const sheet = sheetRef.current;
    if (!sheet) throw new Error('紙面の準備ができていません。');
    await withTimeout(document.fonts.ready);
    const width = light ? 1240 : 2480;
    const height = light ? 1754 : 3508;
    const { default: html2canvas } = await withTimeout(import('html2canvas'));
    const canvas = await withTimeout(html2canvas(sheet, {
      width: 793.7, height: 1122.52, scale: width / 793.7, useCORS: true, logging: false,
      onclone: (_doc, clone) => { clone.style.transform = 'none'; const parent = clone.closest<HTMLElement>('.sheet-transform'); if (parent) parent.style.transform = 'none'; }
    }));
    const output = document.createElement('canvas'); output.width = width; output.height = height;
    output.getContext('2d')!.drawImage(canvas, 0, 0, width, height);
    return canvasBlob(output);
  };
  return (
    <main className="one-page-flyer-page">
      {!thumbnail && <ExportActions generate={generate} source={eventData} name={`${eventData.title}-${eventData.volume}`} errors={[...errors, ...extraErrors]} onPrint={onPrint} />}
      <SheetViewport width={793.7} height={1122.52}>
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
              <span>({eventDay(eventData)})</span>
            </div>
          </div>
          <p className="one-page-organizer">{eventData.organizer}</p>
          <div className="one-page-badges">
            <span>{eventData.price}</span>
            <span>Start {eventData.startTime}</span>
          </div>
          {visibility?.notes !== false && <p className="one-page-note">{nl2br(eventData.statusNote)}</p>}
        </header>

        <section className="one-page-main-grid">
          {visibility?.schedule !== false && <section className="one-page-schedule">
            <h2>Time Schedule</h2>
            <div className="one-page-schedule-list">
              {eventData.schedule.map((item, index) => (
                <ScheduleRow item={item} key={`${item.type}-${index}`} />
              ))}
            </div>
          </section>}

          <aside className="one-page-side">
            {visibility?.openMic !== false && <section className="one-page-open-mic">
              <h2>{eventData.openMic.title}</h2>
              <strong>{eventData.openMic.time}</strong>
              <p>{eventData.openMic.lastOrder}</p>
              <p className="one-page-open-headline">{eventData.openMic.headline}</p>
              <small>{eventData.openMic.note} / {eventData.openMic.closeNote}</small>
            </section>}

            <section className="one-page-access">
              <h2>{eventData.venue.name}</h2>
              <p>{eventData.venue.address}</p>
              <p>{eventData.venue.url.replace("https://", "")}</p>
            </section>
          </aside>
        </section>

        {eventData.flyerOptions.showPerformerProfiles && eventData.performers.length > 0 && <FlyerPerformerProfiles performers={eventData.performers} />}
        {extraBlocks.filter(block => block.visible).length > 0 && <section className="legacy-extra-blocks">{extraBlocks.filter(block => block.visible).map(block => <p key={block.id}>{nl2br(block.text)}</p>)}</section>}
        {visibility?.socials !== false && <footer className="one-page-footer">
          {eventData.socials.map((social) => (
            <span key={social.label}>◎ {social.label}</span>
          ))}
        </footer>}
      </article>
      </SheetViewport>
    </main>
  );
}
