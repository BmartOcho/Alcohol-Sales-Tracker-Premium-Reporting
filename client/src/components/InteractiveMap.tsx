import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CountySales } from "@shared/schema";

type InteractiveMapProps = {
  counties: CountySales[];
  onCountyClick?: (county: CountySales) => void;
  center?: [number, number];
  zoom?: number;
};

export function InteractiveMap({
  counties,
  onCountyClick,
  center = [31.9686, -99.9018],
  zoom = 6,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const countyLayerRef = useRef<L.GeoJSON | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Load GeoJSON data
  useEffect(() => {
    fetch("/texas-counties.geojson")
      .then((res) => res.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        className: "map-tiles",
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Render counties
  useEffect(() => {
    if (!mapRef.current || !geoJsonData || counties.length === 0) return;

    // Remove existing county layer
    if (countyLayerRef.current) {
      countyLayerRef.current.remove();
    }

    // Create county sales lookup map
    const countySalesMap = new Map<string, CountySales>();
    counties.forEach((county) => {
      countySalesMap.set(county.countyName.toUpperCase(), county);
    });

    // Find max sales for color scaling
    const maxSales = Math.max(...counties.map((c) => c.totalSales));

    // Get color based on sales amount
    const getColor = (sales: number) => {
      const ratio = sales / maxSales;
      if (ratio > 0.8) return "#7c2d12"; // dark brown
      if (ratio > 0.6) return "#9a3412";
      if (ratio > 0.4) return "#c2410c";
      if (ratio > 0.2) return "#ea580c";
      return "#f97316"; // light orange
    };

    // Style function for counties
    const style = (feature: any) => {
      const countyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const countyData = countySalesMap.get(countyName.toUpperCase());
      
      return {
        fillColor: countyData ? getColor(countyData.totalSales) : "#d1d5db",
        weight: 1,
        opacity: 1,
        color: "#6b7280",
        fillOpacity: countyData ? 0.7 : 0.3,
      };
    };

    // Hover and click handlers
    const onEachFeature = (feature: any, layer: L.Layer) => {
      const countyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const countyData = countySalesMap.get(countyName.toUpperCase());

      if (countyData) {
        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const layer = e.target;
            layer.setStyle({
              weight: 3,
              color: "#1f2937",
              fillOpacity: 0.9,
            });
            layer.bringToFront();

            // Show tooltip
            const tooltip = L.tooltip({
              permanent: false,
              direction: "top",
              className: "county-tooltip",
            })
              .setLatLng(e.latlng)
              .setContent(
                `<div style="font-family: Inter, sans-serif; padding: 4px;">
                  <strong style="font-size: 14px;">${countyData.countyName}</strong><br/>
                  <span style="font-size: 12px; color: #6b7280;">Total Sales: <strong>$${countyData.totalSales.toLocaleString()}</strong></span><br/>
                  <span style="font-size: 11px; color: #9ca3af;">
                    Liquor: $${countyData.liquorSales.toLocaleString()} | 
                    Wine: $${countyData.wineSales.toLocaleString()} | 
                    Beer: $${countyData.beerSales.toLocaleString()}
                  </span><br/>
                  <span style="font-size: 11px; color: #9ca3af;">${countyData.locationCount} locations</span>
                </div>`
              )
              .addTo(mapRef.current!);

            layer._tooltip = tooltip;
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            const layer = e.target;
            countyLayerRef.current?.resetStyle(layer);
            if (layer._tooltip) {
              mapRef.current?.removeLayer(layer._tooltip);
              layer._tooltip = null;
            }
          },
          click: () => {
            if (onCountyClick) {
              onCountyClick(countyData);
            }
          },
        });
      }
    };

    // Add county layer
    countyLayerRef.current = L.geoJSON(geoJsonData, {
      style,
      onEachFeature,
    }).addTo(mapRef.current);
  }, [geoJsonData, counties, onCountyClick]);

  return <div ref={mapContainerRef} className="w-full h-full" data-testid="map-container" />;
}
