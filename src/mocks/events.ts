import type { ResourceEvent } from "@/domain/models";
type EventName = "nft.updated" | "order.updated";
type Listener = (name: EventName, event: ResourceEvent) => void;
const listeners = new Set<Listener>();
// The mock database is shared by tabs. Deliver the corresponding server events too.
const channel = new BroadcastChannel("kurio:mock-events");
channel.addEventListener(
  "message",
  ({ data }: MessageEvent<{ name: EventName; event: ResourceEvent }>) => {
    if (data?.name === "nft.updated" || data?.name === "order.updated")
      listeners.forEach((listener) => listener(data.name, data.event));
  },
);
export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function publish(name: EventName, event: ResourceEvent) {
  listeners.forEach((listener) => listener(name, event));
  channel.postMessage({ name, event });
}
