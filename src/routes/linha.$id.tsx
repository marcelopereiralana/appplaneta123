import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Share2 } from "lucide-react";
import { Pagina } from "@/components/Layout";
import { linhaQuery } from "@/lib/dados";

const Mapa = lazy(() => import("@/components/Mapa"));

export const Route = createFileRoute("/linha/$id")({
  head: () => ({
    meta: [
      { title: "Itinerário da linha — Consulta de Itinerários" },
      { name: "description", content: "Mapa do trajeto e lista de pontos na ordem da linha." },
      { property: "og:title", content: "Itinerário da linha de ônibus" },
      { property: "og:description", content: "Veja o trajeto no mapa e todos os pontos da linha." },
    ],
  }),
  component: PaginaLinha,
});

function PaginaLinha() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(linhaQuery(id));
  if (isLoading) return <Pagina><p>Carregando…</p></Pagina>;
  if (!data?.linha) return <Pagina><p>Linha não encontrada.</p></Pagina>;
  const { linha, trajeto, pontos } = data;
  const lista = pontos.flatMap((i) => (i.pontos ? [{ ...i.pontos, ordem: i.ordem }] : []));

  const compartilhar = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `Linha ${linha.numero}`, url }).catch(() => {});
    else await navigator.clipboard.writeText(url);
  };

  return (
    <Pagina>
      <div className="flex items-start gap-4">
        <span className="selo-linha text-4xl">{linha.numero}</span>
        <div className="flex-1">
          <h1 className="font-display text-3xl leading-tight">{linha.origem ?? "—"} → {linha.destino ?? "—"}</h1>
          <p className="text-sm text-muted-foreground">
            {lista.length} pontos{trajeto?.distancia_km ? ` · ${String(trajeto.distancia_km).replace(".", ",")} km` : ""}
          </p>
        </div>
        <button onClick={compartilhar} aria-label="Compartilhar" className="rounded-md border border-input p-2"><Share2 className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 h-[55vh] overflow-hidden rounded-xl border">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
            <Mapa trajeto={(trajeto?.geometria as [number, number][] | undefined) ?? []} pontos={lista} />
          </Suspense>
        </ClientOnly>
      </div>
      <h2 className="mt-6 font-display text-3xl">Pontos na ordem</h2>
      <ol className="mt-2 border-l-4 border-primary pl-4">
        {lista.map((p) => (
          <li key={p.ordem} className="relative py-2">
            <span className="absolute -left-[1.6rem] top-3 h-3 w-3 rounded-full border-2 border-primary bg-card" />
            <Link to="/ponto/$id" params={{ id: p.id }} className="block hover:underline">
              <span className="text-xs text-muted-foreground">{p.ordem}.</span>{" "}
              <span className="font-semibold">{p.nome ?? p.codigo ?? "Ponto"}</span>
              {p.bairro && <span className="block text-sm text-muted-foreground">{p.bairro}{p.codigo ? ` · cód. ${p.codigo}` : ""}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </Pagina>
  );
}
