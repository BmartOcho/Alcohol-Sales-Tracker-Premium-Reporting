# Texas Alcohol Sales Map - Design Guidelines

## Design Approach

**Selected Approach**: Hybrid - Material Design System + Data Visualization Best Practices
**Primary Inspiration**: Zillow's clean map interface, modern analytics dashboards
**Core Principle**: Data clarity with Texas identity - professional, trustworthy, and efficient

---

## Core Design Elements

### A. Color Palette

**Dark Mode Primary** (Map & Data Focus):
- Background: 220 15% 12% (deep charcoal)
- Surface: 220 14% 16% (elevated panels)
- Surface Elevated: 220 13% 20% (cards, modals)
- Border: 220 10% 25% (subtle divisions)

**Light Mode Primary**:
- Background: 210 20% 98% (soft white)
- Surface: 0 0% 100% (pure white panels)
- Border: 220 13% 91% (light gray)

**Brand & Accent Colors**:
- Texas Primary: 200 100% 35% (deep Texas blue - represents authority)
- Liquor Category: 280 60% 55% (purple)
- Wine Category: 340 75% 50% (wine red)
- Beer Category: 45 90% 50% (golden amber)
- Success/Active: 145 65% 45% (green for selections)

**Data Visualization Colors**:
Use categorical scheme for map markers/heatmap layers with high contrast against map backgrounds

### B. Typography

**Font Stack**:
- Primary: 'Inter', system-ui, sans-serif (clean, modern, excellent for data)
- Monospace: 'JetBrains Mono', monospace (for numerical data)

**Scale & Hierarchy**:
- Display (Map Title): 2.5rem / 700 weight
- H1 (Panel Headers): 1.75rem / 600 weight
- H2 (Section Titles): 1.25rem / 600 weight
- Body (Default): 0.875rem / 400 weight
- Caption (Meta info): 0.75rem / 400 weight
- Data Values: 1rem / 600 weight in monospace

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, and 8 consistently
- Component padding: p-4 to p-8
- Section spacing: gap-6, space-y-6
- Card internal: p-6
- Tight groupings: gap-4

**Grid Structure**:
- Map takes 65-70% viewport width on desktop
- Side panel: 30-35% width with smooth slide-in on mobile
- Responsive breakpoint: Full-width map on mobile, floating panel overlay

**Max Widths**:
- Side panel content: max-w-sm
- Modal dialogs: max-w-2xl
- Data tables: Full width with horizontal scroll

### D. Component Library

**Map Interface**:
- Full-bleed interactive map (Leaflet/Mapbox GL)
- Custom category markers with color-coding
- Heatmap toggle for density visualization
- Zoom controls (bottom-right)
- Layer toggles (top-right floating panel)

**Side Panel Components**:
- Sticky header with search input
- Collapsible filter sections (Accordion pattern)
- Category toggles with visual indicators
- Data cards showing aggregated statistics
- List view of establishments with mini-maps

**Data Visualization**:
- Bar charts for category comparisons (using Chart.js)
- Trend lines for temporal data
- Donut charts for category distribution
- Data tables with sortable columns

**Cards & Overlays**:
- Establishment detail cards (elevated, rounded-lg)
- Map marker popups with quick stats
- Filter chips (rounded-full, dismissible)
- Toast notifications for data loading states

**Forms & Inputs**:
- Search bar with autocomplete dropdown
- Multi-select category filters
- Date range pickers for temporal filtering
- Floating action button for "Reset Filters"

**Navigation**:
- Minimal top bar with app branding
- Breadcrumb trail for location hierarchy
- Mobile: Bottom navigation for quick actions

### E. Interaction Patterns

**Map Interactions**:
- Hover: Highlight marker with scale animation
- Click: Open info popup with establishment details
- Drag: Smooth pan with momentum
- Pinch/Scroll: Zoom with level indicators

**Panel Interactions**:
- Smooth slide transitions (300ms ease)
- Sticky search bar on scroll
- Infinite scroll for establishment lists
- Click establishment → Fly to map location

**Loading States**:
- Skeleton screens for data loading
- Shimmer effect on cards
- Progress bar for API calls
- Map tile loading indicators

---

## Key Features & Layout

**Desktop Layout**:
- Split view: Map (left/main) + Panel (right)
- Floating category legend (bottom-left)
- Search overlay (top-center on map)

**Mobile Layout**:
- Full-screen map
- Bottom sheet panel (swipe up to expand)
- Floating search button (top)
- Compact filters in modal

**Establishment Detail View**:
- Hero section with location pin
- Category breakdown (horizontal bar chart)
- Historical trend graph
- Address and metadata
- "View on Map" CTA button

---

## Texas Brand Elements

**Visual Identity**:
- Subtle Texas star icon in header
- Lone star watermark on empty states
- "Powered by Texas Open Data" footer badge
- State outline as loading indicator

**Micro-interactions**:
- Map markers: Gentle pulse for active locations
- Filter application: Ripple effect
- Data updates: Smooth count-up animations
- Success states: Subtle checkmark animations

---

## Accessibility & Performance

- High contrast mode toggle
- Keyboard navigation for all controls
- ARIA labels for map markers
- Debounced search (300ms)
- Virtualized lists for 1000+ items
- Progressive map tile loading
- Lazy load chart libraries