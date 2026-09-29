import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Pagina, CartaoLinha } from "@/components/Layout";
import { buscaQuery } from "@/lib/dados";

export const Route = createFileRoute("/bairro/$slug")({
  head: () => ({
    meta: [
      { title: "Linhas do bairro — Consulta de Itinerários" },
      { name: "description", content: "Linhas de ônibus que atendem este bairro." },
      { property: "og:title", content: "Linhas que atendem o bairro" },
      { property: "og:description", content: "Veja quais ônibus passam neste bairro." },
    ],
  }),
  component: Bairro,
});

function Bairro() {
  const { slug } = Route.useParams();
  const local = useQuery({
    queryKey: ["bairro", slug],
    queryFn: async () => (await supabase.from("localidades").select("nome, total_pontos").eq("tipo", "bairro").eq("slug", slug).maybeSingle()).data,
  });
  const nome = local.data?.nome ?? "";
  const { data } = useQuery(buscaQuery(nome));
  if (local.isLoading) return <Pagina><p>Carregando…</p></Pagina>;
  if (!local.data) return <Pagina><p>Bairro não encontrado.</p></Pagina>;
  return (
    <Pagina>
      <p className="text-sm text-muted-foreground">Bairro · {local.data.total_pontos} pontos</p>
      <h1 className="font-display text-5xl text-primary">{nome}</h1>
      <h2 className="mt-4 font-display text-3xl">Linhas que atendem este bairro</h2>
      <div className="mt-2 grid gap-2">
        {data?.linhas.map((l) => (
          <CartaoLinha key={l.linha_id} id={l.linha_id} numero={l.numero} origem={l.origem} destino={l.destino} extra={`${l.total_pontos} pontos no bairro`} />
        ))}
      </div>
    </Pagina>
  );
}
