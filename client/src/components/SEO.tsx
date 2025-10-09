import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  type?: 'website' | 'article';
  image?: string;
  url?: string;
}

export function SEO({ title, description, type = 'website', image, url }: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', description);
    
    // Open Graph tags for social media
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', type, true);
    
    if (url) {
      updateMetaTag('og:url', url, true);
    }
    
    if (image) {
      updateMetaTag('og:image', image, true);
    }
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    
    if (image) {
      updateMetaTag('twitter:image', image);
    }
  }, [title, description, type, image, url]);

  return null;
}
