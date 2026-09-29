# Novo esquema, importação com normalizeCoord e telas de edição

## Situação atual
O banco deste projeto já contém as tabelas do modelo antigo (linhas, pontos, itinerarios, trajetos, localidades, importacoes, auditoria). Tabelas não podem ser apagadas por migração sem quebrar o app no ar, então o novo modelo entra em **tabelas novas**, e as antigas ficam marcadas como descontinuadas (vazias depois que o app trocar para as novas).

## Etapa 1 — Esquema (uma migração)

```text
arquivos (1) ──< rotas (1) ──< paradas
                     │
alteracoes (entidade, registro, campo, antigo, novo, data, usuário)
```

- **arquivos**: id, nome, importado_em, total_linhas, total_pontos, importado_por.
- **rotas** (linhas): id próprio, arquivo_id → arquivos ON DELETE CASCADE, codigo (ex. "33"), sentido, nome, origem, destino, kml_id (informativo), descricao_original, trajeto_original (jsonb, lista [lon,lat]), trajeto_editado (jsonb, nulo se não editado), ativo, datas.
- **paradas** (pontos): id próprio, rota_id → rotas ON DELETE CASCADE, arquivo_id → arquivos ON DELETE CASCADE, ordem, kml_id (ex. p_15, informativo), nome, tipo, bairro, rua, lat_original / lon_original (double precision), lat_editada / lon_editada (nulas até editar), suspeito (booleano), corrigido (booleano: normalizeCoord alterou o valor), descricao_original.
- **suspeito** calculado por gatilho no banco sobre a posição efetiva (editada ou original): fora de lat -21.5..-19.5 ou lon -41.5..-39.5.
- **alteracoes**: id, entidade, registro_id, campo, valor_antigo, valor_novo, alterado_em, usuario_id, usuario_email.
- Índices: rotas(arquivo_id), rotas(codigo), paradas(arquivo_id), paradas(rota_id, ordem).
- Acesso: leitura pública em arquivos/rotas/paradas; escrita (inserir, editar, excluir) só para administradores. alteracoes: leitura e gravação só para administradores.
- Funções de busca pública (por bairro/rua/linha) recriadas sobre as tabelas novas.

## Etapa 2 — Importação
- `normalizeCoord(a, b)`: devolve {lat, lon, corrigido}. Aceita vírgula decimal, troca lat/lon invertidos usando a região de Vitória como referência, corrige sinal ausente (ex. 20.3 → -20.3) quando isso cai na região; valores inválidos são descartados e contados como erro.
- Aplicada a todos os pontos e ao trajeto antes de gravar.
- Cada importação cria um novo arquivo (não substitui os anteriores). Se algo falhar, o arquivo parcial é excluído (a cascata limpa tudo).
- Resumo mostrado antes e depois de gravar: total de pontos, corrigidos, suspeitos (com lista dos suspeitos: linha, ordem, kml_id, coordenada).

## Etapa 3 — Telas de edição (área administrativa)
- Lista de arquivos com totais e botão excluir (confirmação; remove só as linhas/pontos daquele arquivo).
- Lista de linhas por arquivo, filtro por código; editar nome/origem/destino/ativo.
- Edição de pontos da linha: tabela na ordem, destaque dos suspeitos, editar posição (campos ou arrastar no mapa), botão "voltar ao original" (limpa a posição editada).
- Edição do trajeto: arrastar vértices no mapa; "voltar ao original".
- Toda alteração grava uma linha em alteracoes; aba "Histórico de alterações".

## Etapa 4 — Páginas públicas
Busca, página da linha, do ponto e do bairro passam a ler as tabelas novas, sempre usando a posição/trajeto editado quando existir.

## Detalhes técnicos
- Escritas de admin continuam pelo cliente do navegador sob as regras de acesso de admin (padrão atual do projeto).
- Tabelas antigas recebem comentário "DEPRECATED"; nada mais as referencia.
- Histórico de alterações gravado no cliente junto de cada edição (mesma transação lógica do padrão atual).
