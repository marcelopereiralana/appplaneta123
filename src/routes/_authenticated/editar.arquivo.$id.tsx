import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pagina } from "@/components/Layout";

export const Route = createFileRoute("/_authenticated/editar/arquivo/$id")({
  head: () => ({
    meta: [
      { title: "Linhas do arquivo — Administração" },
      { name: "description", content: "Linhas de um arquivo importado, para edição." },
      { property: "og:title", content: "Linhas do arquivo" },
      { property: "og:description", content: "Linhas de um arquivo importado, para edição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinhasArquivo,
});

function LinhasArquivo() {
  const { id } = Route.useParams();
  const [filtro, setFiltro] = useState("");
  const arquivo = useQuery({
    queryKey: ["arquivo", id],
    queryFn: async () => (await supabase.from("arquivos").select("*").eq("id", id).maybeSingle()).data,
  });
  const rotas = useQuery({
    queryKey: ["rotas-arquivo", id],
    queryFn: async () => {
      const { data: rs } = await supabase.from("rotas").select("id,codigo,sentido,nome,origem,destino,trajeto_editado").eq("arquivo_id", id);
      const { data: ps } = await supabase.from("paradas").select("rota_id,suspeito,lat_editada").eq("arquivo_id", id).range(0, 9999);
      const cont = new Map<string, { t: number; s: number; e: number }>();
      for (const p of ps ?? []) {
        const c = cont.get(p.rota_id) ?? { t: 0, s: 0, e: 0 };
        c.t++; if (p.suspeito) c.s++; if (p.lat_editada != null) c.e++;
        cont.set(p.rota_id, c);
      }
      return (rs ?? [])
        .map((r) => ({ ...r, ...(cont.get(r.id) ?? { t: 0, s: 0, e: 0 }) }))
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }) || a.sentido.localeCompare(b.sentido));
    },
  });
  const q = filtro.trim().toLowerCase();
  const lista = (rotas.data ?? []).filter((r) => !q || r.codigo.toLowerCase().includes(q));

  return (
    <Pagina>
      <Link to="/admin" className="text-sm underline">← Administração</Link>
      <h1 className="mt-2 font-display text-4xl text-primary break-all">{arquivo.data?.nome ?? "Arquivo"}</h1>
      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por código da linha"
        aria-label="Filtrar por código da linha" className="mt-4 h-11 w-full rounded-md border bg-background px-3" />
      {rotas.isLoading && <p className="mt-3">Carregando…</p>}
      <ul className="mt-3 space-y-2">
        {lista.map((r) => (
          <li key={r.id}>
            <Link to="/editar/rota/$id" params={{ id: r.id }} className="superficie block p-3 text-sm hover:bg-secondary">
              <div className="flex justify-between gap-2">
                <strong>{r.codigo} <span className="font-normal text-muted-foreground">({r.sentido})</span></strong>
                <span>{r.t} pontos{r.s > 0 && <span className="ml-2 font-semibold text-destructive">{r.s} suspeitos</span>}</span>
              </div>
              <p className="truncate text-muted-foreground">{r.nome ?? [r.origem, r.destino].filter(Boolean).join(" → ")}</p>
              {(r.e > 0 || r.trajeto_editado) && <p className="text-xs">Editada{r.e > 0 ? ` · ${r.e} pontos movidos` : ""}{r.trajeto_editado ? " · trajeto alterado" : ""}</p>}
            </Link>
          </li>
        ))}
        {!rotas.isLoading && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma linha encontrada.</p>}
      </ul>
    </Pagina>
  );
}
