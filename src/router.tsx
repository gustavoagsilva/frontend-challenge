import { Realtime } from "./features/commerce/realtime";
import {
  createRootRoute,
  lazyRouteComponent,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { validateSearch } from "./features/catalog/contracts";
import { HomePage } from "./features/catalog/pages";
import { SiteLayout } from "./components/site-layout";
import { SessionEffects } from "./features/account/session-effects";
import { queryClient } from "./lib/query-client";
import { sessionQuery, safeReturn } from "./features/account/session";
const root = createRootRoute({
  component: () => (
    <>
      <SessionEffects />
      <Realtime />
      <SiteLayout>
        <Outlet />
      </SiteLayout>
    </>
  ),
  notFoundComponent: () => (
    <main id="main-content" className="container empty-state">
      <h1>Página não encontrada</h1>
      <a href="/">Voltar ao início</a>
    </main>
  ),
  errorComponent: ({ reset }) => (
    <main id="main-content" className="container empty-state">
      <h1>Não foi possível carregar esta página.</h1>
      <button onClick={reset}>Tentar novamente</button>
    </main>
  ),
});
async function requireAuth({ location }: { location: { href: string } }) {
  const session = await queryClient.fetchQuery({
    ...sessionQuery,
    staleTime: 0,
  });
  if (!session)
    throw redirect({ to: "/login", search: { redirect: location.href } });
}
export const homeRoute = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch,
  component: HomePage,
});
export const detailRoute = createRoute({
  getParentRoute: () => root,
  path: "/nfts/$nftId",
  component: lazyRouteComponent(
    () => import("./features/commerce/detail-page"),
    "DetailPage",
  ),
});
const authSearch = (raw: Record<string, unknown>) => ({
  redirect: safeReturn(raw.redirect),
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: authSearch,
  component: lazyRouteComponent(
    () => import("./features/account/auth-page"),
    "AuthPage",
  ),
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/cadastro",
  validateSearch: authSearch,
  component: lazyRouteComponent(
    () => import("./features/account/auth-page"),
    "RegisterPage",
  ),
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/perfil",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import("./features/account/pages"),
    "ProfilePage",
  ),
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/carteiras",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import("./features/account/pages"),
    "WalletsPage",
  ),
});
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favoritos",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import("./features/account/favorites"),
    "FavoritesPage",
  ),
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/carrinho",
  component: lazyRouteComponent(
    () => import("./features/commerce/cart-page"),
    "CartPage",
  ),
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/pagamento",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import("./features/commerce/checkout-page"),
    "CheckoutPage",
  ),
});
const orders = createRoute({
  getParentRoute: () => root,
  path: "/pedidos",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import("./features/commerce/orders-page"),
    "OrdersPage",
  ),
});
export const orderRoute = createRoute({
  getParentRoute: () => root,
  path: "/pedidos/$orderId",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(
    () => import("./features/commerce/orders-page"),
    "OrderPage",
  ),
});
const demo = createRoute({
  getParentRoute: () => root,
  path: "/demonstracao",
  component: lazyRouteComponent(
    () => import("./features/demo/page"),
    "DemoPage",
  ),
});
export const router = createRouter({
  routeTree: root.addChildren([
    homeRoute,
    detailRoute,
    login,
    register,
    profile,
    wallets,
    favorites,
    cart,
    orders,
    checkout,
    orderRoute,
    demo,
  ]),
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
