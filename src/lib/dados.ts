import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ordenarNumero = (a: { numero: string }, b: { numero: string }) =>
  a.numero.localeCompare(b.numero, "pt-BR", { numeric: true });

type Rota = { id: string; codigo: string; origem: string | null; destino: string | null; sentido: string };
const paraLinha = (r: Rota) => ({ id: r.id, numero: r.codigo, origem: r.origem, destino: r.destino, sentido_nome: r.sentido });

export const buscaQuery = (termo: string) =>
  queryOptions({
    queryKey: ["busca", termo],
    enabled: termo.trim().length >= 2,
    queryFn: async () => {
      const t = termo.trim();
      const like = `%${t.replace(/[%,()]/g, " ")}%`;
      const [porNumero, paradas] = await Promise.all([
        supabase.from("rotas").select("id, codigo, origem, destino, sentido").eq("ativo", true).eq("codigo", t.replace(/^0+/, "")),
        supabase.from("paradas").select("rota_id, rotas!inner(id, codigo, origem, destino, sentido, ativo)")
          .eq("rotas.ativo", true).or(`bairro.ilike.${like},rua.ilike.${like},nome.ilike.${like}`).limit(2000),
      ]);
      if (paradas.error) throw paradas.error;
      const mapa = new Map<string, { linha_id: string; numero: string; origem: string | null; destino: string | null; sentido: string; sentido_nome: string; total_pontos: number }>();
      for (const p of paradas.data ?? []) {
        const r = p.rotas as unknown as Rota;
        const e = mapa.get(r.id);
        if (e) e.total_pontos += 1;
        else mapa.set(r.id, { linha_id: r.id, numero: r.codigo, origem: r.origem, destino: r.destino, sentido: r.sentido, sentido_nome: r.sentido, total_pontos: 1 });
      }
      return {
        linhas: [...mapa.values()].sort(ordenarNumero),
        exata: (porNumero.data ?? []).map(paraLinha),
        locais: [] as { id: string; nome: string; slug: string; tipo: string; bairro: string | null; total_pontos: number }[],
      };
    },
  });

export const todasLinhasQuery = queryOptions({
  queryKey: ["linhas"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("rotas")
      .select("id, codigo, origem, destino, sentido, paradas(count)")
      .eq("ativo", true);
    if (error) throw error;
    return data.map((r) => ({ ...paraLinha(r), itinerarios: r.paradas })).sort(ordenarNumero);
  },
});

export const linhaQuery = (id: string) =>
  queryOptions({
    queryKey: ["linha", id],
    queryFn: async () => {
      const [l, t, i] = await Promise.all([
        supabase.from("linhas").select("*").eq("id", id).maybeSingle(),
        supabase.from("trajetos").select("geometria, distancia_km").eq("linha_id", id).maybeSingle(),
        supabase
          .from("itinerarios")
          .select("ordem, pontos(id, codigo, nome, bairro, rua, tipo, latitude, longitude)")
          .eq("linha_id", id)
          .order("ordem"),
      ]);
      if (l.error) throw l.error;
      return { linha: l.data, trajeto: t.data, pontos: i.data ?? [] };
    },
  });

export const pontoQuery = (id: string) =>
  queryOptions({
    queryKey: ["ponto", id],
    queryFn: async () => {
      const [p, l] = await Promise.all([
        supabase.from("pontos").select("*").eq("id", id).maybeSingle(),
        supabase.rpc("linhas_do_ponto", { _ponto_id: id }),
      ]);
      if (p.error) throw p.error;
      return { ponto: p.data, linhas: [...(l.data ?? [])].sort(ordenarNumero) };
    },
  });
