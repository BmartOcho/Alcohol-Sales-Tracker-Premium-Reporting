import { InteractiveMap } from "../InteractiveMap";

const mockMarkers = [
  { id: "1", lat: 30.2672, lng: -97.7431, name: "Austin Bar & Grill", category: "liquor" as const, sales: 45000 },
  { id: "2", lat: 29.7604, lng: -95.3698, name: "Houston Wine House", category: "wine" as const, sales: 38000 },
  { id: "3", lat: 32.7767, lng: -96.7970, name: "Dallas Brewery", category: "beer" as const, sales: 52000 },
  { id: "4", lat: 29.4241, lng: -98.4936, name: "San Antonio Cantina", category: "liquor" as const, sales: 41000 },
];

export default function InteractiveMapExample() {
  return (
    <div className="w-full h-[500px]">
      <InteractiveMap
        markers={mockMarkers}
        onMarkerClick={(marker) => console.log("Marker clicked:", marker)}
      />
    </div>
  );
}
