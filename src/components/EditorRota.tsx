import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMapEvents } from "react-leaflet";

export type ParadaEd = { id: string; ordem: number; nome: string | null; lat: number; lon: number; suspeito: boolean; editado: boolean };

const iconePonto = (n: number, suspeito: boolean, sel: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:600 10px sans-serif;border:2px solid ${sel ? "#000" : "#1e4a8c"};background:${suspeito ? "#d93025" : "#fff"};color:${suspeito ? "#fff" : "#1e4a8c"}">${n}</div>`,
  });
const iconeVertice = L.divIcon({
  className: "",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  html: `<div style="width:10px;height:10px;background:#f0a92a;border:1px solid #1e4a8c"></div>`,
});

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
        <Marker key={`${i}-${lon}-${lat}`} position={[lat, lon]} icon={iconeVertice} draggable
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
      {paradas.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lon]} icon={iconePonto(p.ordem, p.suspeito, p.id === selecionada)} draggable
          eventHandlers={{
            click: () => onSelecionar(p.id),
            dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMoverParada(p.id, ll.lat, ll.lng); },
          }}>
          <Tooltip>{p.ordem}. {p.nome ?? "Ponto"}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
