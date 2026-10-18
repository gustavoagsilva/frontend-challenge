import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Message } from "@/components/form";
import { http, apiError } from "@/lib/http";
import type { Session } from "@/domain/models";
import { changeSession, safeReturn } from "./session";
import { defaultSearch } from "@/features/catalog/contracts";
import { catalogArtwork, nftArtwork } from "@/lib/nft-artwork";

export function AuthPage({ register = false }: { register?: boolean }) {
  const search = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: async () =>
      (
        await http.post<Session>(
          "/session/" + (register ? "register" : "login"),
          values,
        )
      ).data,
    onSuccess: async (session) => {
      await changeSession(session);
      await navigate({ href: safeReturn(search.redirect) });
    },
  });
  const error = mutation.error ? apiError(mutation.error) : undefined;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (register && confirmation !== values.password) {
      setValidation("As senhas não coincidem.");
      return;
    }
    setValidation("");
    mutation.mutate();
  }
  return (
    <main id="main-content" className="container auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <div>
          <p>Bem-vindo à Kurio</p>
          <h1>
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL.
          </h1>
        </div>
        <img src={nftArtwork.emerald} alt="" width="450" height="450" />
        <div className="auth-grid">
          {catalogArtwork.map((image, i) => (
            <img key={i} src={image} alt="" width="600" height="600" />
          ))}
        </div>
      </div>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <Link
          className="auth-close"
          to="/"
          search={defaultSearch}
          aria-label="Voltar ao início"
        >
          <X size={20} />
        </Link>
        <p className="auth-brand">KURIO</p>
        <div className="auth-tabs">
          <Link
            to="/login"
            search={{ redirect: search.redirect || "/" }}
            className={!register ? "selected" : ""}
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            search={{ redirect: search.redirect || "/" }}
            className={register ? "selected" : ""}
          >
            Criar conta
          </Link>
        </div>
        <h1 id="auth-heading">
          {register ? "Criar perfil de colecionador" : "Entrar na sua conta"}
        </h1>
        <p className="muted">Sua próxima descoberta começa aqui.</p>
        <form onSubmit={submit}>
          {register && (
            <Field
              label="Nome de usuário"
              autoComplete="name"
              required
              maxLength={80}
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              error={error?.fields?.name}
            />
          )}
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            error={error?.fields?.email}
          />
          <Field
            label="Senha"
            type={visible ? "text" : "password"}
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={register ? 8 : undefined}
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            error={error?.fields?.password}
          />
          <button
            className="text-link password-toggle"
            type="button"
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            {visible ? "Ocultar senha" : "Mostrar senha"}
          </button>
          {register && (
            <Field
              label="Confirmar senha"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              error={validation}
            />
          )}
          <Message error={error?.message} />
          <Button
            className="w-full mt-5"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending
              ? "Aguarde…"
              : register
                ? "Criar perfil"
                : "Entrar"}
          </Button>
        </form>
        <p className="auth-switch">
          {register ? "Já tem uma conta? " : "Novo na Kurio? "}
          <Link
            to={register ? "/login" : "/cadastro"}
            search={{ redirect: search.redirect || "/" }}
          >
            {register ? "Entre" : "Crie uma conta"}
          </Link>
        </p>
      </section>
    </main>
  );
}

export function RegisterPage() {
  return <AuthPage register />;
}
