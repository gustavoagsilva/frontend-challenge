import { FavoriteButton } from '@/features/account/favorites'
import { containDialogFocus } from '@/lib/dialog-focus'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { homeRoute } from '@/router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotice } from '@/components/notice-context'
import { catalogQuery, discoveryQuery } from './api'
import { collections, networks, defaultSearch, formatEth, type CatalogSearch, type Nft } from './contracts'

export function NftImage({ nft, eager = false }: { nft: Nft; eager?: boolean }) {
  return <img src={nft.image} alt={nft.name + ', ilustração de colecionável digital'} width="600" height="600" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />
}
export function NftCard({ nft }: { nft: Nft }) {
  return <article className="nft-card" data-testid="nft-card">
    <div className="nft-art"><Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={'Ver ' + nft.name}><NftImage nft={nft} /></Link>{nft.badge && <span className="badge">{nft.badge}</span>}<FavoriteButton id={nft.id} /></div>
    <div className="card-caption"><Link to="/nfts/$nftId" params={{ nftId: nft.id }}>{nft.name}</Link><strong>{formatEth(nft.price)}</strong><span>{nft.network} <span aria-hidden="true">·</span> Edição {nft.edition}</span></div>
  </article>
}
function CatalogSkeleton() { return <div className="nft-grid" role="status" aria-label="Carregando catálogo">{Array.from({ length: 9 }, (_, i) => <div key={i}><Skeleton className="aspect-square w-full" /><Skeleton className="mt-4 h-4 w-3/4" /><Skeleton className="mt-2 mb-6 h-4 w-1/3" /></div>)}</div> }
function ErrorState({ retry }: { retry: () => void }) { return <div className="empty-state" role="alert"><h2>Não foi possível carregar os NFTs.</h2><p>Verifique sua conexão e tente novamente.</p><Button onClick={retry}>Tentar novamente</Button></div> }

export function HomePage() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()
  const catalog = useQuery(catalogQuery(search))
  const discovery = useQuery(discoveryQuery)
  const [queryDraft, setQueryDraft] = useState({ source: search.q, value: search.q })
  const query = queryDraft.source === search.q ? queryDraft.value : search.q
  const setQuery = (value: string) => setQueryDraft({ source: search.q, value })
  const priceSource = search.min + ':' + search.max
  const [priceDraft, setPriceDraft] = useState({ source: priceSource, min: search.min, max: search.max })
  const price = priceDraft.source === priceSource ? { min: priceDraft.min, max: priceDraft.max } : { min: search.min, max: search.max }
  const setPrice = (value: { min: string; max: string }) => setPriceDraft({ ...value, source: priceSource })
  const [priceError, setPriceError] = useState('')
  const [slide, setSlide] = useState(0)
  const filters = useRef<HTMLDialogElement>(null)
  const notice = useNotice()
  useEffect(() => { if (catalog.data && search.page !== catalog.data.page) void navigate({ search: { ...search, page: catalog.data.page }, replace: true, resetScroll: false }) }, [catalog.data, search, navigate])
  function update(patch: Partial<CatalogSearch>) { void navigate({ search: { ...search, ...patch, page: patch.page ?? 1 }, resetScroll: false }) }
  function reset() { void navigate({ search: defaultSearch, resetScroll: false }) }
  function submit(event: FormEvent) { event.preventDefault(); update({ q: query.trim() }) }
  function applyPrice(event: FormEvent) {
    event.preventDefault()
    if (price.min && price.max && Number(price.min) > Number(price.max)) { setPriceError('O preço mínimo deve ser menor ou igual ao máximo.'); return }
    setPriceError(''); update(price)
  }
  const featured = discovery.data?.featured[slide]
  const activeFilters = Boolean(search.q || search.collection || search.network || search.min || search.max || search.tab !== 'all')
  const filterContent = <><div className="filter-heading"><h2>Filtrar NFTs</h2>{activeFilters && <button className="text-link" onClick={reset}>Limpar</button>}</div>
    <fieldset><legend>Coleções</legend><button className={'filter-option ' + (!search.collection ? 'selected' : '')} onClick={() => update({ collection: '' })} aria-pressed={!search.collection}>Todas as coleções <span>{discovery.data?.collections.reduce((sum, c) => sum + c.count, 0) ?? '—'}</span></button>{collections.map(name => <button key={name} aria-pressed={search.collection === name} className={'filter-option ' + (search.collection === name ? 'selected' : '')} onClick={() => update({ collection: search.collection === name ? '' : name })}>{name}<span>{discovery.data?.collections.find(c => c.name === name)?.count ?? '—'}</span></button>)}</fieldset>
    <form onSubmit={applyPrice}><fieldset><legend>Faixa de preço</legend><div className="price-fields"><label>Mín. ETH<input aria-label="Preço mínimo em ETH" type="number" min="0" max="999999" step="any" value={price.min} placeholder="0.00" onChange={e => setPrice({ ...price, min: e.target.value })} /></label><span aria-hidden="true">—</span><label>Máx. ETH<input aria-label="Preço máximo em ETH" type="number" min="0" max="999999" step="any" value={price.max} placeholder="10.00" onChange={e => setPrice({ ...price, max: e.target.value })} /></label></div>{priceError && <p role="alert" className="field-error">{priceError}</p>}<Button size="sm" className="mt-3" type="submit">Aplicar preço</Button></fieldset></form>
    <fieldset><legend>Rede</legend>{networks.map(network => <label className="network-option" key={network}><input type="checkbox" checked={search.network === network} onChange={() => update({ network: search.network === network ? '' : network })} />{network}</label>)}</fieldset>
  </>
  return <main id="main-content" className="container">
    <section className="hero" aria-label="Coleções em destaque">
      <div className="hero-copy"><p className="eyebrow">Bem-vindo à Kurio</p><h1>SEJA DONO DO FUTURO<br />DA ARTE DIGITAL.</h1><p>Descubra NFTs selecionados de criadores do mundo todo.<br className="desktop-only" /> Encontre sua próxima coleção e faça parte dessa história.</p><Button asChild><a href="#catalog">EXPLORAR <ArrowRight /></a></Button></div>
      <div className="hero-visual">{featured ? <Link to="/nfts/$nftId" params={{ nftId: featured.id }} aria-label={'Explorar ' + featured.name}><NftImage nft={featured} eager /></Link> : discovery.isError ? <div className="hero-fallback"><p>Destaques indisponíveis</p><Button variant="outline" onClick={() => discovery.refetch()}>Tentar novamente</Button></div> : <Skeleton className="aspect-square w-full" />}</div>
      <div className="hero-dots" aria-label="Selecionar destaque">{[0, 1, 2].map(i => <button key={i} aria-label={'Destaque ' + (i + 1)} aria-pressed={slide === i} className={slide === i ? 'current' : ''} onClick={() => setSlide(i)} />)}</div>
    </section>

    <section id="catalog" className="catalog-layout" aria-label="Catálogo de NFTs">
      <aside className="desktop-filters"><div className="filter-panel">{filterContent}</div><div className="sidebar-promo"><p>NFT EM DESTAQUE</p><h3>EDIÇÃO LIMITADA</h3>{discovery.data?.featured[1] && <Link to="/nfts/$nftId" params={{ nftId: discovery.data.featured[1].id }}><NftImage nft={discovery.data.featured[1]} /></Link>}</div></aside>
      <div className="catalog-results">
        <div className="catalog-toolbar"><div className="catalog-tabs" aria-label="Categorias do catálogo">{([['all', 'Todos os NFTs'], ['new', 'Novos lançamentos'], ['trending', 'Em alta']] as const).map(([tab, title]) => <button key={tab} aria-pressed={search.tab === tab} className={search.tab === tab ? 'selected' : ''} onClick={() => update({ tab })}>{title}</button>)}</div><label className="sort-control"><span className="sr-only">Ordenar NFTs</span><select aria-label="Ordenar NFTs" value={search.sort} onChange={event => update({ sort: event.target.value as CatalogSearch['sort'] })}><option value="featured">Em destaque</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="newest">Mais recentes</option></select></label></div>
        <div className="search-row"><form role="search" onSubmit={submit}><Search size={17} aria-hidden="true" /><label htmlFor="catalog-search" className="sr-only">Buscar NFTs</label><input id="catalog-search" placeholder="Buscar nome ou coleção..." value={query} onChange={e => setQuery(e.target.value)} /><Button type="submit" size="sm" variant="ghost">Buscar</Button></form><Button className="filter-trigger" variant="outline" aria-label="Abrir filtros" onClick={() => filters.current?.showModal()}><SlidersHorizontal /></Button></div>
        <div className="result-meta"><p role="status" aria-live="polite">{catalog.isPending ? 'Buscando colecionáveis…' : catalog.isError ? 'Catálogo indisponível' : catalog.data.total + ' colecionáveis encontrados'}{catalog.isFetching && !catalog.isPending && ' · Atualizando…'}</p>{activeFilters && <button className="text-link" onClick={reset}>Limpar filtros <X size={12} /></button>}</div>
        {catalog.isPending ? <CatalogSkeleton /> : catalog.isError ? <ErrorState retry={() => catalog.refetch()} /> : !catalog.data.items.length ? <div className="empty-state"><Search size={30} /><h2>Nenhum NFT encontrado</h2><p>Experimente outra busca ou ajuste os filtros.</p><Button onClick={reset}>Limpar filtros</Button></div> : <div className="nft-grid">{catalog.data.items.map(nft => <NftCard nft={nft} key={nft.id} />)}</div>}
        {catalog.data && catalog.data.total > 0 && <nav className="pagination" aria-label="Paginação do catálogo"><Button variant="ghost" size="icon" aria-label="Página anterior" disabled={catalog.data.page <= 1} onClick={() => update({ page: catalog.data.page - 1 })}><ChevronLeft /></Button>{Array.from({ length: catalog.data.pages }, (_, i) => <Button key={i} variant={catalog.data.page === i + 1 ? 'default' : 'ghost'} size="sm" aria-label={'Página ' + (i + 1)} aria-current={catalog.data.page === i + 1 ? 'page' : undefined} onClick={() => update({ page: i + 1 })}>{i + 1}</Button>)}<Button variant="ghost" size="icon" aria-label="Próxima página" disabled={catalog.data.page >= catalog.data.pages} onClick={() => update({ page: catalog.data.page + 1 })}><ChevronRight /></Button></nav>}
      </div>
    </section>

    <section className="promos" aria-label="Explore mais coleções">{[{ title: 'Lançamentos globais,\nedições limitadas.', copy: 'Novos artistas, novas histórias. Descubra o que acaba de chegar.', tab: 'new' as const, index: 0 }, { title: 'Arte digital,\ncolecionáveis únicos.', copy: 'Encontre uma obra que combina com a sua forma de ver o mundo.', tab: 'trending' as const, index: 2 }].map(promo => <article className="promo" key={promo.tab}>{discovery.data?.featured[promo.index] && <NftImage nft={discovery.data.featured[promo.index]} />}<div><h2>{promo.title}</h2><p>{promo.copy}</p><Button size="sm" onClick={() => { update({ tab: promo.tab }); document.getElementById('catalog')?.scrollIntoView() }}>Explorar <ArrowRight /></Button></div></article>)}</section>
    <section className="journal" aria-labelledby="journal-title"><h2 id="journal-title">Diário da Cunhagem</h2><p>Histórias, guias e inspirações para colecionadores e criadores da nova cultura digital.</p><div className="journal-grid">{['Como funciona a propriedade da arte digital?', 'Os artistas digitais que estamos acompanhando', 'Edições, criadores e possibilidades', 'Como proteger seus colecionáveis'].map((title, i) => <article key={title}>{discovery.data?.featured[i % 3] && <NftImage nft={discovery.data.featured[i % 3]} />}<div><span>ARTE & CULTURA · LEITURA</span><h3>{title}</h3><p>Um novo olhar para a criatividade e para o universo dos colecionáveis.</p><button className="text-link" onClick={() => notice('Conteúdo editorial')}>Saiba mais <ArrowRight size={13} /></button></div></article>)}</div></section>
    <dialog onKeyDown={containDialogFocus} ref={filters} className="filter-dialog" aria-label="Filtros do catálogo"><div className="dialog-heading"><h2>Refinar sua busca</h2><Button variant="ghost" size="icon" aria-label="Fechar filtros" onClick={() => filters.current?.close()}><X /></Button></div>{filterContent}<Button className="w-full mt-6" onClick={() => filters.current?.close()}>Ver resultados</Button></dialog>
  </main>
}
