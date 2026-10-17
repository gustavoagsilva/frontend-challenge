import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      retry: (count, error) =>
        count < 1 &&
        !(isAxiosError(error) && error.response && error.response.status < 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
