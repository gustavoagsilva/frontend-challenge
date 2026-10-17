import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { validateSearch } from "./features/catalog/contracts";
import { HomePage } from "./features/catalog/pages";
import { SiteLayout } from "./components/site-layout";
import { AuthPage } from "./features/account/auth-page";
import { ProfilePage, WalletsPage } from "./features/account/pages";
import { FavoritesPage } from "./features/account/favorites";
import { SessionEffects } from "./features/account/session-effects";
import { queryClient } from "./lib/query-client";
import { sessionQuery, safeReturn } from "./features/account/session";
import { DetailPage } from "./features/commerce/detail-page";
import { CartPage } from "./features/commerce/cart-page";
import { CheckoutPage } from "./features/commerce/checkout-page";
import { OrderPage, OrdersPage } from "./features/commerce/orders-page";
const root = createRootRoute({
  component: () => (
    <>
      <SessionEffects />
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
    <main className="container empty-state">
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
  component: DetailPage,
});
const authSearch = (raw: Record<string, unknown>) => ({
  redirect: safeReturn(raw.redirect),
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: authSearch,
  component: () => <AuthPage />,
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/cadastro",
  validateSearch: authSearch,
  component: () => <AuthPage register />,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/perfil",
  beforeLoad: requireAuth,
  component: ProfilePage,
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/carteiras",
  beforeLoad: requireAuth,
  component: WalletsPage,
});
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favoritos",
  beforeLoad: requireAuth,
  component: FavoritesPage,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/carrinho",
  component: CartPage,
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/pagamento",
  beforeLoad: requireAuth,
  component: CheckoutPage,
});
const orders = createRoute({
  getParentRoute: () => root,
  path: "/pedidos",
  beforeLoad: requireAuth,
  component: OrdersPage,
});
export const orderRoute = createRoute({
  getParentRoute: () => root,
  path: "/pedidos/$orderId",
  beforeLoad: requireAuth,
  component: OrderPage,
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
  ]),
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
