import type { EventData } from "../types/event";

export const defaultEvent: EventData = {
  themeId: "summer",
  venueSubtitle: "In TATEBAYASHI PUBLIC HOUSE",
  title: "生音",
  subtitle: "Acoustic Live",
  volume: "vol.6",
  date: "2026.5/9",
  day: "土",
  organizer: "企画: しののめむすび × Flower pot studio",
  price: "観覧無料",
  startTime: "14:30",
  statusNote:
    "※しののめむすびはおむすび屋さんとして\n11:00より営業中のためOpen時間の設定はありません",
  schedule: [
    { type: "act", time: "14:30-14:50", name: "FP/AD" },
    { type: "act", time: "15:00-15:20", name: "しののめむすび" },
    { type: "act", time: "15:30-15:55", name: "しろう" },
    { type: "act", time: "16:05-16:20", name: "こもれびファイブ" },
    { type: "break", label: "休憩(15分)" },
    { type: "act", time: "16:35-17:00", name: "sugar" },
    { type: "act", time: "17:10-17:35", name: "OK" },
    { type: "act", time: "17:45-18:10", name: "結城和也" },
    { type: "end", label: "- 企画終了 -" }
  ],
  performers: [],
  flyerOptions: {
    showPerformerProfiles: false
  },
  openMic: {
    title: "Open Mic",
    time: "企画終了後 - 19:30(目安)",
    lastOrder: "19:00 ラストオーダー",
    headline: "飛び入り参加大歓迎！",
    note: "※Open micのみ参加の場合はワンオーダーお願いします",
    closeNote: "(20:00 完全撤収)"
  },
  venue: {
    name: "TATEBAYASHI PUBLIC HOUSE",
    address: "〒374-0029 群馬県館林市仲町1-10",
    url: "https://tph.mitsude.com"
  },
  socials: [
    {
      label: "shinonomemusubi",
      url: "https://www.instagram.com/shinonomemusubi"
    },
    {
      label: "flowerpots.art",
      url: "https://www.instagram.com/flowerpots.art"
    }
  ]
};
