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
  const requestIdRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when location changes
    setIsLoading(true);
    setError(null);

    // Increment request ID to invalidate previous requests
    const currentRequestId = ++requestIdRef.current;

    if (!mapRef.current) return;

    const fullAddress = `${address}, ${city}, ${state}${zip ? ' ' + zip : ''}`;

    // Use Nominatim (OpenStreetMap) geocoding service
    const geocodeAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
        );
        const data = await response.json();

        // Ignore stale responses
        if (currentRequestId !== requestIdRef.current) return;

        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const position: [number, number] = [parseFloat(lat), parseFloat(lon)];
          
          // Initialize map if it doesn't exist
          if (!leafletMapRef.current && mapRef.current) {
            leafletMapRef.current = L.map(mapRef.current).setView(position, 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
            }).addTo(leafletMapRef.current);

            markerRef.current = L.marker(position)
              .addTo(leafletMapRef.current)
              .bindPopup(fullAddress);
          } else if (leafletMapRef.current) {
            // Update existing map and marker
            leafletMapRef.current.setView(position, 15);
            
            if (markerRef.current) {
              markerRef.current.setLatLng(position);
              markerRef.current.setPopupContent(fullAddress);
            } else {
              markerRef.current = L.marker(position)
                .addTo(leafletMapRef.current)
                .bindPopup(fullAddress);
            }
          }
          
          setIsLoading(false);
        } else {
          setError('Location not found');
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore errors from stale requests
        if (currentRequestId !== requestIdRef.current) return;
        
        console.error('Geocoding error:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    geocodeAddress();

    return () => {
      // Only clean up on unmount, not on prop changes
    };
  }, [address, city, state, zip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Map container - always rendered so effect can run */}
      <div 
        ref={mapRef} 
        className={className}
        data-testid="location-map"
      />
      
      {/* Loading overlay */}
      {isLoading && !error && (
        <div className={`${className} flex items-center justify-center bg-muted/90 absolute inset-0 z-10 rounded-lg`}>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className={`${className} flex items-center justify-center bg-muted absolute inset-0 z-10 rounded-lg`}>
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city + ', ' + state + (zip ? ' ' + zip : ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on Google Maps →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
