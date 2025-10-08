# Texas Alcohol Sales Map

## Overview

An interactive web application for visualizing Texas alcohol sales data by category and location. The application displays establishment-level sales information for liquor, wine, and beer on an interactive map interface, with filtering, search, and data visualization capabilities. Built with a focus on data clarity and professional presentation, inspired by modern analytics dashboards like Zillow's clean map interface.

**Status**: Fully functional with live Texas Open Data Portal integration (October 2025)

## Recent Changes

### October 8, 2025 (Latest - Hybrid Map Visualization)
- **Hybrid Map Approach**: Combines individual location markers with interactive county overlay
  - **Primary Layer**: 21,000+ location markers (CircleMarker) colored by dominant category
    - Purple: liquor-dominant, Red: wine-dominant, Amber: beer-dominant
    - Click marker → opens LocationDetailModal with sales history
    - Popups show location details and sales breakdown
  - **Overlay Layer**: Semi-transparent county polygons (254 Texas counties, 29MB GeoJSON from TxDOT)
    - Green fill: counties with locations, Gray fill: no locations, Blue fill: selected county
    - Low opacity (0.05-0.3) to not obscure underlying markers
    - Hover → tooltip shows county name, location count, total sales
    - Click → filters sidebar to show only locations in that county
  - **Case-Normalized Filtering**: All county comparisons use uppercase for consistent matching
- **Interactive Filtering**:
  - Year selector (2015-2025, All Years) for historical data
  - Search box filters by location name, city, county, or address
  - County click filters sidebar to selected county with visual indicator
  - Clear filter button restores all locations
  - Pagination (100 locations per page) for performance
- **User Experience**:
  - Map shows all location markers with county boundaries overlay
  - Sidebar displays filterable/searchable location list
  - County selection highlights county in blue and filters sidebar
  - "Filtered: {County} County" badge with X button to clear
  - Empty state when county has no locations

### October 8, 2025 (Earlier - Unlimited Data Access)
- **Unlimited Dataset Access**: Removed 50k record cap when year filter is applied - now fetches ALL available TABC records for selected year
- **Year-Based Filtering**: Added year selector UI (2019-2025, All Years) that queries complete historical datasets
- **Properly Encoded API Queries**: Fixed WHERE clause URL encoding to prevent API 500 errors when fetching large datasets
- **Smart Safety Limits**: Maintains 50k cap only when no date filter is applied (prevents attempting to fetch all 3.5M records at once)
- **Per-Year Caching**: Separate cache keys for each year (e.g., "2024-01-01_2024-12-31") with 1-hour TTL

### October 8, 2025 (Initial)
- Implemented full-stack integration with Texas Open Data Portal API
- Added real-time data fetching with caching layer
- Integrated Leaflet maps with category-based marker visualization
- Added loading states and error handling throughout the application
- Implemented search and filtering functionality for establishments
- Created aggregated sales charts by city using Recharts
- Removed all mock data and connected to live data sources

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type safety and modern development
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing

**UI Component System**
- shadcn/ui component library with Radix UI primitives for accessible, composable components
- Tailwind CSS for utility-first styling with custom design tokens
- "New York" style variant from shadcn/ui
- Custom color palette with Texas-themed branding (deep blue primary, category-specific colors for liquor/wine/beer)
- Support for light and dark themes via ThemeProvider context

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management with caching
- Custom query client configuration with infinite stale time and disabled refetching by default
- Local component state for UI interactions (search, filters, selections)

**Mapping & Visualization**
- Leaflet for interactive map rendering with OpenStreetMap tiles
- Hybrid visualization combining location markers and county overlay
- CircleMarker rendering for 21k+ individual locations with category-based colors
- Semi-transparent GeoJSON county polygons (254 Texas counties from TxDOT data)
- Interactive hover effects with tooltips showing location/county data
- Click handlers for both markers (location details) and counties (sidebar filter)

**Key Features Implementation**
- Year-based filtering (2015-2025, All Years) for historical analysis
- Location marker map with county polygon overlay for geographic context
- Search functionality across location names, cities, counties, and addresses
- County click interaction filters sidebar to show locations in that county
- Visual indicators: green counties (has data), gray (no data), blue (selected)
- Pagination (100 locations per page) for performance with large datasets
- Clear filter button to restore full location list
- Responsive design with mobile support via custom useIsMobile hook

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and API routing
- Node.js runtime with ES modules
- Custom middleware for request logging and error handling

**API Design**
- RESTful endpoints under `/api` prefix
- `/api/locations` - fetches cached or fresh location data with complete monthly records
- `/api/locations/:permitNumber` - retrieves specific location with full monthly history
- `/api/locations/refresh` - force refreshes data from external source
- In-memory caching with 1-hour TTL to reduce external API calls (handles ~50k records)

**Data Processing**
- Texas Open Data API integration via `texasDataService`
- Unlimited record fetching when year filter is applied (fetches ALL available records in 10k batches)
- Safety limit of 50k records only when no date filter provided (prevents fetching entire 3.5M record dataset)
- URL-encoded WHERE clauses for date range filtering to prevent API errors
- Preserves monthly sales records (each API record = one location's sales for one month)
- Groups records by permit number while maintaining monthly history
- Data transformation from raw Texas state records to LocationSummary schema with monthlyRecords array
- Geocoding service with city-based coordinate mapping and random offset for visualization
- Numeric value parsing for sales figures

**Storage Strategy**
- In-memory storage (`MemStorage`) for development and simple deployments
- Interface-based design (`IStorage`) allows future database implementation
- Cache management with timestamp-based expiration

### External Dependencies

**Third-Party APIs**
- Texas Open Data API (`data.texas.gov/resource/naix-2893.json`) - source for alcohol sales data
- OpenStreetMap tiles - map rendering via Leaflet CDN
- Google Fonts - Inter and JetBrains Mono font families

**Database**
- Drizzle ORM configured for PostgreSQL (via `@neondatabase/serverless`)
- Schema defined with user authentication tables (currently minimal usage)
- Migration system via drizzle-kit
- Note: Database not actively used in current implementation - data fetched from external API

**Development Tools**
- Replit-specific plugins for development banner, error overlay, and cartographer
- TypeScript for type checking across shared schemas
- ESBuild for production server bundling

**UI Libraries**
- Extensive Radix UI component collection for accessibility
- class-variance-authority (CVA) for variant-based component styling
- clsx and tailwind-merge for className composition
- React Hook Form with Zod resolvers for form validation (infrastructure present)

**Key Design Decisions**
1. **In-memory caching over database** - Reduces complexity for read-heavy workload with external data source
2. **Interface-based storage** - Allows switching to PostgreSQL without changing business logic
3. **Geocoding approximation** - Uses major Texas cities as base coordinates with random offsets to avoid API rate limits
4. **Shared schema via Zod** - Type-safe data contracts between client and server using `@shared/schema`
5. **Static data refresh** - Manual refresh endpoint allows updating data without automatic polling
6. **Monthly record preservation** - Each API record represents one month's sales; stored as array to enable time-series analysis
7. **Progressive loading** - Pagination limits DOM rendering to 500 items at a time for performance with 20k+ locations
8. **Stable useEffect dependencies** - Uses .join() and .length to create stable primitives and prevent render loops