import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pagina } from "@/components/Layout";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Área administrativa" },
      { name: "description", content: "Acesso da equipe que mantém os itinerários." },
      { property: "og:title", content: "Área administrativa" },
      { property: "og:description", content: "Acesso da equipe que mantém os itinerários." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMsg(null);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha incorretos.");
      else navigate({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setMsg(error ? error.message : "Conta criada. Confirme pelo link enviado ao seu e-mail.");
    }
    setCarregando(false);
  };

  return (
    <Pagina>
      <form onSubmit={enviar} className="superficie mx-auto max-w-sm space-y-3 p-5">
        <h1 className="font-display text-4xl text-primary">{modo === "entrar" ? "Entrar" : "Criar conta"}</h1>
        <label className="block text-sm font-semibold">
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3" />
        </label>
        <label className="block text-sm font-semibold">
          Senha
          <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3" />
        </label>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button disabled={carregando} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground">
          {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
        <button type="button" onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")} className="w-full text-sm underline">
          {modo === "entrar" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
        </button>
      </form>
    </Pagina>
  );
}
