# Texas Alcohol Sales Map

## Overview
An interactive web application for visualizing Texas alcohol sales data by category and location. The application provides establishment-level sales information for liquor, wine, and beer on an interactive map interface, featuring filtering, search, and data visualization. The project aims for data clarity and professional presentation, inspired by modern analytics dashboards, and includes a comprehensive analytics suite with permit-specific and county-level reporting.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (January 2025)
- **Authentication System**: Implemented Replit Auth (OIDC) for user login with Google, GitHub, and email/password support. Session management via PostgreSQL with automatic token refresh.
- **Subscription & Payments**: Integrated Stripe payment system with $20/month Pro subscription. Secure payment flow with status validation, customer reuse, and proper error handling for expired/canceled subscriptions.
- **SEO Optimization**: Comprehensive SEO implementation including meta tags (Open Graph, Twitter Cards), structured data (JSON-LD), sitemap.xml, and robots.txt for search engine indexing. All pages have unique, descriptive titles and meta descriptions optimized for search visibility.
- **Critical Data Fix (Oct 2025)**: Fixed SQL GROUP BY bug in `getLocationByPermit()` that was splitting permit data into multiple groups when location details varied across monthly records. Now groups only by `permitNumber` and uses `MAX()` for location fields, ensuring consistent all-time totals across map modal, search results, and reports pages.
- **Outliers Statistical Analysis (Oct 2025)**: Redesigned Outliers tab to use Z-score methodology. Filters by area type (city/zip/county), date range, and minimum revenue. Calculates mean and standard deviation for beer/wine/liquor percentages, then identifies outliers with |Z-score| > 2. Displays establishments with unusual sales patterns adaptable to specific geographic areas, replacing fixed percentage thresholds with statistical rigor. Backend API now supports county/city/zip/minRevenue filtering for accurate area-specific analysis.
- **Map Improvements (Oct 2025)**: Fixed CSP headers to allow OpenStreetMap geocoding for embedded location maps. Added loading indicators (spinning circles) to all search inputs in Reports tabs for better UX feedback.
- **Mobile Responsive Optimization (Oct 2025)**: Comprehensive mobile responsiveness across all pages using Tailwind breakpoints. Home page uses vertical stack layout on mobile (sidebar above map, 50/50 height split) and side-by-side on desktop. Reports page features mobile-optimized tabs and navigation. Landing and Subscribe pages have responsive text sizes and spacing. All touch targets meet ≥32px requirement for mobile usability. Tested and verified across mobile (375x667), tablet (768x1024), and desktop (1920x1080) viewports.

## System Architecture

### Frontend Architecture
- **Frameworks**: React 18+, TypeScript, Vite, Wouter for routing.
- **UI/UX**: shadcn/ui (Radix UI) with Tailwind CSS, "New York" style variant, custom Texas-themed color palette, light/dark themes.
- **State Management**: TanStack Query for server state management and caching.
- **Mapping & Visualization**: Leaflet with OpenStreetMap tiles, displaying 21k+ individual CircleMarkers colored by dominant alcohol category. Features semi-transparent GeoJSON county polygons for context, with interactive hover tooltips and click handlers for location details and county filtering.
- **Key Features**: Year-based filtering (2015-2025), search by location, city, county, or address, county click-to-filter interaction, visual indicators for county data presence/selection, and pagination for performance.

### Backend Architecture
- **Server**: Express.js with Node.js (ES modules).
- **API Design**: RESTful endpoints (`/api/locations`, `/api/locations/:permitNumber`, `/api/locations/refresh`). The `/api/locations` endpoint supports filtering by county (name), city, zip code, and minimum revenue.
- **Data Processing**: Integrates with Texas Open Data API, supports unlimited record fetching for specific years (in 10k batches), and applies a 50k record safety limit when no date filter is active. Data is transformed into a `LocationSummary` schema with monthly sales records.
- **Storage Strategy**: Primarily uses PostgreSQL (`DatabaseStorage`) with Drizzle ORM. An in-memory cache (1-hour TTL) is also implemented for frequent queries, which can be manually refreshed.

### System Design Choices
- **Data Storage**: All years (2015-2025) of monthly sales records (1.8M+) are stored in PostgreSQL for instant access.
- **Query Optimization**: SQL GROUP BY aggregations and a 1-hour cache significantly improve data retrieval performance.
- **Map Rendering**: All 22k+ locations render as individual `CircleMarkers`, color-coded by dominant alcohol category. County polygons overlay the map, providing interactive filtering and data aggregation.
- **Performance**: Paginated API responses (1000 locations per page) prevent memory overflows in production. Smart sorting ensures locations are always ordered by highest sales.
- **Data Normalization**: County codes are standardized to 3 digits (`.padStart(3, '0')`) to ensure accurate data mapping across all 254 Texas counties.
- **Hybrid Map Approach**: Combines individual location markers with interactive county overlays. `allLocations` prop provides unfiltered data for accurate county tooltips regardless of current sidebar filters.
- **Reports Page**: Features Permit Reports (single permit analysis), Permit Comparison (up to 6 permits), and Outliers (statistical Z-score analysis to identify unusual sales patterns).

## External Dependencies

### Third-Party APIs
- **Texas Open Data API**: (`data.texas.gov/resource/naix-2893.json`) - Primary source for Texas alcohol sales data.
- **OpenStreetMap tiles**: Used by Leaflet for map rendering.
- **Google Fonts**: Inter and JetBrains Mono for typography.

### Database
- **PostgreSQL**: Used as the primary data store, configured via Drizzle ORM and `@neondatabase/serverless`.

### UI Libraries
- **Radix UI**: Provides accessible, composable UI primitives.
- **class-variance-authority (CVA)**: For variant-based component styling.
- **clsx and tailwind-merge**: For conditional and efficient CSS class composition.