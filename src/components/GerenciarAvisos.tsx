import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todosAvisosQuery } from "@/lib/dados";
import type { AvisoLinha } from "@/lib/dados";

type Alvo = "todas" | "linha" | "itinerario";
type Form = {
  titulo: string;
  mensagem: string;
  tipo: AvisoLinha["tipo"];
  alvo: Alvo;
  codigo_linha: string;
  rota_id: string;
  inicio_em: string;
  fim_em: string;
  ativo: boolean;
};

const localInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const novoForm = (): Form => {
  const agora = new Date();
  const fim = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  return { titulo: "", mensagem: "", tipo: "informativo", alvo: "todas", codigo_linha: "", rota_id: "", inicio_em: localInput(agora), fim_em: localInput(fim), ativo: true };
};

export function GerenciarAvisos() {
  const qc = useQueryClient();
  const { data: avisos = [], isLoading, error } = useQuery(todosAvisosQuery);
  const rotas = useQuery({
    queryKey: ["admin-rotas-avisos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotas").select("id, codigo, origem, destino").eq("ativo", true).order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState<Form>(novoForm);
  const [editando, setEditando] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);

  const codigos = useMemo(
    () => [...new Set((rotas.data ?? []).map((r) => r.codigo.split("_")[0]))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [rotas.data],
  );

  const limpar = () => { setEditando(null); setForm(novoForm()); setEstado(null); };

  const editar = (a: AvisoLinha) => {
    const rota = a.rota_id ? (rotas.data ?? []).find((r) => r.id === a.rota_id) : null;
    setEditando(a.id);
    setForm({
      titulo: a.titulo,
      mensagem: a.mensagem,
      tipo: a.tipo,
      alvo: a.rota_id ? "itinerario" : a.codigo_linha ? "linha" : "todas",
      codigo_linha: a.codigo_linha ?? "",
      rota_id: a.rota_id ?? "",
      inicio_em: localInput(new Date(a.inicio_em)),
      fim_em: localInput(new Date(a.fim_em)),
      ativo: a.ativo,
    });
    if (rota) setForm((old) => ({ ...old, rota_id: rota.id }));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const salvar = async () => {
    if (!form.titulo.trim() || !form.mensagem.trim()) return setEstado("Preencha título e mensagem.");
    if (!form.fim_em || new Date(form.fim_em) <= new Date(form.inicio_em)) return setEstado("A data final deve ser posterior à inicial.");
    const payload = {
      titulo: form.titulo.trim(),
      mensagem: form.mensagem.trim(),
      tipo: form.tipo,
      codigo_linha: form.alvo === "linha" ? form.codigo_linha : null,
      rota_id: form.alvo === "itinerario" ? form.rota_id : null,
      inicio_em: new Date(form.inicio_em).toISOString(),
      fim_em: new Date(form.fim_em).toISOString(),
      ativo: form.ativo,
    };
    setEstado("Salvando…");
    const result = editando
      ? await supabase.from("avisos_linha").update(payload).eq("id", editando)
      : await supabase.from("avisos_linha").insert(payload);
    if (result.error) return setEstado(`Não foi possível salvar: ${result.error.message}`);
    setEstado(editando ? "Aviso atualizado." : "Aviso criado.");
    limpar();
    qc.invalidateQueries({ queryKey: ["avisos-admin"] });
    qc.invalidateQueries({ queryKey: ["avisos-ativos"] });
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este aviso?")) return;
    const { error } = await supabase.from("avisos_linha").delete().eq("id", id);
    if (error) return alert(`Não foi possível excluir: ${error.message}`);
    qc.invalidateQueries({ queryKey: ["avisos-admin"] });
    qc.invalidateQueries({ queryKey: ["avisos-ativos"] });
  };

  const alternar = async (a: AvisoLinha) => {
    const { error } = await supabase.from("avisos_linha").update({ ativo: !a.ativo }).eq("id", a.id);
    if (error) return alert(`Não foi possível alterar: ${error.message}`);
    qc.invalidateQueries({ queryKey: ["avisos-admin"] });
    qc.invalidateQueries({ queryKey: ["avisos-ativos"] });
  };

  return (
    <section className="mt-6 space-y-4">
      <div>
        <h2 className="font-display text-3xl">Avisos das linhas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Publique avisos para todos, para o número-base (ex.: 300) ou para um itinerário específico (ex.: 300_I).</p>
      </div>

      <div className="superficie space-y-3 p-4">
        <h3 className="font-semibold">{editando ? "Editar aviso" : "Novo aviso"}</h3>
        <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título do aviso" aria-label="Título do aviso" className="h-11 w-full rounded-md border bg-card px-3" />
        <textarea value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Mensagem" aria-label="Mensagem do aviso" rows={4} className="w-full rounded-md border bg-card p-3" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Form["tipo"] })} className="mt-1 h-11 w-full rounded-md border bg-card px-3">
              <option value="informativo">Informativo</option><option value="desvio">Desvio</option><option value="atencao">Atenção</option>
            </select>
          </label>
          <label className="text-sm">Aplicar a
            <select value={form.alvo} onChange={(e) => setForm({ ...form, alvo: e.target.value as Alvo, codigo_linha: "", rota_id: "" })} className="mt-1 h-11 w-full rounded-md border bg-card px-3">
              <option value="todas">Todas as linhas</option><option value="linha">Número da linha</option><option value="itinerario">Itinerário específico</option>
            </select>
          </label>
        </div>
        {form.alvo === "linha" && (
          <label className="block text-sm">Linha
            <select value={form.codigo_linha} onChange={(e) => setForm({ ...form, codigo_linha: e.target.value })} className="mt-1 h-11 w-full rounded-md border bg-card px-3">
              <option value="">Selecione</option>{codigos.map((c) => <option key={c} value={c}>{c} — todos os itinerários</option>)}
            </select>
          </label>
        )}
        {form.alvo === "itinerario" && (
          <label className="block text-sm">Itinerário
            <select value={form.rota_id} onChange={(e) => setForm({ ...form, rota_id: e.target.value })} className="mt-1 h-11 w-full rounded-md border bg-card px-3">
              <option value="">Selecione</option>
              {(rotas.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.codigo} — {r.origem ?? "?"} → {r.destino ?? "?"}</option>)}
            </select>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Início
            <input type="datetime-local" value={form.inicio_em} onChange={(e) => setForm({ ...form, inicio_em: e.target.value })} className="mt-1 h-11 w-full rounded-md border bg-card px-3" />
          </label>
          <label className="text-sm">Fim
            <input type="datetime-local" value={form.fim_em} onChange={(e) => setForm({ ...form, fim_em: e.target.value })} className="mt-1 h-11 w-full rounded-md border bg-card px-3" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Aviso ativo</label>
        {estado && <p className="text-sm">{estado}</p>}
        <div className="flex flex-wrap gap-2">
          <button onClick={salvar} className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">{editando ? "Salvar alterações" : "Criar aviso"}</button>
          {editando && <button onClick={limpar} className="h-11 rounded-md border px-4">Cancelar</button>}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm">Carregando avisos…</p>}
        {error && <p className="text-sm text-destructive">Não foi possível carregar os avisos. Verifique se a migração foi aplicada.</p>}
        {!isLoading && !error && avisos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aviso cadastrado.</p>}
        {avisos.map((a) => (
          <article key={a.id} className="superficie space-y-2 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <strong>{a.titulo}</strong>
                <p className="text-xs text-muted-foreground">
                  {a.rota_id ? (rotas.data ?? []).find((r) => r.id === a.rota_id)?.codigo ?? "Itinerário" : a.codigo_linha ? `Linha ${a.codigo_linha}` : "Todas as linhas"}
                  {" · "}{a.tipo}{" · "}{a.ativo ? "ativo" : "inativo"}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => alternar(a)} className="underline">{a.ativo ? "Desativar" : "Ativar"}</button>
                <button onClick={() => editar(a)} className="underline">Editar</button>
                <button onClick={() => excluir(a.id)} className="text-destructive underline">Excluir</button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{a.mensagem}</p>
            <p className="text-xs text-muted-foreground">Vigência: {new Date(a.inicio_em).toLocaleString("pt-BR")} até {new Date(a.fim_em).toLocaleString("pt-BR")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
