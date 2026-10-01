CREATE TABLE public.avisos_linha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'informativo' CHECK (tipo IN ('informativo','desvio','atencao')),
  codigo_linha text,
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avisos_linha_alvo_ck CHECK (codigo_linha IS NULL OR length(trim(codigo_linha)) > 0)
);

GRANT SELECT ON public.avisos_linha TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos_linha TO authenticated;
GRANT ALL ON public.avisos_linha TO service_role;

ALTER TABLE public.avisos_linha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avisos leitura publica" ON public.avisos_linha
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "avisos admin insere" ON public.avisos_linha
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "avisos admin edita" ON public.avisos_linha
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "avisos admin exclui" ON public.avisos_linha
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX avisos_linha_codigo_idx ON public.avisos_linha(codigo_linha);
CREATE INDEX avisos_linha_validade_idx ON public.avisos_linha(ativo, inicio_em, fim_em);
CREATE TRIGGER trg_avisos_linha_updated BEFORE UPDATE ON public.avisos_linha
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
