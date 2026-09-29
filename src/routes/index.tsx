import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { Pagina, CartaoLinha } from "@/components/Layout";
import { buscaQuery } from "@/lib/dados";

export const Route = createFileRoute("/")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Consulta de Itinerários — encontre sua linha de ônibus" },
      { name: "description", content: "Digite um bairro, rua ou ponto e veja quais linhas de ônibus passam por lá." },
      { property: "og:title", content: "Consulta de Itinerários" },
      { property: "og:description", content: "Encontre sua linha de ônibus e veja o itinerário no mapa." },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [texto, setTexto] = useState(q);
  const [numero, setNumero] = useState("");
  const { data, isFetching, error } = useQuery(buscaQuery(q));

  return (
    <Pagina>
      <section className="py-4">
        <h1 className="font-display text-5xl leading-none text-primary">Para onde você vai?</h1>
        <p className="mt-2 text-muted-foreground">Encontre sua linha de ônibus e veja o itinerário no mapa.</p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: { q: texto.trim() || undefined } });
          }}
        >
          <label htmlFor="busca" className="sr-only">Buscar localidade</label>
          <input
            id="busca"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite um bairro, rua, endereço ou ponto de referência"
            className="h-14 min-w-0 flex-1 rounded-lg border-2 border-input bg-card px-4 text-lg outline-none focus:border-primary"
          />
          <button type="submit" aria-label="Buscar" className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Search className="h-6 w-6" />
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (numero.trim()) navigate({ search: { q: numero.trim() } });
            }}
          >
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              inputMode="numeric"
              placeholder="Nº da linha"
              aria-label="Consultar por linha"
              className="h-10 w-28 rounded-md border border-input bg-card px-3"
            />
            <button className="h-10 rounded-md bg-primary px-3 font-semibold text-primary-foreground">Consultar</button>
          </form>
          <Link to="/linhas" className="h-10 rounded-md border border-input px-3 leading-10 font-semibold">
            Ver todas as linhas
          </Link>
        </div>
      </section>

      {q && (
        <section className="mt-4 space-y-3" aria-live="polite">
          {isFetching && <p className="text-muted-foreground">Buscando…</p>}
          {error && <p className="text-destructive">Não foi possível buscar agora. Tente novamente.</p>}
          {data && (
            <>
              {data.locais.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.locais.map((l) => l.tipo === "bairro" ? (
                    <Link key={l.id} to="/bairro/$slug" params={{ slug: l.slug }} className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                      Bairro: {l.nome}
                    </Link>
                  ) : (
                    <button key={l.id} onClick={() => { setTexto(l.nome); navigate({ search: { q: l.nome } }); }}
                      className="rounded-full bg-secondary px-3 py-1 text-sm">
                      {l.tipo === "bairro" ? "Bairro" : "Rua"}: {l.nome}
                    </button>
                  ))}
                </div>
              )}
              <h2 className="font-display text-3xl">Linhas que atendem “{q}”</h2>
              {data.linhas.length === 0 && data.exata.length === 0 && (
                <p className="text-muted-foreground">Nenhuma linha encontrada. Tente outro nome ou parte do nome.</p>
              )}
              {data.exata.map((l) => (
                <CartaoLinha key={"e" + l.id} {...l} extra="Linha com este número" />
              ))}
              {data.linhas.filter((l) => !data.exata.some((e) => e.id === l.linha_id)).map((l) => (
                <CartaoLinha key={l.linha_id} id={l.linha_id} numero={l.numero} origem={l.origem} destino={l.destino}
                  extra={`${l.total_pontos} ${l.total_pontos === 1 ? "ponto" : "pontos"} nesta localidade`} />
              ))}
            </>
          )}
        </section>
      )}
    </Pagina>
  );
}
