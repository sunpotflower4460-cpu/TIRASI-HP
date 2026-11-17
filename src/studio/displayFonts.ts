/// <reference types="vite/client" />
// Headline display faces (OFL-1.1, see public/licenses). Their @font-face
// tables are large, so they are loaded only when a Canvas flyer is rendered
// instead of blocking the first paint of every page.
let pending: Promise<unknown> | undefined;
export function loadDisplayFonts(): Promise<unknown> {
  pending ??= Promise.all([
    import("@fontsource/dela-gothic-one/400.css"),
    import("@fontsource/shippori-mincho-b1/800.css"),
    import("@fontsource/zen-kaku-gothic-new/700.css"),
    import("@fontsource/zen-kaku-gothic-new/900.css"),
    import("@fontsource/rocknroll-one/400.css"),
    import("@fontsource/kaisei-decol/700.css"),
  ]).catch((error) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
