# Texas Alcohol Sales Map

## Overview
An interactive web application for visualizing Texas alcohol sales data by category and location. The application provides establishment-level sales information for liquor, wine, and beer on an interactive map interface, featuring filtering, search, and data visualization. The project aims for data clarity and professional presentation, inspired by modern analytics dashboards, and includes a comprehensive analytics suite with permit-specific and county-level reporting. It also features a freemium model and subscription-based access to advanced features.

## User Preferences
Preferred communication style: Simple, everyday language.

## Future Enhancements
- **Email Notifications**: Consider adding transactional emails for user signups and subscription confirmations using Resend or SendGrid integration. User opted to skip this feature for now.

## System Architecture

### Frontend Architecture
- **Frameworks**: React 18+, TypeScript, Vite, Wouter for routing.
- **UI/UX**: shadcn/ui (Radix UI) with Tailwind CSS, "New York" style variant, custom Texas-themed color palette, light/dark themes.
- **State Management**: TanStack Query for server state management and caching.
- **Mapping & Visualization**: Leaflet with OpenStreetMap tiles, displaying 21k+ individual CircleMarkers colored by dominant alcohol category. Features semi-transparent GeoJSON county polygons for context, with interactive hover tooltips and click handlers for location details and county filtering.
- **Key Features**: Year-based filtering (2015-2025), search by location, city, county, or address, county click-to-filter interaction, and pagination.
- **Mobile Responsiveness**: Comprehensive mobile optimization across all pages using Tailwind breakpoints for various viewports.

### Backend Architecture
- **Server**: Express.js with Node.js (ES modules).
- **API Design**: RESTful endpoints (`/api/locations`, `/api/locations/:permitNumber`, `/api/locations/refresh`) supporting filtering by county, city, zip code, and minimum revenue.
- **Data Processing**: Integrates with Texas Open Data API, supports unlimited record fetching, and transforms data into a `LocationSummary` schema with monthly sales records.
- **Storage Strategy**: Primarily uses PostgreSQL with Drizzle ORM. An in-memory cache (1-hour TTL) is also implemented.
- **Real-time Data Refresh**: Server runs `importIncrementalData()` on startup, hourly cron checks for new monthly reports, and automatic cache invalidation after successful imports.
- **Authentication**: Replit Auth (OIDC) for user login with Google, GitHub, and email/password. Session management via PostgreSQL.
- **Subscription Management**: Integrated Stripe for recurring subscriptions with webhook handling for payment confirmations and user tier upgrades.
- **Admin Features**: Role-based access control for admin features, including contact message management.

### System Design Choices
- **Data Storage**: All years (2015-2025) of monthly sales records (1.8M+) are stored in PostgreSQL.
- **Query Optimization**: SQL GROUP BY aggregations and a 1-hour cache improve data retrieval performance.
- **Map Rendering**: All 22k+ locations render as individual `CircleMarkers`, color-coded by dominant alcohol category, with interactive county overlays.
- **Performance**: Paginated API responses (1000 locations per page) and smart sorting for highest sales.
- **Data Normalization**: County codes are standardized to 3 digits for accurate mapping.
- **Freemium Model**: Restrictive freemium model where unauthenticated users can only view the top 10 highest-grossing locations from a selected county for the current year. Search and historical data are paywalled.
- **Reports Page**: Features Permit Reports (single permit analysis), Permit Comparison (up to 6 permits), and Outliers (statistical Z-score analysis to identify unusual sales patterns).
- **SEO Optimization**: Comprehensive SEO implementation including meta tags, structured data, sitemap.xml, and robots.txt.

## External Dependencies

### Third-Party APIs
- **Texas Open Data API**: (`data.texas.gov/resource/naix-2893.json`) - Primary source for Texas alcohol sales data.
- **OpenStreetMap tiles**: Used by Leaflet for map rendering.
- **Google Fonts**: Inter and JetBrains Mono for typography.
- **Stripe**: For payment processing and subscription management.

### Database
- **PostgreSQL**: Used as the primary data store, configured via Drizzle ORM and `@neondatabase/serverless`.

### UI Libraries
- **Radix UI**: Provides accessible, composable UI primitives.
- **class-variance-authority (CVA)**: For variant-based component styling.
- **clsx and tailwind-merge**: For conditional and efficient CSS class composition.