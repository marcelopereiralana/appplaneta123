import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pagina, CartaoLinha } from "@/components/Layout";
import { todasLinhasQuery } from "@/lib/dados";

export const Route = createFileRoute("/linhas")({
  head: () => ({
    meta: [
      { title: "Todas as linhas de ônibus — Consulta de Itinerários" },
      { name: "description", content: "Lista completa das linhas de ônibus com origem e destino." },
      { property: "og:title", content: "Todas as linhas de ônibus" },
      { property: "og:description", content: "Lista completa das linhas com origem e destino." },
    ],
  }),
  component: Linhas,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Linhas() {
  const { data, isLoading } = useQuery(todasLinhasQuery);
  const [f, setF] = useState("");
  const lista = (data ?? []).filter((l) => !f || norm(`${l.numero} ${l.origem} ${l.destino}`).includes(norm(f)));
  return (
    <Pagina>
      <h1 className="font-display text-5xl text-primary">Todas as linhas</h1>
      <input value={f} onChange={(e) => setF(e.target.value)} placeholder="Filtrar por número, origem ou destino"
        aria-label="Filtrar linhas" className="mt-3 h-12 w-full rounded-lg border-2 border-input bg-card px-4" />
      <p className="mt-2 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${lista.length} linhas`}</p>
      <div className="mt-3 grid gap-2">
        {lista.map((l) => {
          const n = (l.itinerarios as unknown as { count: number }[])[0]?.count ?? 0;
          return <CartaoLinha key={l.id} id={l.id} numero={l.numero} origem={l.origem} destino={l.destino} extra={`${n} pontos`} />;
        })}
      </div>
    </Pagina>
  );
}
