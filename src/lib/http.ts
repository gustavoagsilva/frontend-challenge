import axios from "axios";
import type { ApiError } from "@/domain/models";
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
});
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("kurio:token");
  if (token) config.headers.Authorization = "Bearer " + token;
  let guest = localStorage.getItem("kurio:guest");
  if (!guest) {
    guest = crypto.randomUUID();
    localStorage.setItem("kurio:guest", guest);
  }
  config.headers["X-Guest-Id"] = guest;
  return config;
});
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/session") &&
      error.config?.headers?.Authorization ===
        "Bearer " + localStorage.getItem("kurio:token")
    )
      window.dispatchEvent(new Event("kurio:session-expired"));
    return Promise.reject(error);
  },
);
export function apiError(error: unknown): ApiError {
  return axios.isAxiosError<ApiError>(error)
    ? (error.response?.data ?? {
        message: "Falha de conexão. Tente novamente.",
      })
    : {
        message:
          error instanceof Error ? error.message : "Não foi possível concluir.",
      };
}
