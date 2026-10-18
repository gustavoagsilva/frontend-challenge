import { queryOptions } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type {
  CatalogSearch,
  CatalogResponse,
  DiscoveryResponse,
  Nft,
} from "./contracts";
export const catalogQuery = (search: CatalogSearch) =>
  queryOptions({
    queryKey: ["catalog", search],
    queryFn: async ({ signal }) =>
      (await http.get<CatalogResponse>("/nfts", { params: search, signal }))
        .data,
  });
export const discoveryQuery = queryOptions({
  queryKey: ["discovery"],
  queryFn: async ({ signal }) =>
    (await http.get<DiscoveryResponse>("/discovery", { signal })).data,
});
export const nftQuery = (id: string) =>
  queryOptions({
    queryKey: ["nft", id],
    queryFn: async ({ signal }) =>
      (await http.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
  });
