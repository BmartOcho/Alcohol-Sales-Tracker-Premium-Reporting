import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  address: string;
  city: string;
  state?: string;
  zip?: string;
  className?: string;
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function LocationMap({ address, city, state = 'TX', zip, className = '' }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const fullAddress = `${address}, ${city}, ${state}${zip ? ' ' + zip : ''}`;

    // Use Nominatim (OpenStreetMap) geocoding service
    const geocodeAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          
          // Initialize map
          if (!leafletMapRef.current && mapRef.current) {
            leafletMapRef.current = L.map(mapRef.current).setView([parseFloat(lat), parseFloat(lon)], 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
            }).addTo(leafletMapRef.current);

            markerRef.current = L.marker([parseFloat(lat), parseFloat(lon)])
              .addTo(leafletMapRef.current)
              .bindPopup(fullAddress);
          }
          
          setIsLoading(false);
        } else {
          setError('Location not found');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    geocodeAddress();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [address, city, state, zip]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city + ', ' + state + (zip ? ' ' + zip : ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            View on Google Maps →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`${className} flex items-center justify-center bg-muted absolute inset-0 z-10`}>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}
      <div 
        ref={mapRef} 
        className={className}
        data-testid="location-map"
      />
    </div>
  );
}
