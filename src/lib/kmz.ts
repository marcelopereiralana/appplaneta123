/**
 * Parser flexível de KML/KMZ de itinerários.
 *
 * Preserva dados originais (id, name, description), normaliza coordenadas para
 * [longitude, latitude] e mantém a ordem original dos pontos de cada linha.
 * Não inventa dados: campos ausentes ficam nulos.
 */

export type PontoBruto = {
  chave: string;
  codigo: string | null;
  nome: string | null;
  tipo: string | null;
  bairro: string | null;
  rua: string | null;
  endereco: string | null;
  cidade: string | null;
  latitude: number;
  longitude: number;
  original_id: string | null;
  original_name: string | null;
  original_description: string | null;
  coordenada_invertida: boolean;
};

export type LinhaBruta = {
  identificador: string;
  numero: string;
  sentido: string;
  variante: string | null;
  nome: string | null;
  origem: string | null;
  destino: string | null;
  sentido_nome: string | null;
  original_description: string | null;
  trajeto: [number, number][];
  pontos: PontoBruto[];
};

export type ErroImportacao = { elemento: string; motivo: string };

export type ResultadoParse = {
  linhas: LinhaBruta[];
  erros: ErroImportacao[];
  totais: {
    linhas: number;
    trajetos: number;
    pontos: number;
    pontosUnicos: number;
    bairros: number;
    cidades: number;
    coordenadasInvalidas: number;
    coordenadasInvertidas: number;
    elementosSemLinha: number;
  };
  bairros: string[];
  ruas: string[];
};

const RE_FOLDER = /<Folder>([\s\S]*?)<\/Folder>/g;
const RE_PLACEMARK = /<Placemark(\s[^>]*)?>([\s\S]*?)<\/Placemark>/g;

function tag(xml: string, nome: string): string | null {
  const m = new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`).exec(xml);
  if (!m) return null;
  const valor = decodeXml(m[1] ?? "").trim();
  return valor === "" ? null : valor;
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function atributoId(abertura: string | undefined): string | null {
  if (!abertura) return null;
  const m = /id="([^"]+)"/.exec(abertura);
  return m?.[1] ?? null;
}

function textoPonto(p: PontoBruto): string {
  return [p.nome, p.bairro, p.rua, p.endereco, p.original_name, p.original_description]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase();
}

function ehArcelorMittal(p: PontoBruto | undefined): boolean {
  if (!p) return false;
  const texto = textoPonto(p);
  return texto.includes("arcelormittal") || texto.includes("rodoviaria arcelor");
}

function ordenarPontosPorSentido(pontos: PontoBruto[], sentido: string): PontoBruto[] {
  if (pontos.length < 2) return pontos;
  const ida = sentido.toUpperCase().endsWith("I");
  const volta = sentido.toUpperCase().endsWith("V");
  const primeiroArcelor = ehArcelorMittal(pontos[0]);
  const ultimoArcelor = ehArcelorMittal(pontos[pontos.length - 1]);

  // Ida: bairro -> Rodoviária ArcelorMittal.
  if (ida && primeiroArcelor && !ultimoArcelor) return [...pontos].reverse();

  // Volta: Rodoviária ArcelorMittal -> bairro.
  if (volta && ultimoArcelor && !primeiroArcelor) return [...pontos].reverse();

  return pontos;
}

function limpar(s: string | null | undefined): string | null {
  if (!s) return null;
  const v = s.replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
}

/** Interpreta "33_I", "linha 33 - ida", "073B" etc. */
export function interpretarIdentificador(id: string): {
  numero: string;
  sentido: string;
  variante: string | null;
} {
  const bruto = id.trim();
  const numeroMatch = /(\d{1,4})/.exec(bruto);
  const digitos = numeroMatch?.[1] ?? null;
  const numero = digitos ? String(Number(digitos)) : bruto.toUpperCase();
  const resto = digitos ? bruto.slice((numeroMatch?.index ?? 0) + digitos.length) : "";
  const sufixo = limpar(resto.replace(/^[\s_\-–/.]+/, ""))?.toUpperCase() ?? null;
  const sentido = sufixo ? sufixo.replace(/[^A-Z0-9]/g, "").slice(0, 8) || "I" : "I";
  return { numero, sentido, variante: sufixo };
}

/** "Comum - JARDIM CAMBURI - R. CARLOS MARTINS" → tipo/bairro/rua */
export function interpretarDescricaoPonto(descricao: string | null) {
  const resultado = {
    tipo: null as string | null,
    bairro: null as string | null,
    rua: null as string | null,
    endereco: null as string | null,
  };
  if (!descricao) return resultado;
  const partes = descricao
    .split(/\s+-\s+|\s+–\s+/)
    .map((p) => limpar(p))
    .filter((p): p is string => Boolean(p));
  if (partes.length === 0) return resultado;

  resultado.tipo = partes[0] ?? null;
  const restantes = partes.slice(1);
  const primeiro = restantes[0];
  if (!primeiro) return resultado;

  // Apenas um valor numérico: é um código/referência, não bairro.
  if (restantes.length === 1 && /^\d+$/.test(primeiro)) {
    resultado.endereco = primeiro;
    return resultado;
  }
  if (restantes.length === 1) {
    resultado.bairro = primeiro;
    return resultado;
  }
  resultado.bairro = primeiro;
  resultado.rua = restantes.slice(1).join(" - ");
  resultado.endereco = [resultado.rua, resultado.bairro].filter(Boolean).join(", ");
  return resultado;
}

type Caixa = { minLon: number; maxLon: number; minLat: number; maxLat: number };
type Coordenada = { longitude: number; latitude: number; invertida: boolean };

function dentro(caixa: Caixa | null, lon: number, lat: number): boolean {
  if (!caixa) return false;
  const m = 0.5;
  return (
    lon >= caixa.minLon - m &&
    lon <= caixa.maxLon + m &&
    lat >= caixa.minLat - m &&
    lat <= caixa.maxLat + m
  );
}

/**
 * Normaliza um par de coordenadas para [longitude, latitude].
 * Usa a área geográfica dos trajetos como referência e, na ausência dela,
 * a amplitude válida de cada eixo.
 */
export function normalizarCoordenada(a: number, b: number, caixa: Caixa | null): Coordenada | null {
  const candidatos: Coordenada[] = [
    { longitude: a, latitude: b, invertida: false },
    { longitude: b, latitude: a, invertida: true },
  ];
  const validos = candidatos.filter(
    (c) =>
      Number.isFinite(c.longitude) &&
      Number.isFinite(c.latitude) &&
      Math.abs(c.longitude) <= 180 &&
      Math.abs(c.latitude) <= 90,
  );
  const primeiroValido = validos[0];
  if (!primeiroValido) return null;
  const naCaixa = validos.filter((c) => dentro(caixa, c.longitude, c.latitude));
  if (naCaixa[0]) return naCaixa[0];
  if (validos.length === 1) return primeiroValido;
  // Sem referência: maior valor absoluto normalmente é a longitude (Brasil).
  return Math.abs(a) >= Math.abs(b) ? primeiroValido : (validos[1] ?? primeiroValido);
}

function lerCoordenadas(bloco: string): Array<[number, number]> {
  const texto = tag(bloco, "coordinates");
  if (!texto) return [];
  const pares: Array<[number, number]> = [];
  for (const item of texto.split(/\s+/)) {
    const t = item.trim();
    if (!t) continue;
    const nums = t.split(",").map((n) => Number(n));
    const a = nums[0];
    const b = nums[1];
    if (a === undefined || b === undefined) continue;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    pares.push([a, b]);
  }
  return pares;
}

export function parseKml(xml: string): ResultadoParse {
  const erros: ErroImportacao[] = [];
  const linhas: LinhaBruta[] = [];
  let coordenadasInvalidas = 0;
  let coordenadasInvertidas = 0;
  let elementosSemLinha = 0;

  // 1ª passada: caixa geográfica dos trajetos (LineString = lon,lat,alt)
  let caixa: Caixa | null = null;
  const lineStrings = xml.match(/<LineString>[\s\S]*?<\/LineString>/g) ?? [];
  for (const ls of lineStrings) {
    for (const [lon, lat] of lerCoordenadas(ls)) {
      if (Math.abs(lon) > 180 || Math.abs(lat) > 90) continue;
      caixa = caixa
        ? {
            minLon: Math.min(caixa.minLon, lon),
            maxLon: Math.max(caixa.maxLon, lon),
            minLat: Math.min(caixa.minLat, lat),
            maxLat: Math.max(caixa.maxLat, lat),
          }
        : { minLon: lon, maxLon: lon, minLat: lat, maxLat: lat };
    }
  }

  const blocos: Array<{ identificador: string | null; conteudo: string }> = [];
  for (const m of xml.matchAll(RE_FOLDER)) {
    const conteudo = m[1] ?? "";
    blocos.push({ identificador: limpar(tag(conteudo, "name")), conteudo });
  }

  // KML sem pastas: tratar o documento inteiro como um grupo
  if (blocos.length === 0) {
    blocos.push({ identificador: null, conteudo: xml });
  }

  for (const bloco of blocos) {
    const placemarks = [...bloco.conteudo.matchAll(RE_PLACEMARK)].map((m) => ({
      abertura: m[1],
      conteudo: m[2] ?? "",
    }));
    const placemarkTrajeto = placemarks.find((p) => p.conteudo.includes("<LineString>"));
    const identificador =
      bloco.identificador ?? limpar(placemarkTrajeto ? tag(placemarkTrajeto.conteudo, "name") : null);

    if (!identificador) {
      elementosSemLinha += placemarks.length;
      erros.push({
        elemento: "grupo sem identificação",
        motivo: "Não foi possível identificar a linha deste grupo de elementos.",
      });
      continue;
    }

    const { numero, sentido, variante } = interpretarIdentificador(identificador);

    const trajeto: [number, number][] = [];
    if (placemarkTrajeto) {
      for (const [a, b] of lerCoordenadas(placemarkTrajeto.conteudo)) {
        const c = normalizarCoordenada(a, b, caixa);
        if (!c) {
          coordenadasInvalidas += 1;
          continue;
        }
        if (c.invertida) coordenadasInvertidas += 1;
        trajeto.push([c.longitude, c.latitude]);
      }
    } else {
      erros.push({ elemento: identificador, motivo: "Linha sem trajeto (LineString)." });
    }

    const pontos: PontoBruto[] = [];
    for (const pm of placemarks) {
      const conteudo = pm.conteudo;
      // Placemark com Point e Polygon (ou outras geometrias): usa só o Point.
      const pontoBloco = /<Point[\s>][\s\S]*?<\/Point>/.exec(conteudo)?.[0];
      if (!pontoBloco) continue;
      // Em <Point> as coordenadas vêm como "lon, lat": separa por vírgula.
      const nums = (tag(pontoBloco, "coordinates") ?? "").split(",").map((n) => parseFloat(n.trim()));
      const nomeOriginal = limpar(tag(conteudo, "name"));
      const descricaoOriginal = limpar(tag(conteudo, "description"));
      const par: [number, number] | null =
        nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1]) ? [nums[0]!, nums[1]!] : null;
      if (!par) {
        coordenadasInvalidas += 1;
        erros.push({
          elemento: `${identificador} / ${nomeOriginal ?? "ponto"}`,
          motivo: "Ponto sem coordenadas legíveis.",
        });
        continue;
      }
      const c = normalizarCoordenada(par[0], par[1], caixa);
      if (!c) {
        coordenadasInvalidas += 1;
        erros.push({
          elemento: `${identificador} / ${nomeOriginal ?? "ponto"}`,
          motivo: "Coordenada fora da faixa geográfica válida.",
        });
        continue;
      }
      if (c.invertida) coordenadasInvertidas += 1;

      const info = interpretarDescricaoPonto(descricaoOriginal);
      const pareceCodigo = nomeOriginal
        ? /^[A-Za-z]{0,4}[\d]{3,}[A-Za-z]?$/.test(nomeOriginal)
        : false;
      const codigo = pareceCodigo && nomeOriginal ? nomeOriginal.toUpperCase() : null;
      const nome = pareceCodigo ? (info.rua ?? info.bairro ?? nomeOriginal) : nomeOriginal;

      pontos.push({
        chave: codigo ?? `${nome ?? "ponto"}|${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`,
        codigo,
        nome,
        tipo: info.tipo,
        bairro: info.bairro,
        rua: info.rua,
        endereco: info.endereco,
        cidade: null,
        latitude: c.latitude,
        longitude: c.longitude,
        original_id: atributoId(pm.abertura),
        original_name: nomeOriginal,
        original_description: descricaoOriginal,
        coordenada_invertida: c.invertida,
      });
    }

    const pontosOrdenados = ordenarPontosPorSentido(pontos, sentido);
    const rotulo = (p: PontoBruto | undefined) => (p ? (p.bairro ?? p.nome ?? null) : null);
    const origem = rotulo(pontosOrdenados[0]);
    const destino = rotulo(pontosOrdenados[pontosOrdenados.length - 1]);

    linhas.push({
      identificador,
      numero,
      sentido,
      variante,
      nome: null,
      origem,
      destino,
      sentido_nome: origem && destino ? `${origem} → ${destino}` : null,
      original_description: placemarkTrajeto
        ? limpar(tag(placemarkTrajeto.conteudo, "description"))
        : null,
      trajeto,
      pontos: pontosOrdenados,
    });
  }

  const bairros = new Set<string>();
  const ruas = new Set<string>();
  const cidades = new Set<string>();
  const chaves = new Set<string>();
  let totalPontos = 0;
  for (const l of linhas) {
    for (const p of l.pontos) {
      totalPontos += 1;
      chaves.add(p.chave);
      if (p.bairro) bairros.add(p.bairro);
      if (p.rua) ruas.add(p.rua);
      if (p.cidade) cidades.add(p.cidade);
    }
  }

  return {
    linhas,
    erros,
    totais: {
      linhas: new Set(linhas.map((l) => l.numero)).size,
      trajetos: linhas.filter((l) => l.trajeto.length > 1).length,
      pontos: totalPontos,
      pontosUnicos: chaves.size,
      bairros: bairros.size,
      cidades: cidades.size,
      coordenadasInvalidas,
      coordenadasInvertidas,
      elementosSemLinha,
    },
    bairros: [...bairros].sort(),
    ruas: [...ruas].sort(),
  };
}

export function distanciaKm(trajeto: [number, number][]): number {
  const R = 6371;
  let total = 0;
  for (let i = 1; i < trajeto.length; i += 1) {
    const anterior = trajeto[i - 1];
    const atual = trajeto[i];
    if (!anterior || !atual) continue;
    const [lon1, lat1] = anterior;
    const [lon2, lat2] = atual;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    total += 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  return Math.round(total * 100) / 100;
}

export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
