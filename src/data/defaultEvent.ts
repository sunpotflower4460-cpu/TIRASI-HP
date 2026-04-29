import type { EventData } from "../types/event";

export const defaultEvent: EventData = {
  themeId: "spring",
  venueSubtitle: "In TATEBAYASHI PUBLIC HOUSE",
  title: "生音",
  subtitle: "Acoustic Live",
  volume: "vol.5",
  date: "2026.4.4",
  day: "土",
  organizer: "企画: しののめむすび × Flower pot studio",
  price: "観覧無料",
  startTime: "15:30",
  statusNote:
    "※しののめむすびはおむすび屋さんとして\n11:00より営業中のためOpen時間の設定はありません",
  schedule: [
    { type: "act", time: "15:30 - 15:55", name: "しののめむすび/ゆふたち" },
    { type: "act", time: "16:05 - 16:30", name: "クリーニングボンバー" },
    { type: "break", label: "休憩 16:30-16:45 (15min)" },
    { type: "act", time: "16:45 - 17:05", name: "FP/AD" },
    { type: "act", time: "17:15 - 17:30", name: "あのおじたす" },
    { type: "act", time: "17:40 - 18:05", name: "結城和也" },
    { type: "end", label: "- 企画終了 -" }
  ],
  performers: [],
  flyerOptions: {
    showPerformerProfiles: false
  },
  openMic: {
    title: "Open Mic",
    time: "企画終了後 - 19:30",
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
