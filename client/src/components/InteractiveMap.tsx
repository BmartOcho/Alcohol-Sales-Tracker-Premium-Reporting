import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationSummary } from "@shared/schema";

type InteractiveMapProps = {
  locations: LocationSummary[];
  onLocationClick?: (location: LocationSummary) => void;
  onCountyClick?: (countyName: string) => void;
  selectedCounty?: string | null;
  center?: [number, number];
  zoom?: number;
};

export function InteractiveMap({
  locations,
  onLocationClick,
  onCountyClick,
  selectedCounty,
  center = [31.9686, -99.9018],
  zoom = 6,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const countyLayerRef = useRef<L.GeoJSON | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Load GeoJSON data for county boundaries
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

      // Initialize markers layer
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Render county overlay polygons
  useEffect(() => {
    if (!mapRef.current || !geoJsonData || !locations) return;

    // Remove existing county layer
    if (countyLayerRef.current) {
      countyLayerRef.current.remove();
    }

    // Create location lookup by county
    const locationsByCounty = new Map<string, LocationSummary[]>();
    locations.forEach((location) => {
      const county = location.locationCounty.toUpperCase();
      if (!locationsByCounty.has(county)) {
        locationsByCounty.set(county, []);
      }
      locationsByCounty.get(county)!.push(location);
    });

    // Style function for county polygons - semi-transparent overlay
    const style = (feature: any) => {
      const countyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const isSelected = selectedCounty && countyName.toUpperCase() === selectedCounty.toUpperCase();
      const hasLocations = locationsByCounty.has(countyName.toUpperCase());
      
      return {
        fillColor: isSelected ? "#3b82f6" : (hasLocations ? "#10b981" : "#d1d5db"),
        weight: isSelected ? 3 : 1,
        opacity: 1,
        color: isSelected ? "#1e40af" : "#6b7280",
        fillOpacity: isSelected ? 0.3 : (hasLocations ? 0.1 : 0.05),
      };
    };

    // Hover and click handlers for county polygons
    const onEachFeature = (feature: any, layer: L.Layer) => {
      const countyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const countyLocations = locationsByCounty.get(countyName.toUpperCase()) || [];

      if (countyLocations.length > 0) {
        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const layer = e.target;
            layer.setStyle({
              weight: 3,
              color: "#1f2937",
              fillOpacity: 0.2,
            });
            layer.bringToFront();

            // Calculate total sales for county
            const totalSales = countyLocations.reduce((sum, loc) => sum + loc.totalSales, 0);

            // Show tooltip
            const tooltip = L.tooltip({
              permanent: false,
              direction: "top",
              className: "county-tooltip",
            })
              .setLatLng(e.latlng)
              .setContent(
                `<div style="font-family: Inter, sans-serif; padding: 4px;">
                  <strong style="font-size: 14px;">${countyName}</strong><br/>
                  <span style="font-size: 12px; color: #6b7280;">
                    ${countyLocations.length} locations<br/>
                    Total Sales: <strong>$${totalSales.toLocaleString()}</strong>
                  </span><br/>
                  <span style="font-size: 11px; color: #9ca3af;">Click to filter</span>
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
              onCountyClick(countyName);
            }
          },
        });
      }
    };

    // Add county layer (semi-transparent overlay)
    countyLayerRef.current = L.geoJSON(geoJsonData, {
      style,
      onEachFeature,
    }).addTo(mapRef.current);
  }, [geoJsonData, locations, onCountyClick, selectedCounty]);

  // Render location markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !locations) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Get color based on category
    const getMarkerColor = (location: LocationSummary) => {
      const liquorRatio = location.liquorSales / location.totalSales;
      const wineRatio = location.wineSales / location.totalSales;
      const beerRatio = location.beerSales / location.totalSales;

      if (liquorRatio > wineRatio && liquorRatio > beerRatio) {
        return "#9333ea"; // purple for liquor
      } else if (wineRatio > beerRatio) {
        return "#dc2626"; // red for wine
      } else {
        return "#f59e0b"; // amber for beer
      }
    };

    // Add markers for each location
    locations.forEach((location) => {
      const marker = L.circleMarker([location.lat, location.lng], {
        radius: 6,
        fillColor: getMarkerColor(location),
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      });

      // Add popup
      marker.bindPopup(
        `<div style="font-family: Inter, sans-serif; min-width: 200px;">
          <strong style="font-size: 14px;">${location.locationName}</strong><br/>
          <span style="font-size: 12px; color: #6b7280;">${location.locationAddress}</span><br/>
          <span style="font-size: 12px; color: #6b7280;">${location.locationCity}, ${location.locationCounty}</span><br/>
          <span style="font-size: 13px; font-weight: 600; margin-top: 4px; display: block;">
            Total: $${location.totalSales.toLocaleString()}
          </span>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
            <span style="color: #9333ea;">■</span> Liquor: $${location.liquorSales.toLocaleString()}<br/>
            <span style="color: #dc2626;">■</span> Wine: $${location.wineSales.toLocaleString()}<br/>
            <span style="color: #f59e0b;">■</span> Beer: $${location.beerSales.toLocaleString()}
          </div>
        </div>`,
        { closeButton: true }
      );

      // Add click handler
      if (onLocationClick) {
        marker.on("click", () => {
          onLocationClick(location);
        });
      }

      marker.addTo(markersLayerRef.current!);
    });
  }, [locations, onLocationClick]);

  return <div ref={mapContainerRef} className="w-full h-full" data-testid="map-container" />;
}
