import { useEffect } from 'react';

interface StructuredDataProps {
  type: 'WebApplication' | 'Organization' | 'Service';
  data: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structured-data';
    
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    };
    
    script.textContent = JSON.stringify(structuredData);
    
    // Remove existing structured data script if any
    const existing = document.getElementById('structured-data');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      script.remove();
    };
  }, [type, data]);

  return null;
}
