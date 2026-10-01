import L from "leaflet";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Bus } from "lucide-react";

export type EstadoPonto = "normal" | "selecionado" | "suspeito" | "origem" | "destino";

const cache = new Map<string, L.DivIcon>();

const estilos: Record<EstadoPonto, { background: string; border: string; icon: string }> = {
  normal: { background: "#ffffff", border: "#1e4a8c", icon: "#1e4a8c" },
  selecionado: { background: "#d93025", border: "#8b1e17", icon: "#ffffff" },
  suspeito: { background: "#f0a92a", border: "#9a6500", icon: "#3d2a00" },
  origem: { background: "#16834b", border: "#0b5c33", icon: "#ffffff" },
  destino: { background: "#7048a8", border: "#4d2f77", icon: "#ffffff" },
};

export function getIconePonto(estado: EstadoPonto, label = "Ponto de parada"): L.DivIcon {
  const key = `ponto:${estado}:${label}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const style = estilos[estado];
  const svg = renderToStaticMarkup(createElement(Bus, { size: 17, strokeWidth: 2.25 }));
  const safeLabel = label.replace(/"/g, "&quot;");
  const icon = L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<div role="button" tabindex="0" aria-label="${safeLabel}" title="${safeLabel}" style="width:44px;height:44px;display:grid;place-items:center;"><span style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:${style.background};border:2px solid ${style.border};color:${style.icon};box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.25);">${svg}</span></div>`,
  });
  cache.set(key, icon);
  return icon;
}

export function getIconeCluster(count: number): L.DivIcon {
  const size = count >= 100 ? 46 : count >= 20 ? 42 : 38;
  const key = `cluster:${size}:${count}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div role="button" aria-label="${count} pontos agrupados" title="${count} pontos agrupados" style="width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;background:#1e4a8c;color:#fff;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.3);font:700 13px/1 sans-serif;">${count}</div>`,
  });
  cache.set(key, icon);
  return icon;
}

export function getIconeVertice(): L.DivIcon {
  const key = "vertice";
  const cached = cache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: '<div aria-label="Vértice editável" title="Vértice editável" style="width:14px;height:14px;background:#f0a92a;border:2px solid #1e4a8c;box-sizing:border-box;"></div>',
  });
  cache.set(key, icon);
  return icon;
}
