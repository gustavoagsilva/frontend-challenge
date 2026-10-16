import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { validateSearch } from './features/catalog/contracts'
import { HomePage, DetailPage } from './features/catalog/pages'
import { SiteLayout } from './components/site-layout'
const root = createRootRoute({ component: () => <SiteLayout><Outlet /></SiteLayout>, notFoundComponent: () => <main className="container empty-state"><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></main> })
export const homeRoute = createRoute({ getParentRoute: () => root, path: '/', validateSearch, component: HomePage })
export const detailRoute = createRoute({ getParentRoute: () => root, path: '/nfts/$nftId', component: DetailPage })
export const router = createRouter({ routeTree: root.addChildren([homeRoute, detailRoute]), scrollRestoration: true })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
