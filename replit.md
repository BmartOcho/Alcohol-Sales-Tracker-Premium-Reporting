# Texas Alcohol Sales Map

## Overview

An interactive web application for visualizing Texas alcohol sales data by category and location. The application displays establishment-level sales information for liquor, wine, and beer on an interactive map interface, with filtering, search, and data visualization capabilities. Built with a focus on data clarity and professional presentation, inspired by modern analytics dashboards like Zillow's clean map interface.

**Status**: Fully functional with complete database coverage (2015-2025) - Production ready (October 2025)

## Recent Changes

### October 9, 2025 (Latest - Fully Database-Backed Architecture)
- **All Data in PostgreSQL**: All years (2015-2025) stored in database for instant access
  - **Database Storage**: 1.8M+ monthly sales records across all years (1,811,938 records)
  - **Complete Coverage**: 2015 (165k), 2016 (171k), 2017 (175k), 2018 (181k), 2019 (187k), 2020 (161k), 2021 (189k), 2022 (204k), 2023 (193k), 2024 (228k), 2025 (158k)
  - **SQL Optimization**: GROUP BY aggregation for location summaries (3-4s first load, 20-40ms cached)
  - **Import Script**: Supports single years or ranges: `tsx server/scripts/importData.ts 2025` or `tsx server/scripts/importData.ts 2015 2024`
  - **Performance**: 100x faster than API approach, consistent across all years
- **Optimized Query Architecture**:
  - Step 1: SQL GROUP BY aggregation (SUM receipts, MAX date by permit_number)
  - Step 2: Fetch monthly records for detailed history
  - Step 3: Combine aggregated data with monthly details
  - 1-hour cache prevents repeated database queries
- **Year Selector**: Shows all available years (2015-2025)
  - Default: 2025 (most recent year)
  - All years load consistently from database (3-4s first, <50ms cached)
- **Smart Sorting**: Locations always sorted by highest sales first (descending order)
  - Applies to county filters, search results, and all views
  - Array cloning prevents React Query cache mutation
- **Data Updates**: Run import script monthly when TABC publishes new data
- **Cache Management**: POST `/api/locations/refresh` endpoint clears all caches
- **All features work across all years**: search, filtering, county selection, location details
- **Map Marker Clustering**: Solved performance issues with rendering 21,000+ markers
  - Integrated Leaflet MarkerClusterGroup plugin to group nearby markers
  - Cluster sizes: small (<20), medium (20-100), large (>100) with visual indicators
  - When zoomed out: markers automatically cluster into numbered groups
  - When zoomed in or clicked: clusters expand to show individual markers
  - **Result**: Smooth map interactions, no lag, dramatically reduced DOM elements (from 21k to hundreds)
- **Production Memory Fix**: Resolved "system received signal terminated" crash in published apps
  - Root cause: Sending all 21k locations in one response exceeded production memory limits
  - Solution: Paginated API responses (1000 locations per page) prevent memory overflow
  - Published apps now load successfully without crashing
- **All Features Preserved**: Search, filtering, county selection, location details, and tooltips work identically with better performance

### October 8, 2025 (County Code Normalization Fix)
- **County Code Leading Zero Fix**: Fixed missing data for counties with codes < 100
  - **Root Cause**: Texas API returns county codes without leading zeros ("57", "4") while lookup tables use 3-digit codes ("057", "004")
  - **Solution**: Added `.padStart(3, '0')` normalization in texasDataService.ts to standardize all county codes
  - **Impact**: Dallas County (057) now shows 1,754 locations, Aransas County (004) shows 60 locations - previously showed 0
  - **Result**: All 254 Texas counties now display data correctly regardless of code format
- **Hybrid Map Approach**: Combines individual location markers with interactive county overlay
  - **Primary Layer**: 21,000+ location markers (CircleMarker) colored by dominant category
    - Purple: liquor-dominant, Red: wine-dominant, Amber: beer-dominant
    - Click marker → opens LocationDetailModal with sales history
    - Popups show location details and sales breakdown
  - **Overlay Layer**: Semi-transparent county polygons (254 Texas counties, 29MB GeoJSON from TxDOT)
    - Green fill: counties with locations, Gray fill: no locations, Blue fill: selected county
    - Low opacity (0.05-0.3) to not obscure underlying markers
    - Hover → tooltip shows county name, location count, total sales (always shows full data)
    - Click → filters sidebar to show only locations in that county
  - **County Code Lookup System**: Two-way mapping between county names and codes
    - COUNTY_NAME_TO_CODE: Converts GeoJSON county names → Texas Comptroller codes for filtering
    - COUNTY_CODE_TO_NAME: Converts codes → names for user-friendly display
    - All codes normalized to 3 digits (001-254) for consistent matching
  - **Dual-Data Architecture**: InteractiveMap receives both filtered and unfiltered location data
    - `locations` prop: filtered locations for marker rendering (respects sidebar filters)
    - `allLocations` prop: unfiltered locations for county tooltip aggregation
    - Ensures county tooltips always show accurate sales data regardless of current filters
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
  - County tooltips remain accurate even when sidebar is filtered

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
- PostgreSQL database (`DatabaseStorage`) as primary data source
- In-memory cache (1-hour TTL) for lightning-fast repeat queries
- Cache can be manually cleared via POST `/api/locations/refresh`
- Interface-based design (`IStorage`) allows switching storage implementations

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