export type ThemeOption = {
  id: string;
  label: string;
  description: string;
  className: string;
};

export const themeOptions: ThemeOption[] = [
  {
    id: "spring",
    label: "春 / 桜と若葉",
    description: "現在の桜色と若葉色のやわらかいテーマ",
    className: "theme-spring"
  },
  {
    id: "summer",
    label: "夏 / 空と海",
    description: "青とミントを使った爽やかなテーマ",
    className: "theme-summer"
  },
  {
    id: "autumn",
    label: "秋 / 木の実と夕暮れ",
    description: "橙と深い緑を使った落ち着いたテーマ",
    className: "theme-autumn"
  },
  {
    id: "night",
    label: "夜 / ライブハウス",
    description: "濃紺とゴールドを使った夜のテーマ",
    className: "theme-night"
  }
];

export function getThemeClassName(themeId: string | undefined) {
  return themeOptions.find((theme) => theme.id === themeId)?.className ?? "theme-spring";
}
