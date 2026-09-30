import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMapEvents } from "react-leaflet";
import { getIconePonto, getIconeVertice } from "./mapaIcons";

export type ParadaEd = { id: string; ordem: number; nome: string | null; lat: number; lon: number; suspeito: boolean; editado: boolean };

function Vertices({ trajeto, onMover }: { trajeto: [number, number][]; onMover: (i: number, lon: number, lat: number) => void }) {
  const [view, setView] = useState<{ b: L.LatLngBounds; z: number } | null>(null);
  const map = useMapEvents({
    moveend: () => setView({ b: map.getBounds(), z: map.getZoom() }),
    zoomend: () => setView({ b: map.getBounds(), z: map.getZoom() }),
  });
  if (!view || view.z < 15) return null;
  const visiveis = trajeto.map((c, i) => [c, i] as const).filter(([[lon, lat]]) => view.b.contains([lat, lon]));
  if (visiveis.length > 300) return null;
  return (
    <>
      {visiveis.map(([[lon, lat], i]) => (
        <Marker key={`${i}-${lon}-${lat}`} position={[lat, lon]} icon={getIconeVertice()} draggable
          eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onMover(i, p.lng, p.lat); } }} />
      ))}
    </>
  );
}

export default function EditorRota({
  trajeto, paradas, selecionada, onSelecionar, onMoverParada, onMoverVertice,
}: {
  trajeto: [number, number][];
  paradas: ParadaEd[];
  selecionada: string | null;
  onSelecionar: (id: string) => void;
  onMoverParada: (id: string, lat: number, lon: number) => void;
  onMoverVertice: (i: number, lon: number, lat: number) => void;
}) {
  const bounds = useMemo(() => {
    const t: [number, number][] = trajeto.length ? trajeto.map(([lon, lat]) => [lat, lon]) : paradas.map((p) => [p.lat, p.lon]);
    return t.length ? L.latLngBounds(t) : L.latLngBounds([[-20.4, -40.4], [-20.2, -40.2]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <MapContainer bounds={bounds} className="h-full w-full">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {trajeto.length > 1 && <Polyline positions={trajeto.map(([lon, lat]) => [lat, lon] as [number, number])} pathOptions={{ color: "#1e4a8c", weight: 4 }} />}
      <Vertices trajeto={trajeto} onMover={onMoverVertice} />
      {paradas.map((p, i) => {
        const estado = p.id === selecionada
          ? "selecionado"
          : p.suspeito
            ? "suspeito"
            : i === 0
              ? "origem"
              : i === paradas.length - 1
                ? "destino"
                : "normal";
        const label = `${p.ordem}. ${p.nome ?? "Ponto"}`;
        return (
          <Marker key={p.id} position={[p.lat, p.lon]} icon={getIconePonto(estado, label)} draggable
            title={label}
            alt={`${label} - ponto editável`}
            eventHandlers={{
              click: () => onSelecionar(p.id),
              dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverParada(p.id, ll.lat, ll.lng); },
            }}>
            <Tooltip>{label}</Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
