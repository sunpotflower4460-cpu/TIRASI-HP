/// <reference types="vite/client" />
// The store app speaks Japanese or English. The Japanese text stays in the
// source and is the key; `en.ts` holds the English. The language is fixed for a
// run, so changing it in the settings reloads the app. The venue's own edition
// is always Japanese.
import { en } from "./en";

export type Language = "ja" | "en";
export type LanguageChoice = Language | "auto";

const KEY = "tirasi-livechirashi:language";

export function readLanguageChoice(): LanguageChoice {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "ja" || value === "en" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function writeLanguageChoice(choice: LanguageChoice): boolean {
  try {
    window.localStorage.setItem(KEY, choice);
    return true;
  } catch {
    return false;
  }
}

/** Japanese for a device set to Japanese, English for every other language. */
export function resolveLanguage(choice: LanguageChoice, preferred: readonly string[]): Language {
  if (choice !== "auto") return choice;
  return (preferred[0] ?? "ja").toLowerCase().startsWith("ja") ? "ja" : "en";
}

export const language: Language =
  import.meta.env?.VITE_EDITION === "store" && typeof window !== "undefined"
    ? resolveLanguage(
        readLanguageChoice(),
        window.navigator.languages?.length ? window.navigator.languages : [window.navigator.language],
      )
    : "ja";

/** `tr("{0}件", count)`: the text in the current language with its values filled in. */
export function tr(source: string, ...values: unknown[]): string {
  const text = language === "en" ? (en[source] ?? source) : source;
  return values.length ? text.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? "")) : text;
}

const japaneseDays = "日月火水木金土";
const englishDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A weekday is stored as one Japanese character; other wording is shown as typed. */
export function displayDay(day: string): string {
  const index = japaneseDays.indexOf(day);
  return language === "en" && day.length === 1 && index >= 0 ? englishDays[index] : day;
}
