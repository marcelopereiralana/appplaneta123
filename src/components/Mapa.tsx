import { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { getIconeCluster, getIconePonto } from "./mapaIcons";

export type PontoMapa = { id: string; nome: string | null; latitude: number; longitude: number; ordem?: number };

export default function Mapa({ trajeto, pontos }: { trajeto: [number, number][]; pontos: PontoMapa[] }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const linha = trajeto.map(([lon, lat]) => [lat, lon] as [number, number]);
  const todos: [number, number][] = linha.length ? linha : pontos.map((p) => [p.latitude, p.longitude]);
  const bounds = todos.length ? todos : [[-20.3, -40.3] as [number, number]];
  const usarCluster = pontos.length > 30;

  return (
    <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {linha.length > 1 && <Polyline positions={linha} pathOptions={{ color: "#1e4a8c", weight: 5 }} />}
      {usarCluster ? (
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={(cluster) => getIconeCluster(cluster.getChildCount())}
        >
          {pontos.map((p, i) => {
            const estado = p.id === selecionado
              ? "selecionado"
              : i === 0
                ? "origem"
                : i === pontos.length - 1
                  ? "destino"
                  : "normal";
            const label = `${p.ordem ? `${p.ordem}. ` : ""}${p.nome ?? "Ponto"}`;
            return (
              <Marker
                key={p.id + i}
                position={[p.latitude, p.longitude]}
                icon={getIconePonto(estado, label)}
                eventHandlers={{ click: () => setSelecionado(p.id) }}
              >
                <Popup>{label}</Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      ) : (
        pontos.map((p, i) => {
          const estado = p.id === selecionado
            ? "selecionado"
            : i === 0
              ? "origem"
              : i === pontos.length - 1
                ? "destino"
                : "normal";
          const label = `${p.ordem ? `${p.ordem}. ` : ""}${p.nome ?? "Ponto"}`;
          return (
            <Marker
              key={p.id + i}
              position={[p.latitude, p.longitude]}
              icon={getIconePonto(estado, label)}
              eventHandlers={{ click: () => setSelecionado(p.id) }}
            >
              <Popup>{label}</Popup>
            </Marker>
          );
        })
      )}
    </MapContainer>
  );
}
