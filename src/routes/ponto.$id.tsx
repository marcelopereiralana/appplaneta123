import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Pagina, CartaoLinha } from "@/components/Layout";
import { pontoQuery } from "@/lib/dados";

const Mapa = lazy(() => import("@/components/Mapa"));

export const Route = createFileRoute("/ponto/$id")({
  head: () => ({
    meta: [
      { title: "Ponto de ônibus — Consulta de Itinerários" },
      { name: "description", content: "Veja a localização do ponto e as linhas que passam nele." },
      { property: "og:title", content: "Ponto de ônibus" },
      { property: "og:description", content: "Localização do ponto e linhas que passam nele." },
    ],
  }),
  component: PaginaPonto,
});

function PaginaPonto() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(pontoQuery(id));
  if (isLoading) return <Pagina><p>Carregando…</p></Pagina>;
  if (!data?.ponto) return <Pagina><p>Ponto não encontrado.</p></Pagina>;
  const { ponto, linhas } = data;
  return (
    <Pagina>
      <p className="text-sm text-muted-foreground">{ponto.tipo ?? "Ponto"}{ponto.codigo ? ` · código ${ponto.codigo}` : ""}</p>
      <h1 className="font-display text-4xl text-primary">{ponto.nome ?? "Ponto"}</h1>
      {ponto.bairro && <p className="text-muted-foreground">{ponto.bairro}</p>}
      <div className="mt-4 h-64 overflow-hidden rounded-xl border">
        <ClientOnly fallback={<div className="h-full bg-muted" />}>
          <Suspense fallback={<div className="h-full bg-muted" />}>
            <Mapa trajeto={[]} pontos={[ponto]} />
          </Suspense>
        </ClientOnly>
      </div>
      <h2 className="mt-6 font-display text-3xl">Linhas que passam aqui</h2>
      <div className="mt-2 grid gap-2">
        {linhas.map((l) => <CartaoLinha key={l.linha_id} id={l.linha_id} numero={l.numero} origem={l.origem} destino={l.destino} />)}
      </div>
    </Pagina>
  );
}
