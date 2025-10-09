import { useEffect, useRef } from 'react';

interface GoogleMapProps {
  address: string;
  city: string;
  state?: string;
  zip?: string;
  className?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function GoogleMap({ address, city, state = 'TX', zip, className = '' }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeMap();
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup marker on unmount
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [address, city, state, zip]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    const fullAddress = `${address}, ${city}, ${state}${zip ? ' ' + zip : ''}`;

    // Geocode the address
    geocoder.geocode({ address: fullAddress }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;

        // Create map
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Add marker
        markerRef.current = new window.google.maps.Marker({
          map: googleMapRef.current,
          position: location,
          title: fullAddress,
        });
      } else {
        console.error('Geocoding failed:', status);
      }
    });
  };

  return (
    <div 
      ref={mapRef} 
      className={className}
      data-testid="google-map"
    />
  );
}
