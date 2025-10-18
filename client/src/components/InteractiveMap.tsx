import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationSummary } from "@shared/schema";

// Texas Comptroller county codes (used by TABC data)
const COUNTY_NAME_TO_CODE: Record<string, string> = {
  "ANDERSON": "001", "ANDREWS": "002", "ANGELINA": "003", "ARANSAS": "004", "ARCHER": "005",
  "ARMSTRONG": "006", "ATASCOSA": "007", "AUSTIN": "008", "BAILEY": "009", "BANDERA": "010",
  "BASTROP": "011", "BAYLOR": "012", "BEE": "013", "BELL": "014", "BEXAR": "015",
  "BLANCO": "016", "BORDEN": "017", "BOSQUE": "018", "BOWIE": "019", "BRAZORIA": "020",
  "BRAZOS": "021", "BREWSTER": "022", "BRISCOE": "023", "BROOKS": "024", "BROWN": "025",
  "BURLESON": "026", "BURNET": "027", "CALDWELL": "028", "CALHOUN": "029", "CALLAHAN": "030",
  "CAMERON": "031", "CAMP": "032", "CARSON": "033", "CASS": "034", "CASTRO": "035",
  "CHAMBERS": "036", "CHEROKEE": "037", "CHILDRESS": "038", "CLAY": "039", "COCHRAN": "040",
  "COKE": "041", "COLEMAN": "042", "COLLIN": "043", "COLLINGSWORTH": "044", "COLORADO": "045",
  "COMAL": "046", "COMANCHE": "047", "CONCHO": "048", "COOKE": "049", "CORYELL": "050",
  "COTTLE": "051", "CRANE": "052", "CROCKETT": "053", "CROSBY": "054", "CULBERSON": "055",
  "DALLAM": "056", "DALLAS": "057", "DAWSON": "058", "DEAF SMITH": "059", "DELTA": "060",
  "DENTON": "061", "DEWITT": "062", "DICKENS": "063", "DIMMIT": "064", "DONLEY": "065",
  "DUVAL": "066", "EASTLAND": "067", "ECTOR": "068", "EDWARDS": "069", "ELLIS": "070",
  "EL PASO": "071", "ERATH": "072", "FALLS": "073", "FANNIN": "074", "FAYETTE": "075",
  "FISHER": "076", "FLOYD": "077", "FOARD": "078", "FORT BEND": "079", "FRANKLIN": "080",
  "FREESTONE": "081", "FRIO": "082", "GAINES": "083", "GALVESTON": "084", "GARZA": "085",
  "GILLESPIE": "086", "GLASSCOCK": "087", "GOLIAD": "088", "GONZALES": "089", "GRAY": "090",
  "GRAYSON": "091", "GREGG": "092", "GRIMES": "093", "GUADALUPE": "094", "HALE": "095",
  "HALL": "096", "HAMILTON": "097", "HANSFORD": "098", "HARDEMAN": "099", "HARDIN": "100",
  "HARRIS": "101", "HARRISON": "102", "HARTLEY": "103", "HASKELL": "104", "HAYS": "105",
  "HEMPHILL": "106", "HENDERSON": "107", "HIDALGO": "108", "HILL": "109", "HOCKLEY": "110",
  "HOOD": "111", "HOPKINS": "112", "HOUSTON": "113", "HOWARD": "114", "HUDSPETH": "115",
  "HUNT": "116", "HUTCHINSON": "117", "IRION": "118", "JACK": "119", "JACKSON": "120",
  "JASPER": "121", "JEFF DAVIS": "122", "JEFFERSON": "123", "JIM HOGG": "124", "JIM WELLS": "125",
  "JOHNSON": "126", "JONES": "127", "KARNES": "128", "KAUFMAN": "129", "KENDALL": "130",
  "KENEDY": "131", "KENT": "132", "KERR": "133", "KIMBLE": "134", "KING": "135",
  "KINNEY": "136", "KLEBERG": "137", "KNOX": "138", "LAMAR": "139", "LAMB": "140",
  "LAMPASAS": "141", "LASALLE": "142", "LA SALLE": "142", "LAVACA": "143", "LEE": "144",
  "LEON": "145", "LIBERTY": "146", "LIMESTONE": "147", "LIPSCOMB": "148", "LIVE OAK": "149",
  "LLANO": "150", "LOVING": "151", "LUBBOCK": "152", "LYNN": "153", "MADISON": "154",
  "MARION": "155", "MARTIN": "156", "MASON": "157", "MATAGORDA": "158", "MAVERICK": "159",
  "MCCULLOCH": "160", "MCLENNAN": "161", "MCMULLEN": "162", "MEDINA": "163", "MENARD": "164",
  "MIDLAND": "165", "MILAM": "166", "MILLS": "167", "MITCHELL": "168", "MONTAGUE": "169",
  "MONTGOMERY": "170", "MOORE": "171", "MORRIS": "172", "MOTLEY": "173", "NACOGDOCHES": "174",
  "NAVARRO": "175", "NEWTON": "176", "NOLAN": "177", "NUECES": "178", "OCHILTREE": "179",
  "OLDHAM": "180", "ORANGE": "181", "PALO PINTO": "182", "PANOLA": "183", "PARKER": "184",
  "PARMER": "185", "PECOS": "186", "POLK": "187", "POTTER": "188", "PRESIDIO": "189",
  "RAINS": "190", "RANDALL": "191", "REAGAN": "192", "REAL": "193", "RED RIVER": "194",
  "REEVES": "195", "REFUGIO": "196", "ROBERTS": "197", "ROBERTSON": "198", "ROCKWALL": "199",
  "RUNNELS": "200", "RUSK": "201", "SABINE": "202", "SAN AUGUSTINE": "203", "SAN JACINTO": "204",
  "SAN PATRICIO": "205", "SAN SABA": "206", "SCHLEICHER": "207", "SCURRY": "208", "SHACKELFORD": "209",
  "SHELBY": "210", "SHERMAN": "211", "SMITH": "212", "SOMERVELL": "213", "STARR": "214",
  "STEPHENS": "215", "STERLING": "216", "STONEWALL": "217", "SUTTON": "218", "SWISHER": "219",
  "TARRANT": "220", "TAYLOR": "221", "TERRELL": "222", "TERRY": "223", "THROCKMORTON": "224",
  "TITUS": "225", "TOM GREEN": "226", "TRAVIS": "227", "TRINITY": "228", "TYLER": "229",
  "UPSHUR": "230", "UPTON": "231", "UVALDE": "232", "VAL VERDE": "233", "VAN ZANDT": "234",
  "VICTORIA": "235", "WALKER": "236", "WALLER": "237", "WARD": "238", "WASHINGTON": "239",
  "WEBB": "240", "WHARTON": "241", "WHEELER": "242", "WICHITA": "243", "WILBARGER": "244",
  "WILLACY": "245", "WILLIAMSON": "246", "WILSON": "247", "WINKLER": "248", "WISE": "249",
  "WOOD": "250", "YOAKUM": "251", "YOUNG": "252", "ZAPATA": "253", "ZAVALA": "254"
};

type InteractiveMapProps = {
  locations: LocationSummary[];
  allLocations?: LocationSummary[];
  onLocationClick?: (location: LocationSummary) => void;
  onCountyClick?: (countyName: string) => void;
  selectedCounty?: string | null;
  showRankings?: boolean;
  center?: [number, number];
  zoom?: number;
};

export function InteractiveMap({
  locations,
  allLocations,
  onLocationClick,
  onCountyClick,
  selectedCounty,
  showRankings = false,
  center = [31.9686, -99.9018],
  zoom = 6,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<any>(null);
  const countyLayerRef = useRef<L.GeoJSON | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Load GeoJSON data for county boundaries
  useEffect(() => {
    fetch("/texas-counties.geojson")
      .then((res) => res.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        className: "map-tiles",
      }).addTo(mapRef.current);

      // Initialize markers layer group
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Render county overlay polygons
  useEffect(() => {
    if (!mapRef.current || !geoJsonData) return;

    // Remove existing county layer
    if (countyLayerRef.current) {
      countyLayerRef.current.remove();
    }

    // Use allLocations for county aggregation (if provided), otherwise use locations
    const locationsForAggregation = allLocations || locations;

    // Create location lookup by county
    const locationsByCounty = new Map<string, LocationSummary[]>();
    locationsForAggregation.forEach((location) => {
      const county = location.locationCounty.toUpperCase();
      if (!locationsByCounty.has(county)) {
        locationsByCounty.set(county, []);
      }
      locationsByCounty.get(county)!.push(location);
    });

    // Style function for county polygons - semi-transparent overlay
    const style = (feature: any) => {
      const rawCountyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const countyNameUpper = rawCountyName.toUpperCase();
      const countyCode = COUNTY_NAME_TO_CODE[countyNameUpper];
      const isSelected = selectedCounty && countyCode === selectedCounty;
      const hasLocations = locationsByCounty.has(countyCode || "");
      
      return {
        fillColor: isSelected ? "#3b82f6" : (hasLocations ? "#10b981" : "#d1d5db"),
        weight: isSelected ? 3 : 1,
        opacity: 1,
        color: isSelected ? "#1e40af" : "#6b7280",
        fillOpacity: isSelected ? 0.3 : (hasLocations ? 0.1 : 0.05),
      };
    };

    // Hover and click handlers for county polygons
    const onEachFeature = (feature: any, layer: L.Layer) => {
      const rawCountyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const countyNameUpper = rawCountyName.toUpperCase();
      const countyCode = COUNTY_NAME_TO_CODE[countyNameUpper];
      const countyLocations = locationsByCounty.get(countyCode || "") || [];

      // Calculate total sales for county
      const totalSales = countyLocations.reduce((sum, loc) => sum + loc.totalSales, 0);

      layer.on({
        mouseover: (e: L.LeafletMouseEvent) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: "#1f2937",
            fillOpacity: 0.2,
          });
          layer.bringToFront();

          // Show tooltip
          const tooltip = L.tooltip({
            permanent: false,
            direction: "top",
            className: "county-tooltip",
          })
            .setLatLng(e.latlng)
            .setContent(
              `<div style="font-family: Inter, sans-serif; padding: 4px;">
                <strong style="font-size: 14px;">${rawCountyName}</strong><br/>
                <span style="font-size: 12px; color: #6b7280;">
                  ${countyLocations.length} location${countyLocations.length !== 1 ? 's' : ''}<br/>
                  Total Sales: <strong>$${totalSales.toLocaleString()}</strong>
                </span><br/>
                <span style="font-size: 11px; color: #9ca3af;">Click to filter</span>
              </div>`
            )
            .addTo(mapRef.current!);

          layer._tooltip = tooltip;
        },
        mouseout: (e: L.LeafletMouseEvent) => {
          const layer = e.target;
          countyLayerRef.current?.resetStyle(layer);
          if (layer._tooltip) {
            mapRef.current?.removeLayer(layer._tooltip);
            layer._tooltip = null;
          }
        },
        click: () => {
          if (onCountyClick) {
            // Convert county name to comptroller code for filtering
            const countyCode = COUNTY_NAME_TO_CODE[countyNameUpper];
            if (countyCode) {
              onCountyClick(countyCode);
            }
          }
        },
      });
    };

    // Add county layer (semi-transparent overlay)
    countyLayerRef.current = L.geoJSON(geoJsonData, {
      style,
      onEachFeature,
    }).addTo(mapRef.current);
  }, [geoJsonData, locations, allLocations, onCountyClick, selectedCounty]);

  // Auto-zoom to selected county
  useEffect(() => {
    if (!mapRef.current || !geoJsonData || !selectedCounty) return;

    // Find the county feature
    const countyFeature = geoJsonData.features.find((feature: any) => {
      const rawCountyName = feature.properties.CNTY_NM || feature.properties.NAME || "";
      const countyNameUpper = rawCountyName.toUpperCase();
      const countyCode = COUNTY_NAME_TO_CODE[countyNameUpper];
      return countyCode === selectedCounty;
    });

    if (countyFeature && mapRef.current) {
      // Create a temporary layer to get bounds
      const tempLayer = L.geoJSON(countyFeature);
      const bounds = tempLayer.getBounds();
      
      // Fly to county bounds with smooth animation
      mapRef.current.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.2,
        maxZoom: 10,
      });
    }
  }, [selectedCounty, geoJsonData]);

  // Render location markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !locations) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Get color based on category
    const getMarkerColor = (location: LocationSummary) => {
      const liquorRatio = location.liquorSales / location.totalSales;
      const wineRatio = location.wineSales / location.totalSales;
      const beerRatio = location.beerSales / location.totalSales;

      if (liquorRatio > wineRatio && liquorRatio > beerRatio) {
        return "#9333ea"; // purple for liquor
      } else if (wineRatio > beerRatio) {
        return "#dc2626"; // red for wine
      } else {
        return "#f59e0b"; // amber for beer
      }
    };

    // Add markers for each location
    locations.forEach((location, index) => {
      const rank = index + 1;
      const color = getMarkerColor(location);

      // Use numbered DivIcon for top 10 when rankings shown
      if (showRankings && rank <= 10) {
        const icon = L.divIcon({
          className: 'custom-marker-icon',
          html: `
            <div style="
              position: relative;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 36px;
                height: 36px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                font-weight: bold;
                font-size: 14px;
                color: white;
                font-family: Inter, sans-serif;
              ">
                ${rank}
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([location.lat, location.lng], { icon });

        // Add popup
        marker.bindPopup(
          `<div style="font-family: Inter, sans-serif; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="
                background: #16a34a;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
              ">#${rank}</span>
              <strong style="font-size: 14px; flex: 1;">${location.locationName}</strong>
            </div>
            <span style="font-size: 12px; color: #6b7280;">${location.locationAddress}</span><br/>
            <span style="font-size: 12px; color: #6b7280;">${location.locationCity}, ${location.locationCounty}</span><br/>
            <span style="font-size: 13px; font-weight: 600; margin-top: 4px; display: block;">
              Total: $${location.totalSales.toLocaleString()}
            </span>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
              <span style="color: #9333ea;">■</span> Liquor: $${location.liquorSales.toLocaleString()}<br/>
              <span style="color: #dc2626;">■</span> Wine: $${location.wineSales.toLocaleString()}<br/>
              <span style="color: #f59e0b;">■</span> Beer: $${location.beerSales.toLocaleString()}
            </div>
          </div>`,
          { closeButton: true }
        );

        // Add click handler
        if (onLocationClick) {
          marker.on("click", () => {
            onLocationClick(location);
          });
        }

        marker.addTo(markersLayerRef.current!);
      } else {
        // Standard circle markers for non-top-10 or when rankings disabled
        const marker = L.circleMarker([location.lat, location.lng], {
          radius: 7,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

        // Add popup
        marker.bindPopup(
          `<div style="font-family: Inter, sans-serif; min-width: 200px;">
            <strong style="font-size: 14px;">${location.locationName}</strong><br/>
            <span style="font-size: 12px; color: #6b7280;">${location.locationAddress}</span><br/>
            <span style="font-size: 12px; color: #6b7280;">${location.locationCity}, ${location.locationCounty}</span><br/>
            <span style="font-size: 13px; font-weight: 600; margin-top: 4px; display: block;">
              Total: $${location.totalSales.toLocaleString()}
            </span>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
              <span style="color: #9333ea;">■</span> Liquor: $${location.liquorSales.toLocaleString()}<br/>
              <span style="color: #dc2626;">■</span> Wine: $${location.wineSales.toLocaleString()}<br/>
              <span style="color: #f59e0b;">■</span> Beer: $${location.beerSales.toLocaleString()}
            </div>
          </div>`,
          { closeButton: true }
        );

        // Add click handler
        if (onLocationClick) {
          marker.on("click", () => {
            onLocationClick(location);
          });
        }

        marker.addTo(markersLayerRef.current!);
      }
    });
  }, [locations, onLocationClick, showRankings]);

  return <div ref={mapContainerRef} className="w-full h-full" data-testid="map-container" />;
}
