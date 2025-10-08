import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: "liquor" | "wine" | "beer";
  sales: number;
};

type InteractiveMapProps = {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  center?: [number, number];
  zoom?: number;
};

const categoryColors = {
  liquor: "#a855f7",
  wine: "#e11d48", 
  beer: "#f59e0b",
};

export function InteractiveMap({
  markers,
  onMarkerClick,
  center = [31.9686, -99.9018],
  zoom = 6,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        className: "map-tiles",
      }).addTo(mapRef.current);

      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background-color: ${categoryColors[marker.category]}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
        .bindPopup(
          `<div style="font-family: Inter, sans-serif;">
            <strong style="font-size: 14px;">${marker.name}</strong><br/>
            <span style="color: ${categoryColors[marker.category]}; font-weight: 600;">
              ${marker.category.charAt(0).toUpperCase() + marker.category.slice(1)}
            </span><br/>
            <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">
              $${marker.sales.toLocaleString()}
            </span>
          </div>`
        )
        .on("click", () => {
          if (onMarkerClick) {
            onMarkerClick(marker);
          }
        });

      markersLayerRef.current?.addLayer(leafletMarker);
    });
  }, [markers, onMarkerClick]);

  return <div ref={mapContainerRef} className="w-full h-full" data-testid="map-container" />;
}
