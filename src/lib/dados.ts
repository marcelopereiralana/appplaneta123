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
      const [r, p] = await Promise.all([
        supabase.from("rotas").select("id, codigo, nome, origem, destino, sentido, trajeto_original, trajeto_editado").eq("id", id).maybeSingle(),
        supabase
          .from("paradas")
          .select("id, ordem, nome, tipo, bairro, rua, lat_original, lon_original, lat_editada, lon_editada, suspeito")
          .eq("rota_id", id)
          .order("ordem"),
      ]);
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      const rota = r.data;
      const linha = rota
        ? { id: rota.id, numero: rota.codigo, nome: rota.nome, origem: rota.origem, destino: rota.destino, sentido_nome: rota.sentido }
        : null;
      const geometria = (rota?.trajeto_editado ?? rota?.trajeto_original ?? []) as [number, number][];
      const trajeto = { geometria, distancia_km: null as number | null };
      const pontos = (p.data ?? []).map((parada) => ({
        ordem: parada.ordem,
        pontos: {
          id: parada.id,
          codigo: null as string | null,
          nome: parada.nome,
          bairro: parada.bairro,
          rua: parada.rua,
          tipo: parada.tipo,
          latitude: parada.lat_editada ?? parada.lat_original,
          longitude: parada.lon_editada ?? parada.lon_original,
          suspeito: parada.suspeito,
        },
      }));
      return { linha, trajeto, pontos };
    },
  });

export const pontoQuery = (id: string) =>
  queryOptions({
    queryKey: ["ponto", id],
    queryFn: async () => {
      const [parada, ponto, linhasRpc] = await Promise.all([
        supabase.from("paradas")
          .select("id, nome, tipo, bairro, rua, lat_original, lon_original, lat_editada, lon_editada, suspeito, rotas!inner(id, codigo, origem, destino, sentido, ativo)")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("pontos").select("*").eq("id", id).maybeSingle(),
        supabase.rpc("linhas_do_ponto", { _ponto_id: id }),
      ]);
      if (parada.error) throw parada.error;
      if (ponto.error) throw ponto.error;

      if (parada.data) {
        const rota = parada.data.rotas as unknown as { id: string; codigo: string; origem: string | null; destino: string | null; sentido: string; ativo: boolean };
        const ponto = {
          id: parada.data.id,
          nome: parada.data.nome,
          tipo: parada.data.tipo,
          bairro: parada.data.bairro,
          rua: parada.data.rua,
          codigo: null as string | null,
          latitude: parada.data.lat_editada ?? parada.data.lat_original,
          longitude: parada.data.lon_editada ?? parada.data.lon_original,
        };
        const linhas = rota?.ativo ? [paraLinha(rota)] : [];
        return { ponto, linhas: linhas.sort(ordenarNumero) };
      }

      return { ponto: ponto.data, linhas: [...(linhasRpc.data ?? [])].sort(ordenarNumero) };
    },
  });

export type AvisoLinha = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "informativo" | "desvio" | "atencao";
  codigo_linha: string | null;
  rota_id: string | null;
  inicio_em: string;
  fim_em: string;
  ativo: boolean;
};

export const avisosAtivosQuery = (rotaId?: string, codigo?: string) =>
  queryOptions({
    queryKey: ["avisos-ativos", rotaId ?? "todas", codigo ?? ""],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avisos_linha")
        .select("id, titulo, mensagem, tipo, codigo_linha, rota_id, inicio_em, fim_em, ativo")
        .eq("ativo", true)
        .lte("inicio_em", new Date().toISOString())
        .gte("fim_em", new Date().toISOString())
        .order("inicio_em", { ascending: false });
      if (error) throw error;
      const base = codigo?.split("_")[0] ?? null;
      return (data ?? []).filter((aviso) =>
        aviso.rota_id === null && aviso.codigo_linha === null ||
        (base !== null && aviso.rota_id === null && aviso.codigo_linha === base) ||
        (rotaId !== undefined && aviso.rota_id === rotaId)
      ) as AvisoLinha[];
    },
  });

export const todosAvisosQuery = queryOptions({
  queryKey: ["avisos-admin"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("avisos_linha")
      .select("id, titulo, mensagem, tipo, codigo_linha, rota_id, inicio_em, fim_em, ativo")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as AvisoLinha[];
  },
});
