import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
export function SheetViewport({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, element.clientWidth / width)));
    observer.observe(element); return () => observer.disconnect();
  }, [width]);
  return <div className="sheet-viewport" ref={ref} style={{ maxWidth: width }}><div className="sheet-spacer" style={{ height: height * scale }}><div className="sheet-transform" style={{ width, height, transform: `scale(${scale})` }}>{children}</div></div></div>;
}
