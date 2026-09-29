import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ordenarNumero = (a: { numero: string }, b: { numero: string }) =>
  a.numero.localeCompare(b.numero, "pt-BR", { numeric: true });

export const buscaQuery = (termo: string) =>
  queryOptions({
    queryKey: ["busca", termo],
    enabled: termo.trim().length >= 2,
    queryFn: async () => {
      const t = termo.trim();
      const [linhas, porNumero, locais] = await Promise.all([
        supabase.rpc("buscar_linhas_por_local", { termo: t }),
        supabase.from("linhas").select("id, numero, origem, destino, sentido_nome").eq("numero", t.replace(/^0+/, "")),
        supabase.from("localidades").select("id, nome, slug, tipo, bairro, total_pontos").ilike("busca", `%${t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")}%`).limit(8),
      ]);
      if (linhas.error) throw linhas.error;
      return {
        linhas: [...(linhas.data ?? [])].sort(ordenarNumero),
        exata: porNumero.data ?? [],
        locais: locais.data ?? [],
      };
    },
  });

export const todasLinhasQuery = queryOptions({
  queryKey: ["linhas"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("linhas")
      .select("id, numero, origem, destino, sentido_nome, itinerarios(count)")
      .eq("ativo", true);
    if (error) throw error;
    return [...data].sort(ordenarNumero);
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
