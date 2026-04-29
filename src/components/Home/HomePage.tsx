import type { EventData } from "../../types/event";

export function HomePage({ eventData }: { eventData: EventData }) {
  return <main className="home-page"><h1>{eventData.title}</h1></main>;
}
