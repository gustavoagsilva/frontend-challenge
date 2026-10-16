import { http, HttpResponse, delay } from 'msw'
import { collections, ethUnits, validateSearch } from '@/features/catalog/contracts'
import { nfts } from './fixtures'
// Scenario selection is restricted to the mock layer. No fake data enters UI/hooks.
async function condition(request: Request) {
  const scenario = localStorage.getItem('kurio:scenario') || 'success'
  const q = new URL(request.url).searchParams.get('q') || ''
  await delay(scenario === 'slow' ? 2500 : scenario === 'out-of-order' ? (q.length < 5 ? 1500 : 100) : 180)
  if (scenario === 'offline') return HttpResponse.error()
  if (scenario === 'error') return HttpResponse.json({ message: 'Catálogo temporariamente indisponível.' }, { status: 503 })
  return null
}
export const handlers = [
  http.get('/api/discovery', async ({ request }) => {
    const failure = await condition(request); if (failure) return failure
    return HttpResponse.json({ featured: nfts.slice(0, 3), collections: collections.map(name => ({ name, count: nfts.filter(n => n.collection === name).length })) })
  }),
  http.get('/api/nfts', async ({ request }) => {
    const failure = await condition(request); if (failure) return failure
    const search = validateSearch(Object.fromEntries(new URL(request.url).searchParams))
    let items = localStorage.getItem('kurio:scenario') === 'empty' ? [] : nfts.filter(n =>
      (!search.q || `${n.name} ${n.collection}`.toLowerCase().includes(search.q.toLowerCase())) &&
      (!search.collection || n.collection === search.collection) && (!search.network || n.network === search.network) &&
      (!search.min || ethUnits(n.price) >= ethUnits(search.min)) && (!search.max || ethUnits(n.price) <= ethUnits(search.max)) &&
      (search.tab !== 'new' || n.badge === 'NOVO') && (search.tab !== 'trending' || n.popularity >= 80))
    items = [...items].sort((a, b) => search.sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : search.sort.startsWith('price-') ? (ethUnits(a.price) === ethUnits(b.price) ? 0 : ethUnits(a.price) > ethUnits(b.price) ? 1 : -1) * (search.sort === 'price-desc' ? -1 : 1) : b.popularity - a.popularity)
    const pageSize = 9, pages = Math.max(1, Math.ceil(items.length / pageSize)), page = Math.min(search.page, pages)
    return HttpResponse.json({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pages, pageSize })
  }),
  http.get('/api/nfts/:id', async ({ request, params }) => {
    const failure = await condition(request); if (failure) return failure
    const nft = nfts.find(n => n.id === params.id)
    return nft ? HttpResponse.json(nft) : HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
  }),
  http.post('/api/__mock/reset', () => { localStorage.removeItem('kurio:scenario'); return HttpResponse.json({ reset: true }) }),
]
