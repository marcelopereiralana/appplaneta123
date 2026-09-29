import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pagina } from "@/components/Layout";
import { lerArquivo, publicar } from "@/lib/publicar";
import type { ResultadoParse } from "@/lib/kmz";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Consulta de Itinerários" },
      { name: "description", content: "Importação de itinerários e histórico." },
      { property: "og:title", content: "Administração" },
      { property: "og:description", content: "Importação de itinerários e histórico." },
    ],
  }),
  component: Admin,
});

const rotulo: Record<string, string> = { publicada: "No ar", substituida: "Substituída", erro: "Com erro", em_processamento: "Processando" };

function Admin() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const papel = useQuery({
    queryKey: ["papel", user.id],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data ?? false,
  });
  const historico = useQuery({
    queryKey: ["importacoes"],
    enabled: papel.data === true,
    queryFn: async () => (await supabase.from("importacoes").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<ResultadoParse | null>(null);
  const [estado, setEstado] = useState<string | null>(null);

  const sair = async () => { await supabase.auth.signOut(); qc.clear(); navigate({ to: "/" }); };

  if (papel.isLoading) return <Pagina><p>Carregando…</p></Pagina>;
  if (!papel.data)
    return (
      <Pagina>
        <p>Sua conta ({user.email}) ainda não tem permissão de administrador.</p>
        <button onClick={sair} className="mt-3 underline">Sair</button>
      </Pagina>
    );

  return (
    <Pagina>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-5xl text-primary">Administração</h1>
        <button onClick={sair} className="text-sm underline">Sair</button>
      </div>

      <section className="superficie mt-4 space-y-3 p-4">
        <h2 className="font-display text-3xl">Nova importação</h2>
        <p className="text-sm text-muted-foreground">Envie um arquivo KMZ ou KML. Os dados atuais só são trocados depois que a nova versão for gravada por completo.</p>
        <input type="file" accept=".kmz,.kml" aria-label="Arquivo KMZ ou KML"
          onChange={async (e) => {
            const f = e.target.files?.[0] ?? null;
            setArquivo(f); setPrevia(null); setEstado(null);
            if (f) { try { setPrevia(await lerArquivo(f)); } catch (err) { setEstado(String(err)); } }
          }} />
        {previa && (
          <div className="space-y-2">
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[["Linhas", previa.totais.linhas], ["Trajetos", previa.totais.trajetos], ["Pontos", previa.totais.pontosUnicos], ["Bairros", previa.totais.bairros]].map(([k, v]) => (
                <li key={k} className="rounded-md bg-secondary p-2"><span className="block font-display text-2xl">{v}</span>{k}</li>
              ))}
            </ul>
            {previa.erros.length > 0 && (
              <details className="text-sm"><summary>{previa.erros.length} avisos</summary>
                <ul className="list-disc pl-5">{previa.erros.map((e, i) => <li key={i}>{e.elemento}: {e.motivo}</li>)}</ul>
              </details>
            )}
            <button disabled={estado === "publicando"} className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
              onClick={async () => {
                setEstado("publicando");
                try {
                  await publicar(previa, arquivo!.name, user.id);
                  setEstado("Publicado com sucesso."); setPrevia(null);
                  qc.invalidateQueries();
                } catch (err) { setEstado(`Não foi possível publicar: ${String(err)}. A versão anterior continua no ar.`); qc.invalidateQueries(); }
              }}>
              {estado === "publicando" ? "Publicando…" : "Publicar esta versão"}
            </button>
          </div>
        )}
        {estado && estado !== "publicando" && <p className="text-sm">{estado}</p>}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-3xl">Histórico de importações</h2>
        <div className="mt-2 space-y-2">
          {historico.data?.map((h) => (
            <div key={h.id} className="superficie p-3 text-sm">
              <div className="flex justify-between gap-2">
                <strong>#{h.numero} · {rotulo[h.status] ?? h.status}</strong>
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <p className="truncate text-muted-foreground">{h.arquivo}</p>
              <p>{h.total_linhas} linhas · {h.total_pontos} pontos · {h.total_bairros} bairros</p>
            </div>
          ))}
        </div>
      </section>
      <Link to="/linhas" className="mt-6 inline-block underline">Ver linhas publicadas</Link>
    </Pagina>
  );
}
