import { AlertTriangle, Info, Route as RouteIcon } from "lucide-react";
import type { AvisoLinha } from "@/lib/dados";

const estilos = {
  informativo: "border-primary/30 bg-primary/5",
  desvio: "border-orange-500/40 bg-orange-500/10",
  atencao: "border-destructive/40 bg-destructive/10",
} as const;

const Icone = {
  informativo: Info,
  desvio: RouteIcon,
  atencao: AlertTriangle,
} as const;

export function AvisosLinha({ avisos }: { avisos: AvisoLinha[] }) {
  if (avisos.length === 0) return null;
  return (
    <section aria-label="Avisos desta linha" className="mt-4 space-y-2">
      {avisos.map((aviso) => {
        const Icon = Icone[aviso.tipo];
        return (
          <article key={aviso.id} className={`rounded-lg border p-3 ${estilos[aviso.tipo]}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-semibold">{aviso.titulo}</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm">{aviso.mensagem}</p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
