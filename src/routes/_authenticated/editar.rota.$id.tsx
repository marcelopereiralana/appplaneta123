import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pagina } from "@/components/Layout";
import type { ParadaEd } from "@/components/EditorRota";

const EditorRota = lazy(() => import("@/components/EditorRota"));

export const Route = createFileRoute("/_authenticated/editar/rota/$id")({
  head: () => ({
    meta: [
      { title: "Editar linha — Administração" },
      { name: "description", content: "Edição dos pontos e do trajeto de uma linha." },
      { property: "og:title", content: "Editar linha" },
      { property: "og:description", content: "Edição dos pontos e do trajeto de uma linha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditarRota,
});

const dentro = (lat: number, lon: number) => lat >= -21.5 && lat <= -19.5 && lon >= -41.5 && lon <= -39.5;

type Parada = {
  id: string; ordem: number; nome: string | null; bairro: string | null; kml_id: string | null;
  lat_original: number; lon_original: number; lat_editada: number | null; lon_editada: number | null;
  invertido: boolean;
};

function EditarRota() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const dados = useQuery({
    queryKey: ["rota-edicao", id],
    queryFn: async () => {
      const { data: rota, error } = await supabase.from("rotas").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: ps } = await supabase.from("paradas")
        .select("id,ordem,nome,bairro,kml_id,lat_original,lon_original,lat_editada,lon_editada,invertido")
        .eq("rota_id", id).order("ordem");
      return { rota, paradas: (ps ?? []) as Parada[] };
    },
  });

  const [paradas, setParadas] = useState<Parada[]>([]);
  const [trajeto, setTrajeto] = useState<[number, number][] | null>(null); // null = usa original
  const [sujo, setSujo] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!dados.data) return;
    setParadas(dados.data.paradas);
    setTrajeto((dados.data.rota.trajeto_editado as [number, number][] | null) ?? null);
    setSujo(false);
  }, [dados.data]);

  if (dados.isLoading) return <Pagina><p>Carregando…</p></Pagina>;
  if (!dados.data) return <Pagina><p>Linha não encontrada.</p></Pagina>;
  const { rota } = dados.data;
  const original = (rota.trajeto_original as [number, number][]) ?? [];
  const trajetoAtual = trajeto ?? original;

  const efetiva = (p: Parada) => ({ lat: p.lat_editada ?? p.lat_original, lon: p.lon_editada ?? p.lon_original });
  const paraMapa: ParadaEd[] = paradas.map((p) => {
    const e = efetiva(p);
    return { id: p.id, ordem: p.ordem, nome: p.nome, lat: e.lat, lon: e.lon, suspeito: !dentro(e.lat, e.lon), editado: p.lat_editada != null };
  });
  const suspeitos = paraMapa.filter((p) => p.suspeito).length;

  const mudar = (pid: string, f: (p: Parada) => Parada) => { setParadas((l) => l.map((p) => (p.id === pid ? f(p) : p))); setSujo(true); setMsg(null); };

  const salvar = async () => {
    setSalvando(true); setMsg(null);
    try {
      const orig = new Map(dados.data!.paradas.map((p) => [p.id, p]));
      const alteradas = paradas.filter((p) => { const o = orig.get(p.id)!; return o.lat_editada !== p.lat_editada || o.lon_editada !== p.lon_editada; });
      for (const p of alteradas) {
        const { error } = await supabase.from("paradas").update({ lat_editada: p.lat_editada, lon_editada: p.lon_editada }).eq("id", p.id);
        if (error) throw error;
      }
      const antes = JSON.stringify(rota.trajeto_editado ?? null);
      if (antes !== JSON.stringify(trajeto)) {
        const { error } = await supabase.from("rotas").update({ trajeto_editado: trajeto }).eq("id", id);
        if (error) throw error;
      }
      setMsg(`Alterações salvas (${alteradas.length} pontos${antes !== JSON.stringify(trajeto) ? ", trajeto" : ""}).`);
      await qc.invalidateQueries({ queryKey: ["rota-edicao", id] });
      qc.invalidateQueries({ queryKey: ["rotas-arquivo", rota.arquivo_id] });
    } catch (e) {
      setMsg(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSalvando(false); }
  };

  return (
    <Pagina>
      <Link to="/editar/arquivo/$id" params={{ id: rota.arquivo_id }} className="text-sm underline">← Linhas do arquivo</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-4xl text-primary">Linha {rota.codigo} <span className="text-2xl text-muted-foreground">({rota.sentido})</span></h1>
          <p className="text-sm text-muted-foreground">{rota.nome ?? [rota.origem, rota.destino].filter(Boolean).join(" → ")}</p>
        </div>
        <div className="flex gap-2">
          {sujo && <button onClick={() => { setParadas(dados.data!.paradas); setTrajeto((rota.trajeto_editado as [number, number][] | null) ?? null); setSujo(false); }}
            className="h-11 rounded-md border px-3 text-sm">Descartar</button>}
          <button disabled={!sujo || salvando} onClick={salvar}
            className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}

      <p className="mt-3 text-sm text-muted-foreground">
        Arraste os pontos numerados para corrigir a posição. Aproxime o mapa para ver e arrastar os vértices do trajeto (quadrados laranja).
      </p>
      <div className="mt-2 h-[60vh] overflow-hidden rounded-md border">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
            <EditorRota trajeto={trajetoAtual} paradas={paraMapa} selecionada={sel} onSelecionar={setSel}
              onMoverParada={(pid, lat, lon) => mudar(pid, (p) => ({ ...p, lat_editada: lat, lon_editada: lon }))}
              onMoverVertice={(i, lon, lat) => { setTrajeto(trajetoAtual.map((c, j) => (j === i ? [lon, lat] : c))); setSujo(true); setMsg(null); }} />
          </Suspense>
        </ClientOnly>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>Trajeto: {trajeto ? "editado" : "original"} · {trajetoAtual.length} vértices</span>
        {trajeto && <button onClick={() => { setTrajeto(null); setSujo(true); }} className="underline">Voltar trajeto ao original</button>}
      </div>

      <h2 className="mt-6 font-display text-3xl">Pontos na ordem {suspeitos > 0 && <span className="text-lg text-destructive">· {suspeitos} suspeitos</span>}</h2>
      <ol className="mt-2 space-y-1">
        {paradas.map((p) => {
          const e = efetiva(p);
          const susp = !dentro(e.lat, e.lon);
          const editado = p.lat_editada != null;
          return (
            <li key={p.id} onClick={() => setSel(p.id)}
              className={`superficie flex flex-wrap items-center justify-between gap-2 p-2 text-sm ${susp ? "border-destructive bg-destructive/10" : ""} ${sel === p.id ? "ring-2 ring-primary" : ""}`}>
              <div className="min-w-0">
                <strong>{p.ordem}.</strong> {p.nome ?? "Ponto"} {p.bairro && <span className="text-muted-foreground">· {p.bairro}</span>}
                <div className="text-xs text-muted-foreground">
                  {e.lat.toFixed(6)}, {e.lon.toFixed(6)}
                  {susp && <span className="ml-2 font-semibold text-destructive">fora da região</span>}
                  {p.invertido && <span className="ml-2">corrigido na importação</span>}
                  {editado && <span className="ml-2">movido (original {p.lat_original.toFixed(5)}, {p.lon_original.toFixed(5)})</span>}
                  {p.kml_id && <span className="ml-2">id {p.kml_id}</span>}
                </div>
              </div>
              {editado && (
                <button onClick={(ev) => { ev.stopPropagation(); mudar(p.id, (x) => ({ ...x, lat_editada: null, lon_editada: null })); }}
                  className="rounded-md border px-2 py-1 text-xs">Voltar ao original</button>
              )}
            </li>
          );
        })}
      </ol>
    </Pagina>
  );
}
