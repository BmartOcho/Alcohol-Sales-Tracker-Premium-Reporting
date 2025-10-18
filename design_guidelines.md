# Texas Alcohol Sales Map - Design Guidelines

## Design Approach

**Selected Approach**: Design System (Material Design) + Data Visualization Best Practices  
**Primary Inspiration**: Zillow property search, Linear project management, modern analytics dashboards  
**Justification**: Utility-focused application displaying dense information (22k+ locations) where performance, data clarity, and learnability are paramount. Standard patterns ensure efficiency while custom data visualizations provide necessary differentiation.

**Core Principle**: Professional data clarity with subtle Texas identity - trustworthy, efficient, and premium

---

## Color Palette

### Dark Mode (Primary)
- **Background**: 222 15% 10%
- **Surface**: 222 14% 14%
- **Surface Elevated**: 222 13% 18%
- **Border Subtle**: 220 10% 24%
- **Text Primary**: 210 20% 98%
- **Text Secondary**: 220 15% 70%

### Light Mode
- **Background**: 210 20% 98%
- **Surface**: 0 0% 100%
- **Surface Elevated**: 210 20% 99%
- **Border**: 220 13% 91%
- **Text Primary**: 222 15% 15%
- **Text Secondary**: 220 10% 45%

### Brand & Category Colors
- **Texas Primary**: 205 100% 42% (trust blue - primary actions)
- **Texas Accent**: 205 85% 50% (hover states)
- **Liquor**: 265 50% 55% (purple)
- **Wine**: 350 70% 52% (wine red)
- **Beer**: 40 85% 55% (golden amber)
- **Success**: 142 70% 45%
- **Warning**: 38 90% 50%
- **Error**: 0 72% 51%

### Data Visualization Scale
Use sequential blue scale for heatmaps: 205 100% 85% → 205 100% 25% (light to dark)  
Category markers: High contrast versions of category colors with white borders

---

## Typography

**Primary Font**: Inter (Google Fonts)  
**Monospace Font**: JetBrains Mono (numerical data, coordinates)

### Type Scale
- **Display (Hero Title)**: 2.25rem / 700 / -0.02em
- **H1 (Panel Headers)**: 1.5rem / 600 / -0.01em
- **H2 (Sections)**: 1.125rem / 600
- **Body**: 0.875rem / 400 / 0.01em
- **Small (Captions)**: 0.75rem / 400
- **Data Values**: 1rem / 600 (monospace)
- **Labels**: 0.8125rem / 500 / 0.01em

---

## Layout System

**Spacing Units**: Tailwind 4, 6, 8  
- Component padding: p-6
- Card internals: p-4 to p-6
- Section gaps: gap-6
- Tight element spacing: gap-4

**Grid Structure - Desktop**:
- Map viewport: 68% width
- Side panel: 32% width, sticky
- Panel max-width: max-w-md
- Data tables: Full panel width with horizontal scroll

**Grid Structure - Mobile**:
- Full-width map
- Bottom sheet panel (swipe gesture)
- Floating search button overlay

---

## Component Library

### Map Interface
- **Base Layer**: Mapbox GL with custom Texas-centric styling
- **Markers**: Circular pins with category color fill, white border (2px), subtle drop shadow
- **Clusters**: Aggregated count badges with dynamic sizing
- **Heatmap Overlay**: Toggle-able density visualization with blue gradient
- **Controls**: Zoom buttons (bottom-right), layer switcher (top-right), geolocation button

### Side Panel Components

**Header Section**:
- App logo with Texas star icon
- Search input (prominent, rounded-lg, with icon)
- Active filter count badge

**Filter Section**:
- Collapsible accordion groups
- Multi-select category chips (rounded-full, dismissible with X)
- Range sliders for numerical filters
- Date picker for temporal data
- "Reset All" text button

**Results Section**:
- Scrollable list of establishment cards
- Each card: Name (semibold), address (small), category badge, sales indicator bar
- Virtualized rendering for performance
- Load more trigger at bottom

**Statistics Panel**:
- Sticky summary cards showing:
  - Total locations (large number, monospace)
  - Category breakdown (mini donut chart)
  - Top performing region (text + small bar)
- Grid layout: 2 columns on desktop, 1 on mobile

### Data Visualization Components
- **Bar Charts**: Horizontal for category comparison, rounded ends
- **Line Charts**: Sales trends over time, smooth curves, gradient fill
- **Donut Charts**: Category distribution with legend
- **Heatmap**: Choropleth with sequential color scale
- Use Chart.js with custom color scheme

### Cards & Overlays
- **Establishment Cards**: 
  - Rounded corners (rounded-lg)
  - Subtle shadow (shadow-sm)
  - Hover: shadow-md with smooth transition
  - Click: Fly to location on map
- **Map Popups**: Compact info window with name, address, category badge, "View Details" link
- **Modal Dialogs**: Detailed establishment view with historical charts, full address, license info
- **Toast Notifications**: Top-right, slide-in animation, auto-dismiss

### Forms & Inputs
- **Search Bar**: Large, rounded-lg, dropdown autocomplete with establishment suggestions
- **Filter Chips**: Pill-shaped, category color coded, X to remove
- **Toggles**: Switch components for layer controls
- **Dropdowns**: Material Design styled with smooth expand

### Navigation
- **Top Bar**: Minimal height, logo left, breadcrumbs center (desktop), settings right
- **Mobile Nav**: Sticky bottom bar with 4 actions: Map, Filters, Stats, About

---

## Shadows & Elevation

- **Cards Default**: shadow-sm (0 1px 3px rgba(0,0,0,0.12))
- **Cards Hover**: shadow-md (0 4px 6px rgba(0,0,0,0.15))
- **Panels**: shadow-lg (0 10px 25px rgba(0,0,0,0.15))
- **Modals**: shadow-2xl (0 25px 50px rgba(0,0,0,0.25))
- **Map Markers**: Custom drop-shadow filter

---

## Interaction Patterns

**Map Behaviors**:
- Hover marker: Scale 1.1, increase shadow
- Click marker: Open popup, pan to center
- Drag: Smooth momentum scrolling
- Cluster click: Zoom to bounds with animation

**Panel Behaviors**:
- Filter apply: Instant map update with loading overlay
- Search: 300ms debounce, show "Searching..." state
- List scroll: Infinite load with skeleton placeholders
- Click establishment: Highlight map marker, show detail modal

**Loading States**:
- Map tiles: Progressive load with placeholder gray
- Data fetch: Skeleton screens with shimmer (animate-pulse)
- Charts: Fade-in animation on data load

**Animations**:
- All transitions: 200-300ms ease-in-out
- Map flyTo: 1000ms smooth curve
- Modal open: Fade + scale from 0.95
- Minimal use - only for feedback, no decorative animations

---

## Texas Brand Integration

**Visual Elements**:
- Texas star icon in app header (subtle, 16px)
- State outline as empty state illustration
- "TX" badge on location cards for in-state
- Lone star watermark on loading screens (low opacity)

**Accent Moments**:
- Texas flag color trio in data visualization where appropriate
- County boundary overlays with subtle stroke
- "Powered by Texas Open Data Portal" footer text

---

## Images

**No Hero Images**: This is a utility application - launch directly into the map interface. The interactive map IS the hero element.

**Supporting Imagery**:
- Empty state: Texas outline illustration (SVG, single color)
- About modal: Texas capitol building or data visualization abstract (optional background)
- Error states: Simple iconography, no photography

---

## Key Layouts

**Desktop View**:
```
[Header Bar - full width]
[Map 68% | Side Panel 32%]
  Map: Full bleed
  Panel: Fixed width, scrollable, elevated
[Footer - minimal, inside panel]
```

**Mobile View**:
```
[Map - full screen]
[Floating Search Button - top]
[Bottom Sheet Panel - swipe up]
[Bottom Navigation - fixed]
```

**Establishment Detail Modal**:
- Header: Name, category badge, close button
- Body: Address, sales chart (300px height), license info, historical data table
- Footer: "View on Map" primary button, "Share" secondary

---

## Accessibility & Performance

- WCAG AA contrast ratios enforced
- All interactive elements keyboard accessible (tab navigation)
- ARIA labels on map markers and controls
- Focus indicators: 2px solid Texas Primary color
- Reduced motion: Disable all animations via prefers-reduced-motion
- Virtualized lists for 1000+ items
- Lazy load charts until visible
- Debounced search and filter application
- Progressive map tile loading with LOD