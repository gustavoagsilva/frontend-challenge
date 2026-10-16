export const collections = ['Kurio Apes', 'Nomads', 'Golden Club', 'Genesis'] as const
export const networks = ['Ethereum', 'Polygon', 'Solana'] as const
export type CatalogSearch = { q: string; collection: string; network: string; min: string; max: string; sort: 'featured' | 'price-asc' | 'price-desc' | 'newest'; tab: 'all' | 'new' | 'trending'; page: number }
export const defaultSearch: CatalogSearch = { q: '', collection: '', network: '', min: '', max: '', sort: 'featured', tab: 'all', page: 1 }
export function validateSearch(raw: Record<string, unknown>): CatalogSearch {
  const text = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 100) : ''
  const price = (v: unknown) => /^\d{1,6}(\.\d{1,18})?$/.test(String(v ?? '')) ? String(v) : ''
  return { q: text(raw.q), collection: collections.includes(raw.collection as typeof collections[number]) ? String(raw.collection) : '', network: networks.includes(raw.network as typeof networks[number]) ? String(raw.network) : '', min: price(raw.min), max: price(raw.max), sort: ['price-asc', 'price-desc', 'newest'].includes(String(raw.sort)) ? raw.sort as CatalogSearch['sort'] : 'featured', tab: ['new', 'trending'].includes(String(raw.tab)) ? raw.tab as CatalogSearch['tab'] : 'all', page: Math.max(1, Math.min(10000, Math.floor(Number(raw.page)) || 1)) }
}
export type Nft = { id: string; name: string; image: string; collection: string; network: string; price: string; edition: string; available: number; badge: string; createdAt: string; popularity: number; version: number }
export type CatalogResponse = { items: Nft[]; total: number; page: number; pages: number; pageSize: number }
export type DiscoveryResponse = { featured: Nft[]; collections: { name: string; count: number }[] }
export function ethUnits(value: string): bigint { const [whole, fraction = ''] = value.split('.'); return BigInt(whole || '0') * 10n ** 18n + BigInt(fraction.padEnd(18, '0')) }
export function formatEth(value: string) { const [whole, fraction = ''] = value.split('.'); return `${whole}.${fraction.replace(/0+$/, '').padEnd(2, '0')} ETH` }
