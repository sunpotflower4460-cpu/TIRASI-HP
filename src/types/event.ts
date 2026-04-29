export type ScheduleItem =
  | {
      type: "act";
      time: string;
      name: string;
    }
  | {
      type: "break";
      label: string;
    }
  | {
      type: "end";
      label: string;
    };

export type SocialLink = {
  label: string;
  url: string;
};

export type PerformerProfile = {
  id: string;
  name: string;
  catchcopy: string;
  bio: string;
  imageUrl: string;
  linkUrl: string;
};

export type EventData = {
  themeId: string;
  venueSubtitle: string;
  title: string;
  subtitle: string;
  volume: string;
  date: string;
  day: string;
  organizer: string;
  price: string;
  startTime: string;
  statusNote: string;
  schedule: ScheduleItem[];
  performers: PerformerProfile[];
  openMic: {
    title: string;
    time: string;
    lastOrder: string;
    headline: string;
    note: string;
    closeNote: string;
  };
  venue: {
    name: string;
    address: string;
    url: string;
  };
  socials: SocialLink[];
};
