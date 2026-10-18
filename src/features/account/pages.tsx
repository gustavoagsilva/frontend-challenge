import { walletQuery } from "./api";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, Message } from "@/components/form";
import { http, apiError } from "@/lib/http";
import type { Profile, Session, Wallet } from "@/domain/models";
import { changeSession, useSession } from "./session";
import { defaultSearch, networks } from "@/features/catalog/contracts";
export function AccountSidebar() {
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => http.delete("/session"),
    onSuccess: async () => {
      await changeSession(null);
      await navigate({ to: "/", search: defaultSearch });
    },
  });
  return (
    <aside className="account-sidebar">
      <h2>Meu perfil</h2>
      <Link to="/perfil">Dados do perfil</Link>
      <Link to="/favoritos">Favoritos</Link>
      <Link to="/carteiras">Carteiras</Link>
      <Link to="/pedidos">Meus pedidos</Link>
      <Link to="/carrinho">Carrinho</Link>
      <button onClick={() => logout.mutate()} disabled={logout.isPending}>
        Sair da conta
      </button>
      <Message
        error={logout.error ? apiError(logout.error).message : undefined}
      />
    </aside>
  );
}
export function ProfilePage() {
  const session = useSession();
  return (
    <main id="main-content" className="container account-layout">
      <AccountSidebar />
      <section>
        <h1>Perfil do colecionador</h1>
        {session.data ? (
          <ProfileForm key={session.data.user.id} profile={session.data.user} />
        ) : (
          <Skeleton className="h-96 w-full" />
        )}
      </section>
    </main>
  );
}
function ProfileForm({ profile }: { profile: Profile }) {
  const client = useQueryClient();
  const [values, setValues] = useState(profile);
  const [avatarError, setAvatarError] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    password: "",
    confirm: "",
  });
  const [confirmError, setConfirmError] = useState("");
  const update = useMutation({
    mutationFn: async () =>
      (await http.patch<Profile>("/profile", values)).data,
    onSuccess: (user) =>
      client.setQueryData<Session>(["session"], (old) =>
        old?.user.id === user.id ? { ...old, user } : old,
      ),
  });
  const changePassword = useMutation({
    mutationFn: () => http.put("/profile/password", passwords),
    onSuccess: () =>
      setPasswords({ currentPassword: "", password: "", confirm: "" }),
  });
  const error = update.error ? apiError(update.error) : undefined;
  const passwordError = changePassword.error
    ? apiError(changePassword.error)
    : undefined;
  async function avatar(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 500000
    ) {
      setAvatarError("Use PNG, JPG ou WebP de até 500 KB.");
      return;
    }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = () =>
      setValues((current) => ({ ...current, avatar: String(reader.result) }));
    reader.readAsDataURL(file);
  }
  function passwordSubmit(event: FormEvent) {
    event.preventDefault();
    if (passwords.password !== passwords.confirm) {
      setConfirmError("As senhas não coincidem.");
      return;
    }
    setConfirmError("");
    changePassword.mutate();
  }
  return (
    <>
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate();
        }}
      >
        <div className="form-columns">
          <Field
            label="Nome de usuário"
            autoComplete="name"
            required
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            error={error?.fields?.name}
          />
          <Field
            label="E-mail"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            error={error?.fields?.email}
          />
        </div>
        <Field
          label="Telefone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => setValues({ ...values, phone: e.target.value })}
          error={error?.fields?.phone}
        />
        <div className="avatar-row">
          {values.avatar ? (
            <img src={values.avatar} alt="Seu avatar" width="64" height="64" />
          ) : (
            <div className="avatar-placeholder" aria-label="Sem avatar">
              {values.name.slice(0, 1)}
            </div>
          )}
          <Field
            label="Avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void avatar(e.target.files?.[0])}
            error={avatarError || error?.fields?.avatar}
          />
        </div>
        <Message
          error={error?.message}
          success={update.isSuccess ? "Perfil atualizado." : undefined}
        />
        <Button type="submit" disabled={update.isPending}>
          Salvar perfil
        </Button>
      </form>
      <form className="account-form password-form" onSubmit={passwordSubmit}>
        <h2>Alterar senha</h2>
        <Field
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          required
          value={passwords.currentPassword}
          onChange={(e) =>
            setPasswords({ ...passwords, currentPassword: e.target.value })
          }
          error={passwordError?.fields?.currentPassword}
        />
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={passwords.password}
          onChange={(e) =>
            setPasswords({ ...passwords, password: e.target.value })
          }
          error={passwordError?.fields?.password}
        />
        <Field
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={passwords.confirm}
          onChange={(e) =>
            setPasswords({ ...passwords, confirm: e.target.value })
          }
          error={confirmError}
        />
        <Message
          error={passwordError?.message}
          success={changePassword.isSuccess ? "Senha alterada." : undefined}
        />
        <Button disabled={changePassword.isPending}>Alterar senha</Button>
      </form>
    </>
  );
}
export function WalletsPage() {
  const { data: session } = useSession();
  const query = useQuery({
    ...walletQuery(session?.user.id || ""),
    enabled: !!session,
  });
  const client = useQueryClient();
  const blank: Wallet = {
    id: "",
    label: "",
    address: "",
    network: "Ethereum",
    primary: false,
  };
  const [wallet, setWallet] = useState(blank);
  const mutation = useMutation({
    mutationFn: async () => (await http.put<Wallet[]>("/wallets", wallet)).data,
    onSuccess: (wallets) => {
      client.setQueryData(walletQuery(session!.user.id).queryKey, wallets);
      setWallet(blank);
    },
  });
  const error = mutation.error ? apiError(mutation.error) : undefined;
  return (
    <main id="main-content" className="container account-layout">
      <AccountSidebar />
      <section>
        <h1>Minhas carteiras</h1>
        <p className="muted">
          Cadastre sua carteira principal e uma carteira de reserva.
        </p>
        {query.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : query.isError ? (
          <Message error={apiError(query.error).message} />
        ) : (
          <div className="wallet-list">
            {query.data.map((item) => (
              <article className="wallet-card" key={item.id}>
                <div>
                  <h2>
                    {item.label}{" "}
                    {item.primary && (
                      <span className="inline-badge">Principal</span>
                    )}
                  </h2>
                  <p>{item.address}</p>
                  <span>{item.network}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    mutation.reset();
                    setWallet(item);
                  }}
                  aria-label={"Editar carteira " + item.label}
                >
                  Editar
                </Button>
              </article>
            ))}
          </div>
        )}
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <h2>{wallet.id ? "Editar carteira" : "Adicionar carteira"}</h2>
          <Field
            label="Nome da carteira"
            required
            value={wallet.label}
            onChange={(e) => setWallet({ ...wallet, label: e.target.value })}
            error={error?.fields?.label}
          />
          <Field
            label="Endereço da carteira"
            required
            value={wallet.address}
            onChange={(e) => setWallet({ ...wallet, address: e.target.value })}
            error={error?.fields?.address}
          />
          <label className="form-field">
            <span>Rede</span>
            <select
              value={wallet.network}
              onChange={(e) =>
                setWallet({ ...wallet, network: e.target.value })
              }
            >
              {networks.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={wallet.primary}
              onChange={(e) =>
                setWallet({ ...wallet, primary: e.target.checked })
              }
            />
            Usar como principal
          </label>
          <Message
            error={error?.message}
            success={mutation.isSuccess ? "Carteira salva." : undefined}
          />
          <div className="button-row">
            <Button disabled={mutation.isPending}>Salvar carteira</Button>
            {wallet.id && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWallet(blank)}
              >
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
