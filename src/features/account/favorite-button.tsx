import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useSession } from "./session";
import { http, apiError } from "@/lib/http";
import { useNotice } from "@/components/notice-context";
import { favoritesQuery } from "./api";
export function FavoriteButton({ id }: { id: string }) {
  const { data: session, isPending: sessionPending } = useSession(),
    client = useQueryClient(),
    navigate = useNavigate(),
    notice = useNotice();
  const key = favoritesQuery(session?.user.id || "").queryKey;
  const favorites = useQuery({
    ...favoritesQuery(session?.user.id || ""),
    enabled: !!session,
  });
  const active = favorites.data?.includes(id) || false;
  const mutation = useMutation({
    mutationFn: async (favorite: boolean) =>
      (await http.put<string[]>("/favorites/" + id, { favorite })).data,
    onMutate: async (favorite) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key);
      client.setQueryData<string[]>(key, (old) =>
        favorite
          ? [...new Set([...(old || []), id])]
          : (old || []).filter((item) => item !== id),
      );
      return { previous };
    },
    onError: (error, _, context) => {
      client.setQueryData(key, context?.previous || []);
      notice(apiError(error).message);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return (
    <button
      className={"favorite-button " + (active ? "is-favorite" : "")}
      aria-label={(active ? "Remover favorito " : "Favoritar ") + id}
      aria-pressed={active}
      disabled={
        mutation.isPending ||
        sessionPending ||
        (!!session && favorites.isPending)
      }
      onClick={() =>
        session
          ? mutation.mutate(!active)
          : void navigate({
              to: "/login",
              search: { redirect: location.pathname + location.search },
            })
      }
    >
      <Heart size={17} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
