CREATE TABLE public.arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  importado_em timestamptz NOT NULL DEFAULT now(),
  total_linhas integer NOT NULL DEFAULT 0,
  total_pontos integer NOT NULL DEFAULT 0,
  total_invertidos integer NOT NULL DEFAULT 0,
  total_suspeitos integer NOT NULL DEFAULT 0,
  importado_por uuid
);
GRANT SELECT ON public.arquivos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arquivos TO authenticated;
GRANT ALL ON public.arquivos TO service_role;
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arquivos leitura publica" ON public.arquivos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "arquivos admin insere" ON public.arquivos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "arquivos admin edita" ON public.arquivos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "arquivos admin exclui" ON public.arquivos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id uuid NOT NULL REFERENCES public.arquivos(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  sentido text NOT NULL DEFAULT 'I',
  nome text,
  origem text,
  destino text,
  kml_id text,
  descricao_original text,
  trajeto_original jsonb NOT NULL DEFAULT '[]'::jsonb,
  trajeto_editado jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rotas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas TO authenticated;
GRANT ALL ON public.rotas TO service_role;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotas leitura publica" ON public.rotas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rotas admin insere" ON public.rotas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rotas admin edita" ON public.rotas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rotas admin exclui" ON public.rotas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX rotas_arquivo_idx ON public.rotas(arquivo_id);
CREATE INDEX rotas_codigo_idx ON public.rotas(codigo);
CREATE TRIGGER trg_rotas_updated BEFORE UPDATE ON public.rotas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.paradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id uuid NOT NULL REFERENCES public.arquivos(id) ON DELETE CASCADE,
  rota_id uuid NOT NULL REFERENCES public.rotas(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  kml_id text,
  nome text,
  tipo text,
  bairro text,
  rua text,
  descricao_original text,
  lat_original double precision NOT NULL,
  lon_original double precision NOT NULL,
  lat_editada double precision,
  lon_editada double precision,
  invertido boolean NOT NULL DEFAULT false,
  suspeito boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.paradas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paradas TO authenticated;
GRANT ALL ON public.paradas TO service_role;
ALTER TABLE public.paradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paradas leitura publica" ON public.paradas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "paradas admin insere" ON public.paradas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "paradas admin edita" ON public.paradas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "paradas admin exclui" ON public.paradas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX paradas_arquivo_idx ON public.paradas(arquivo_id);
CREATE INDEX paradas_rota_ordem_idx ON public.paradas(rota_id, ordem);

CREATE OR REPLACE FUNCTION public.marcar_suspeito()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE la double precision; lo double precision;
BEGIN
  la := coalesce(NEW.lat_editada, NEW.lat_original);
  lo := coalesce(NEW.lon_editada, NEW.lon_original);
  NEW.suspeito := NOT (la BETWEEN -21.5 AND -19.5 AND lo BETWEEN -41.5 AND -39.5);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_paradas_suspeito BEFORE INSERT OR UPDATE ON public.paradas FOR EACH ROW EXECUTE FUNCTION public.marcar_suspeito();
CREATE TRIGGER trg_paradas_updated BEFORE UPDATE ON public.paradas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();