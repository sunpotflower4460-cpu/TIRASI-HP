import type { EventData } from "../types/event";

export type A4FitWarning = {
  id: string;
  message: string;
};

export function getA4FitWarnings(eventData: EventData): A4FitWarning[] {
  const warnings: A4FitWarning[] = [];
  const scheduleCount = eventData.schedule.length;
  const actCount = eventData.schedule.filter((item) => item.type === "act").length;
  const performerCount = eventData.performers.length;
  const showsPerformerProfiles = eventData.flyerOptions.showPerformerProfiles;

  if (scheduleCount >= 8 || actCount >= 7) {
    warnings.push({
      id: "schedule-density",
      message: "スケジュール項目が多いため、A4下部が詰まる可能性があります。"
    });
  }

  if (showsPerformerProfiles && performerCount > 0) {
    warnings.push({
      id: "performer-profiles",
      message: "出演者紹介をA4に表示中です。印刷前に収まりを確認してください。"
    });
  }

  if (showsPerformerProfiles && performerCount > 4) {
    warnings.push({
      id: "performer-limit",
      message: "A4側の出演者紹介は最大4件まで表示されます。"
    });
  }

  return warnings;
}
