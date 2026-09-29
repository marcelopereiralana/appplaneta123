import { unzipSync, strFromU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { parseKml, distanciaKm, slugificar, type ResultadoParse } from "./kmz";

export async function lerArquivo(file: File): Promise<ResultadoParse> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let xml: string;
  if (file.name.toLowerCase().endsWith(".kmz")) {
    const z = unzipSync(buf);
    const nome = Object.keys(z).find((n) => n.toLowerCase().endsWith(".kml"));
    if (!nome) throw new Error("O arquivo KMZ não contém um KML.");
    xml = strFromU8(z[nome]!);
  } else xml = strFromU8(buf);
  return parseKml(xml);
}

async function lotes(tabela: string, linhas: Record<string, unknown>[]) {
  for (let i = 0; i < linhas.length; i += 400) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(tabela as any) as any).insert(linhas.slice(i, i + 400));
    if (error) throw new Error(`${tabela}: ${error.message}`);
  }
}

/** Grava a nova versão; só remove a versão anterior depois que tudo foi gravado. */
export async function publicar(r: ResultadoParse, arquivo: string, userId: string) {
  const { data: anteriores } = await supabase.from("importacoes").select("id").eq("status", "publicada");
  const imp = crypto.randomUUID();
  const { error } = await supabase.from("importacoes").insert({
    id: imp, arquivo, status: "em_processamento", criado_por: userId,
    total_linhas: r.totais.linhas, total_trajetos: r.totais.trajetos, total_pontos: r.totais.pontosUnicos,
    total_bairros: r.totais.bairros, total_cidades: r.totais.cidades, erros: r.erros,
  });
  if (error) throw error;
  try {
    const pontos = new Map<string, Record<string, unknown>>();
    for (const l of r.linhas) for (const p of l.pontos) if (!pontos.has(p.chave)) {
      const { chave: _c, coordenada_invertida: _i, ...resto } = p;
      pontos.set(p.chave, { ...resto, id: crypto.randomUUID(), import_batch_id: imp });
    }
    await lotes("pontos", [...pontos.values()]);
    const ls: Record<string, unknown>[] = [], ts: Record<string, unknown>[] = [], its: Record<string, unknown>[] = [];
    for (const l of r.linhas) {
      const id = crypto.randomUUID();
      ls.push({ id, numero: l.numero, origem: l.origem, destino: l.destino, sentido: l.sentido, sentido_nome: l.sentido_nome,
        variante: l.variante, original_id: l.identificador, original_description: l.original_description, import_batch_id: imp });
      if (l.trajeto.length > 1) ts.push({ linha_id: id, sentido: l.sentido, geometria: l.trajeto, distancia_km: distanciaKm(l.trajeto), import_batch_id: imp });
      l.pontos.forEach((p, i) => its.push({ linha_id: id, sentido: l.sentido, ordem: i + 1, ponto_id: pontos.get(p.chave)!["id"],
        latitude: p.latitude, longitude: p.longitude, import_batch_id: imp }));
    }
    await lotes("linhas", ls.map((l) => ({ ...l, ativo: false })));
    await lotes("trajetos", ts);
    await lotes("itinerarios", its);
    const loc = new Map<string, Record<string, unknown> & { total_pontos: number }>();
    for (const p of pontos.values()) {
      for (const tipo of ["bairro", "rua"] as const) {
        const nome = p[tipo] as string | null;
        const slug = nome ? slugificar(nome) : "";
        if (!slug) continue;
        const k = tipo + slug;
        const e = loc.get(k) ?? { tipo, nome, slug, bairro: p["bairro"], rua: tipo === "rua" ? nome : null,
          latitude: p["latitude"], longitude: p["longitude"], total_pontos: 0, import_batch_id: imp };
        e.total_pontos += 1;
        loc.set(k, e);
      }
    }
    // Troca de versão: remove a anterior e ativa a nova
    const velhas = (anteriores ?? []).map((a) => a.id);
    if (velhas.length) {
      for (const t of ["itinerarios", "trajetos", "localidades"] as const) await supabase.from(t).delete().in("import_batch_id", velhas);
      await supabase.from("linhas").delete().in("import_batch_id", velhas);
      await supabase.from("pontos").delete().in("import_batch_id", velhas);
      await supabase.from("importacoes").update({ status: "substituida" }).in("id", velhas);
    }
    await lotes("localidades", [...loc.values()]);
    await supabase.from("linhas").update({ ativo: true }).eq("import_batch_id", imp);
    await supabase.from("importacoes").update({ status: "publicada", publicado_em: new Date().toISOString() }).eq("id", imp);
    await supabase.from("auditoria").insert({ user_id: userId, operacao: "publicar_importacao", tabela: "importacoes", registro_id: imp });
  } catch (e) {
    // Falhou: descarta a versão nova, a anterior continua no ar
    for (const t of ["itinerarios", "trajetos", "linhas", "pontos", "localidades"] as const)
      await supabase.from(t).delete().eq("import_batch_id", imp);
    await supabase.from("importacoes").update({ status: "erro", erros: [...r.erros, { elemento: "publicação", motivo: String(e) }] }).eq("id", imp);
    throw e;
  }
}
