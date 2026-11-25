// A small set of line icons for the store app. Decorative: every button that uses
// one also carries a visible or aria label.
const paths = {
  edit: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm9.5-13.5 4 4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  undo: "M9 7 4 12l5 5M4.5 12H14a5.5 5.5 0 0 1 0 11h-1",
  redo: "m15 7 5 5-5 5m4.5-5H10a5.500 5.500 0 0 0 0 11h1",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
  crown: "M4 18h16M5 15 3.500 6.500l5 4L12 4.500l3.500 6 5-4L19 15H5Z",
  help: "M9.200 9a3 3 0 1 1 4.200 2.700c-.900.500-1.400 1.100-1.400 2.300M12 18h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  text: "M5 6h14M5 11h14M5 16h9",
  image: "M4 5h16v14H4V5Zm0 11 5-5 4 4 3-3 4 4M15.500 9h.01",
  check: "m5 12.500 4.500 4.500L19 7.500",
  mic: "M12 15a3.500 3.500 0 0 0 3.500-3.500v-5a3.500 3.500 0 0 0-7 0v5A3.500 3.500 0 0 0 12 15Zm-6.500-4a6.500 6.500 0 0 0 13 0M12 17.500V21",
  sparkle: "M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800L12 3Zm7 12 .8 2.200L22 18l-2.200.8L19 21l-.8-2.200L16 18l2.200-.8L19 15Z",
  chevron: "m9 6 6 6-6 6",
  sliders: "M4 7h9m4 0h3M4 17h3m4 0h9M15 4.500v5M9 14.500v5",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
