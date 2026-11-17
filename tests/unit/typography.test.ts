import { expect, it } from "vitest";
import { balanceHeadline } from "../../src/studio/typography";
const measure = (text: string) => Array.from(text).length;

it("keeps the Japanese phrase after a comma together instead of stranding its first character", () => {
  const lines = balanceHeadline("週末の、よりみち。", 5, measure, [
    "週末の、よ",
    "りみち。",
  ]);
  expect(lines).toEqual(["週末の、", "よりみち。"]);
  expect(lines.join("")).toBe("週末の、よりみち。");
});
it("balances Japanese phrases and Latin words without breaking words or creating punctuation at line starts", () => {
  expect(
    balanceHeadline("まちの音楽会", 4, measure, ["まちの音", "楽会"]),
  ).toEqual(["まちの", "音楽会"]);
  const latin = balanceHeadline("Music for good days", 12, measure, [
    "Music for",
    "good days",
  ]);
  expect(latin).toEqual(["Music for", "good days"]);
  expect(latin.every((line) => measure(line) <= 12)).toBe(true);
});
it("respects explicit newlines, single lines and the safe wrapping path for long input", () => {
  const authored = ["手を動かす、", "週末の時間。"];
  expect(
    balanceHeadline("手を動かす、\n週末の時間。", 8, measure, authored),
  ).toBe(authored);
  expect(balanceHeadline("生音", 8, measure, ["生音"])).toEqual(["生音"]);
  const long = ["長文".repeat(50), "続き"];
  expect(balanceHeadline(long.join(""), 100, measure, long)).toBe(long);
});
it("retains all text when no semantic split fits the measured width", () => {
  const fallback = ["しののめ", "むすび"];
  expect(balanceHeadline("しののめむすび", 4, measure, fallback, true)).toEqual(
    [],
  );
  expect(balanceHeadline("しののめむすび", 4, measure, fallback)).toEqual(
    fallback,
  );
});
