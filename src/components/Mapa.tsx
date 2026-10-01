import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { LocateFixed, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { getIconeCluster, getIconePonto } from "./mapaIcons";

export type PontoMapa = { id: string; nome: string | null; latitude: number; longitude: number; ordem?: number };

type LocalizacaoUsuario = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

function distanciaMetros(a: LocalizacaoUsuario, b: PontoMapa) {
  const R = 6371000;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatarDistancia(metros: number) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

function ControleLocalizacao({
  localizacao,
  setLocalizacao,
}: {
  localizacao: LocalizacaoUsuario | null;
  setLocalizacao: (valor: LocalizacaoUsuario | null) => void;
}) {
  const map = useMap();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!localizacao) return;
    map.flyTo([localizacao.latitude, localizacao.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.8,
    });
  }, [localizacao, map]);

  const localizar = () => {
    if (!("geolocation" in navigator)) {
      setErro("Seu dispositivo/navegador não disponibiliza localização.");
      return;
    }

    setCarregando(true);
    setErro(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalizacao({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setCarregando(false);
      },
      (error) => {
        const mensagem =
          error.code === error.PERMISSION_DENIED
            ? "Permita o acesso à localização para usar esta função."
            : error.code === error.TIMEOUT
              ? "Não foi possível obter sua localização a tempo. Tente novamente."
              : "Não foi possível obter sua localização.";
        setErro(mensagem);
        setCarregando(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );
  };

  return (
    <>
      <div className="leaflet-top leaflet-right" style={{ zIndex: 1000 }}>
        <div className="leaflet-control leaflet-bar !border-0">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-md border shadow-md"
            onClick={localizar}
            disabled={carregando}
            title="Mostrar minha localização"
            aria-label="Mostrar minha localização"
          >
            <LocateFixed className={carregando ? "h-5 w-5 animate-pulse" : "h-5 w-5"} />
          </Button>
        </div>
        {erro && (
          <div className="mr-2 mt-1 max-w-64 rounded-md bg-background/95 px-3 py-2 text-xs shadow-md">
            {erro}
          </div>
        )}
      </div>

      {localizacao && (
        <>
          <Circle
            center={[localizacao.latitude, localizacao.longitude]}
            radius={localizacao.accuracy}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12, weight: 1 }}
          />
          <CircleMarker
            center={[localizacao.latitude, localizacao.longitude]}
            radius={7}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
          >
            <Popup>Você está aqui</Popup>
          </CircleMarker>
        </>
      )}
    </>
  );
}

function ParadasProximas({
  localizacao,
  pontos,
}: {
  localizacao: LocalizacaoUsuario | null;
  pontos: PontoMapa[];
}) {
  const map = useMap();

  const proximas = useMemo(() => {
    if (!localizacao) return [];
    return pontos
      .map((ponto) => ({ ponto, distancia: distanciaMetros(localizacao, ponto) }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 5);
  }, [localizacao, pontos]);

  if (!localizacao || !proximas.length) return null;

  return (
    <div className="leaflet-bottom leaflet-left" style={{ zIndex: 1000 }}>
      <div className="leaflet-control mb-2 ml-2 w-[min(320px,calc(100vw-32px))] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Navigation className="h-4 w-4" />
          Pontos mais próximos
        </div>
        <div className="space-y-1">
          {proximas.map(({ ponto, distancia }) => (
            <button
              key={ponto.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                map.flyTo([ponto.latitude, ponto.longitude], Math.max(map.getZoom(), 17), { duration: 0.6 });
              }}
            >
              <span className="min-w-0 truncate">
                {ponto.ordem ? `${ponto.ordem}. ` : ""}{ponto.nome ?? "Ponto"}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatarDistancia(distancia)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Mapa({ trajeto, pontos }: { trajeto: [number, number][]; pontos: PontoMapa[] }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [localizacao, setLocalizacao] = useState<LocalizacaoUsuario | null>(null);
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
      <ControleLocalizacao localizacao={localizacao} setLocalizacao={setLocalizacao} />
      <ParadasProximas localizacao={localizacao} pontos={pontos} />
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
