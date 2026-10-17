import type { ResourceEvent } from '@/domain/models'
type Listener = (name: 'nft.updated' | 'order.updated', event: ResourceEvent) => void
const listeners = new Set<Listener>()
export function subscribe(listener: Listener) { listeners.add(listener); return () => listeners.delete(listener) }
export function publish(name: 'nft.updated' | 'order.updated', event: ResourceEvent) { listeners.forEach(listener => listener(name, event)) }
