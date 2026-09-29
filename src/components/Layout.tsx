import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Topo() {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-display text-2xl tracking-wide">
          Consulta de Itinerários
        </Link>
        <Link to="/linhas" className="text-sm font-semibold underline-offset-4 hover:underline">
          Todas as linhas
        </Link>
      </div>
    </header>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topo />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-muted-foreground">
        <Link to="/admin" className="underline">Área administrativa</Link>
      </footer>
    </div>
  );
}

export function CartaoLinha({
  id,
  numero,
  origem,
  destino,
  extra,
}: {
  id: string;
  numero: string;
  origem: string | null;
  destino: string | null;
  extra?: string;
}) {
  return (
    <Link
      to="/linha/$id"
      params={{ id }}
      className="superficie flex items-center gap-4 p-3 transition hover:border-primary"
    >
      <span className="selo-linha shrink-0">{numero}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{origem ?? "Origem não informada"}</span>
        <span className="block truncate text-sm text-muted-foreground">→ {destino ?? "Destino não informado"}</span>
        {extra && <span className="mt-0.5 block text-xs text-muted-foreground">{extra}</span>}
      </span>
    </Link>
  );
}
