import { tr } from "../i18n";
export type ThemeOption = {
  id: string;
  label: string;
  description: string;
  className: string;
};

export const themeOptions: ThemeOption[] = [
  {
    id: "spring",
    label: tr("春 / 桜と若葉"),
    description: tr("現在の桜色と若葉色のやわらかいテーマ"),
    className: "theme-spring"
  },
  {
    id: "summer",
    label: tr("夏 / 空と海"),
    description: tr("青とミントを使った爽やかなテーマ"),
    className: "theme-summer"
  },
  {
    id: "autumn",
    label: tr("秋 / 木の実と夕暮れ"),
    description: tr("橙と深い緑を使った落ち着いたテーマ"),
    className: "theme-autumn"
  },
  {
    id: "night",
    label: tr("夜 / ライブハウス"),
    description: tr("濃紺とゴールドを使った夜のテーマ"),
    className: "theme-night"
  }
];

export function getThemeClassName(themeId: string | undefined) {
  return themeOptions.find((theme) => theme.id === themeId)?.className ?? "theme-spring";
}
