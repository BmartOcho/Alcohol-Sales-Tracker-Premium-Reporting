# Texas Alcohol Sales Map

## Overview

An interactive web application for visualizing Texas alcohol sales data by category and location. The application displays establishment-level sales information for liquor, wine, and beer on an interactive map interface, with filtering, search, and data visualization capabilities. Built with a focus on data clarity and professional presentation, inspired by modern analytics dashboards like Zillow's clean map interface.

**Status**: Fully functional with live Texas Open Data Portal integration (October 2025)

## Recent Changes

### October 8, 2025 (Evening Update)
- **Expanded Data Coverage**: Increased API fetch limit from 500 to 50,000 records, now retrieving ~20,500+ unique locations
- **Monthly Sales History**: Preserved complete monthly sales records for each location (previously aggregated all months together)
- **Time-based Filtering**: Added month/date selector to view sales data for specific time periods
- **Location Detail Modal**: New modal component showing month-by-month sales breakdown with trend charts
- **Performance Optimizations**: 
  - Implemented pagination (500 locations per page with "Load more" functionality)
  - Limited map markers to displayed locations to prevent rendering 20k+ markers simultaneously
  - Used stable useEffect dependencies to prevent infinite render loops
- **Cache Duration**: Extended cache TTL to 1 hour (from 15 minutes) due to larger dataset size

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
- Recharts for data visualization (bar charts, sales analytics)
- Custom marker system with category-based color coding (purple for liquor, red for wine, amber for beer)

**Key Features Implementation**
- Real-time search across establishment names, cities, and counties
- Multi-select category filtering (liquor, wine, beer)
- Month/date selector to view historical sales data
- Interactive map markers with click handlers
- Location detail modal showing complete monthly sales history
- Progressive loading with pagination (500 locations per page)
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
- Fetches up to 50,000 records in 10k batches to capture all permitted licenses
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