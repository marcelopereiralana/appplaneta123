import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pagina } from "@/components/Layout";
import { lerArquivo } from "@/lib/publicar";
import { importar, prepararImportacao, type Resumo } from "@/lib/importar";
import type { ResultadoParse } from "@/lib/kmz";
import { GerenciarAvisos } from "@/components/GerenciarAvisos";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Consulta de Itinerários" },
      { name: "description", content: "Importação de arquivos de itinerários." },
      { property: "og:title", content: "Administração" },
      { property: "og:description", content: "Importação de arquivos de itinerários." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function CaixaResumo({ r }: { r: Resumo }) {
  const itens: [string, number][] = [["Linhas", r.linhas], ["Pontos", r.pontos], ["Invertidos", r.invertidos], ["Suspeitos", r.suspeitos]];
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      {itens.map(([k, v]) => (
        <li key={k} className="rounded-md bg-secondary p-2"><span className="block font-display text-2xl">{v}</span>{k}</li>
      ))}
    </ul>
  );
}

function Admin() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const papel = useQuery({
    queryKey: ["papel", user.id],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data ?? false,
  });
  const arquivos = useQuery({
    queryKey: ["arquivos"],
    enabled: papel.data === true,
    queryFn: async () => (await supabase.from("arquivos").select("*").order("importado_em", { ascending: false })).data ?? [],
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<ResultadoParse | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [final, setFinal] = useState<Resumo | null>(null);
  const resumoPrevia = useMemo(() => (previa ? prepararImportacao(previa).resumo : null), [previa]);

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
        <h2 className="font-display text-3xl">Importar arquivo</h2>
        <p className="text-sm text-muted-foreground">Envie um KMZ ou KML. As coordenadas são conferidas e corrigidas antes de gravar.</p>
        <input type="file" accept=".kmz,.kml" aria-label="Arquivo KMZ ou KML"
          onChange={async (e) => {
            const f = e.target.files?.[0] ?? null;
            setArquivo(f); setPrevia(null); setEstado(null); setFinal(null);
            if (f) { try { setPrevia(await lerArquivo(f)); } catch (err) { setEstado(String(err)); } }
          }} />
        {previa && resumoPrevia && (
          <div className="space-y-2">
            <CaixaResumo r={resumoPrevia} />
            {previa.erros.length > 0 && (
              <details className="text-sm"><summary>{previa.erros.length} avisos</summary>
                <ul className="list-disc pl-5">{previa.erros.map((e, i) => <li key={i}>{e.elemento}: {e.motivo}</li>)}</ul>
              </details>
            )}
            <button disabled={estado === "gravando"} className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
              onClick={async () => {
                setEstado("gravando");
                try {
                  const r = await importar(previa, arquivo!.name, user.id);
                  setFinal(r); setPrevia(null); setEstado("Importação concluída.");
                  qc.invalidateQueries({ queryKey: ["arquivos"] });
                } catch (err) { setEstado(`Não foi possível importar: ${String(err)}`); }
              }}>
              {estado === "gravando" ? "Gravando…" : "Importar este arquivo"}
            </button>
          </div>
        )}
        {estado && estado !== "gravando" && <p className="text-sm">{estado}</p>}
        {final && <CaixaResumo r={final} />}
      </section>

      <GerenciarAvisos />

      <section className="mt-6">
        <h2 className="font-display text-3xl">Arquivos importados</h2>
        <div className="mt-2 space-y-2">
          {arquivos.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum arquivo ainda.</p>}
          {arquivos.data?.map((a) => (
            <div key={a.id} className="superficie p-3 text-sm">
              <div className="flex justify-between gap-2">
                <strong className="truncate">{a.nome}</strong>
                <span className="shrink-0 text-muted-foreground">{new Date(a.importado_em).toLocaleString("pt-BR")}</span>
              </div>
              <p>{a.total_linhas} linhas · {a.total_pontos} pontos · {a.total_invertidos} invertidos · {a.total_suspeitos} suspeitos</p>
              <div className="mt-2 flex gap-4">
                <Link to="/editar/arquivo/$id" params={{ id: a.id }} className="font-semibold text-primary underline">Editar linhas</Link>
                <button className="text-destructive underline" onClick={async () => {
                  if (!confirm(`Excluir "${a.nome}"? Todas as linhas e pontos deste arquivo serão apagados.`)) return;
                  const { error } = await supabase.from("arquivos").delete().eq("id", a.id);
                  if (error) alert(`Não foi possível excluir: ${error.message}`);
                  qc.invalidateQueries({ queryKey: ["arquivos"] });
                }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Link to="/linhas" className="mt-6 inline-block underline">Ver linhas publicadas</Link>
    </Pagina>
  );
}
