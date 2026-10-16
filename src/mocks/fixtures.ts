import { collections, networks, type Nft } from '@/features/catalog/contracts'
const names = ['Emerald Ape', 'Sage Nomad', 'Ivory Baron', 'Violet Nomad', 'Golden Beat', 'Golden Royal']
const prices = ['1.19', '1.69', '3.58', '1.39', '1.98', '0.89']
export const nfts: Nft[] = Array.from({ length: 36 }, (_, i) => ({
  id: `kurio-${String(i + 1).padStart(3, '0')}`, name: `${names[i % 6]} #${String(42 + i * 7).padStart(3, '0')}`,
  image: `/images/nfts/sample-${i % 6 + 1}.svg`, collection: collections[i % 4], network: networks[Math.floor(i / 4) % 3],
  price: prices[i % 6], edition: i % 3 === 0 ? '1/50' : '1/10', available: i === 35 ? 0 : 5 + i,
  badge: i % 7 === 2 ? 'RARO' : i % 5 === 0 ? 'NOVO' : '', createdAt: new Date(Date.UTC(2026, 9, 1 + i % 15)).toISOString(), popularity: 100 - i, version: 1,
}))
