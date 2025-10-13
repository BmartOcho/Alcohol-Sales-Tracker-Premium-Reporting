# Texas Alcohol Sales Map

## Overview
An interactive web application for visualizing Texas alcohol sales data by category and location. The application provides establishment-level sales information for liquor, wine, and beer on an interactive map interface, featuring filtering, search, and data visualization. The project aims for data clarity and professional presentation, inspired by modern analytics dashboards, and includes a comprehensive analytics suite with permit-specific and county-level reporting.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (January 2025)
- **Authentication System**: Implemented Replit Auth (OIDC) for user login with Google, GitHub, and email/password support. Session management via PostgreSQL with automatic token refresh.
- **Subscription & Payments**: Integrated Stripe payment system with flexible pricing options: $10/month Pro subscription or $250 lifetime access. Secure payment flow with status validation, customer reuse, and proper error handling for expired/canceled subscriptions. Webhook endpoint (`/api/stripe-webhook`) handles payment confirmations and requires STRIPE_WEBHOOK_SECRET for signature verification.
  - **Webhook Configuration** (REQUIRED for subscription management):
    1. In Stripe Dashboard, go to Developers > Webhooks
    2. Add endpoint URL: `https://your-domain.com/api/stripe-webhook`
    3. Select events: `payment_intent.succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
    4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET environment variable (REQUIRED - webhook returns 500 error if missing)
    5. The webhook will automatically upgrade users to 'lifetime' tier for one-time payments and 'pro' tier for monthly subscriptions
  - **Security**: Webhook signature verification is mandatory - no fallback to unverified payloads. User authentication is validated before creating payment intents.
- **SEO Optimization**: Comprehensive SEO implementation including meta tags (Open Graph, Twitter Cards), structured data (JSON-LD), sitemap.xml, and robots.txt for search engine indexing. All pages have unique, descriptive titles and meta descriptions optimized for search visibility.
- **Critical Data Fix (Oct 2025)**: Fixed SQL GROUP BY bug in `getLocationByPermit()` that was splitting permit data into multiple groups when location details varied across monthly records. Now groups only by `permitNumber` and uses `MAX()` for location fields, ensuring consistent all-time totals across map modal, search results, and reports pages.
- **Outliers Statistical Analysis (Oct 2025)**: Redesigned Outliers tab to use Z-score methodology. Filters by area type (city/zip/county), date range, and minimum revenue. Calculates mean and standard deviation for beer/wine/liquor percentages, then identifies outliers with |Z-score| > 2. Displays establishments with unusual sales patterns adaptable to specific geographic areas, replacing fixed percentage thresholds with statistical rigor. Backend API now supports county/city/zip/minRevenue filtering for accurate area-specific analysis.
- **Outliers Dropdown Fix (Oct 2025)**: Fixed critical bug where city/zip dropdowns were stuck on "Loading..." due to circular data dependency. Created dedicated `/api/areas` endpoint that efficiently returns ALL unique cities and zips without pagination limits. Simplified Outliers component to use separate queries for dropdown population vs. filtered analysis, eliminating the previous 1k-result ceiling.
- **Outliers Data & Navigation Fix (Oct 2025)**: Fixed critical GROUP BY bug in `getLocations()` causing 0.0% sales percentages when location coordinates varied across monthly records. Applied same fix as `getLocationByPermit()` - GROUP BY only permitNumber, use MAX() for location fields. Implemented clickable outlier cards that navigate to Location Report tab with selected permit and date range pre-loaded. Users can now click any outlier to view detailed analysis for that location with correct year filter automatically applied.
- **Outliers County Filter & Ceased Operations Fix (Oct 2025)**: Fixed county selection not producing results - frontend was translating county codes to names but database stores codes. Now sends codes directly (e.g., "227" for Travis). Added case-insensitive county filter matching city/zip behavior. Implemented automatic filtering of ceased operations (totalSales <= 0) to prevent 0.0% outliers from skewing statistical analysis.
- **Map Improvements (Oct 2025)**: Fixed CSP headers to allow OpenStreetMap geocoding for embedded location maps. Added loading indicators (spinning circles) to all search inputs in Reports tabs for better UX feedback.
- **Mobile Responsive Optimization (Oct 2025)**: Comprehensive mobile responsiveness across all pages using Tailwind breakpoints. Home page uses vertical stack layout on mobile (sidebar above map, 65/35 height split favoring location list) and side-by-side on desktop. Reports page features mobile-optimized tabs and navigation. Landing and Subscribe pages have responsive text sizes and spacing. All touch targets meet ≥32px requirement for mobile usability. Tested and verified across mobile (375x667), tablet (768x1024), and desktop (1920x1080) viewports.
- **Reports Page Mobile Enhancement (Jan 2025)**: Enhanced mobile responsiveness for all three Reports tabs (Permit Report, Permit Comparison, Outliers). Permit Report: metric cards stack vertically on mobile (grid-cols-1 md:grid-cols-2 lg:grid-cols-5), search controls stack responsively, download button shows "PDF" on mobile. Permit Comparison: separate mobile/desktop charts with optimized heights (300px/400px) and condensed axes. Outliers: filters grid responsive, header badges wrap, outlier cards stack properly with truncated text. All layouts verified at 375px width with no horizontal scrolling.
- **Location Modal Cleanup (Jan 2025)**: Removed redundant monthly sales scrolling list from location detail modals. Sales data is now displayed exclusively via the Sales Trend chart, eliminating duplication and creating a cleaner, more compact modal interface.
- **Freemium Paywall (Jan 2025)**: Implemented highly restrictive freemium model where unauthenticated users can ONLY view top 10 locations from a selected county. Home page is publicly accessible without login. Features include:
  - **County-Only Access**: Free users MUST select a county to view any data. No statewide viewing allowed. Empty state shown until county selected.
  - **Top 10 Per County**: When county selected, displays ONLY top 10 highest-grossing locations with green numbered badges (#1-#10).
  - **Search Disabled**: Search functionality completely disabled for free users. Input shows "Sign in to search" with lock icon. Clicking triggers paywall.
  - **Current Year Only**: Only 2025 data visible. Years 2015-2024 show "(Login required)" indicator. Selecting historical year triggers paywall.
  - **Backend Enforcement**: API enforces county parameter requirement, page 1 only (no pagination bypass), top 10 limit, and current year validation for unauthenticated requests.
  - **Security**: Multiple bypass protections including page validation (rejects page !== 1), date range requirements, and frontend pagination guards.
  - **Paywall Modal**: Non-dismissible modal with contextual messaging for data access restrictions. Includes Sign In/Sign Up options.

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