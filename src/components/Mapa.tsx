import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";

export type PontoMapa = { id: string; nome: string | null; latitude: number; longitude: number; ordem?: number };

export default function Mapa({ trajeto, pontos }: { trajeto: [number, number][]; pontos: PontoMapa[] }) {
  const linha = trajeto.map(([lon, lat]) => [lat, lon] as [number, number]);
  const todos: [number, number][] = linha.length ? linha : pontos.map((p) => [p.latitude, p.longitude]);
  const bounds = todos.length ? todos : [[-20.3, -40.3] as [number, number]];
  return (
    <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {linha.length > 1 && <Polyline positions={linha} pathOptions={{ color: "#1e4a8c", weight: 5 }} />}
      {pontos.map((p, i) => (
        <CircleMarker
          key={p.id + i}
          center={[p.latitude, p.longitude]}
          radius={i === 0 || i === pontos.length - 1 ? 8 : 5}
          pathOptions={{ color: "#1e4a8c", fillColor: i === 0 || i === pontos.length - 1 ? "#f0a92a" : "#fff", fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            {p.ordem ? `${p.ordem}. ` : ""}
            {p.nome ?? "Ponto"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
