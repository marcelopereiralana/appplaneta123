import { supabase } from "@/integrations/supabase/client";
import type { ResultadoParse } from "./kmz";

/** Região de Vitória (ES): fora dela a coordenada é marcada como suspeita. */
export const REGIAO = { latMin: -21.5, latMax: -19.5, lonMin: -41.5, lonMax: -39.5 };

export const naRegiao = (lat: number, lon: number) =>
  lat >= REGIAO.latMin && lat <= REGIAO.latMax && lon >= REGIAO.lonMin && lon <= REGIAO.lonMax;

/**
 * Normaliza uma coordenada antes de gravar: se latitude e longitude estiverem
 * trocadas (a troca cai na região e o original não), inverte.
 */
export function normalizeCoord(lat: number, lon: number) {
  if (!naRegiao(lat, lon) && naRegiao(lon, lat)) return { lat: lon, lon: lat, invertido: true, suspeito: false };
  return { lat, lon, invertido: false, suspeito: !naRegiao(lat, lon) };
}

export type Resumo = { linhas: number; pontos: number; invertidos: number; suspeitos: number };

/** Aplica normalizeCoord a todos os pontos e trajetos e calcula o resumo. */
export function prepararImportacao(r: ResultadoParse) {
  let invertidos = 0, suspeitos = 0, pontos = 0;
  const linhas = r.linhas.map((l) => ({
    ...l,
    trajeto: l.trajeto.map(([lon, lat]) => {
      const c = normalizeCoord(lat, lon);
      return [c.lon, c.lat] as [number, number];
    }),
    pontos: l.pontos.map((p) => {
      const c = normalizeCoord(p.latitude, p.longitude);
      const invertido = c.invertido || p.coordenada_invertida;
      pontos += 1;
      if (invertido) invertidos += 1;
      if (c.suspeito) suspeitos += 1;
      return { ...p, latitude: c.lat, longitude: c.lon, invertido, suspeito: c.suspeito };
    }),
  }));
  const resumo: Resumo = { linhas: linhas.length, pontos, invertidos, suspeitos };
  return { linhas, resumo };
}

async function inserirEmLotes(tabela: "rotas" | "paradas", linhas: Record<string, unknown>[]) {
  for (let i = 0; i < linhas.length; i += 500) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(tabela).insert(linhas.slice(i, i + 500) as any);
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

/** Grava um novo arquivo com suas linhas e pontos. Em caso de falha, remove o arquivo (cascata). */
export async function importar(r: ResultadoParse, nome: string, userId: string): Promise<Resumo> {
  const { linhas, resumo } = prepararImportacao(r);
  const arquivoId = crypto.randomUUID();
  const { error } = await supabase.from("arquivos").insert({
    id: arquivoId, nome, importado_por: userId,
    total_linhas: resumo.linhas, total_pontos: resumo.pontos,
    total_invertidos: resumo.invertidos, total_suspeitos: resumo.suspeitos,
  });
  if (error) throw new Error(error.message);
  try {
    const rotas: Record<string, unknown>[] = [];
    const paradas: Record<string, unknown>[] = [];
    for (const l of linhas) {
      const rotaId = crypto.randomUUID();
      rotas.push({
        id: rotaId, arquivo_id: arquivoId, codigo: l.numero, sentido: l.sentido, nome: l.nome,
        origem: l.origem, destino: l.destino, kml_id: l.identificador,
        descricao_original: l.original_description, trajeto_original: l.trajeto,
      });
      l.pontos.forEach((p, i) => paradas.push({
        arquivo_id: arquivoId, rota_id: rotaId, ordem: i + 1, kml_id: p.original_id,
        nome: p.nome ?? p.original_name, tipo: p.tipo, bairro: p.bairro, rua: p.rua,
        descricao_original: p.original_description,
        lat_original: p.latitude, lon_original: p.longitude, invertido: p.invertido,
      }));
    }
    await inserirEmLotes("rotas", rotas);
    await inserirEmLotes("paradas", paradas);
    return resumo;
  } catch (e) {
    await supabase.from("arquivos").delete().eq("id", arquivoId);
    throw e;
  }
}
