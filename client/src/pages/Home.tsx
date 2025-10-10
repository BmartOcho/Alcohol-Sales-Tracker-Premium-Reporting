import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { InteractiveMap } from "@/components/InteractiveMap";
import { LocationDetailModal } from "@/components/LocationDetailModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, AlertCircle, Calendar, Search, MapPin, X, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LocationSummary } from "@shared/schema";
import { SEO } from "@/components/SEO";

// County code to name mapping for display
const COUNTY_CODE_TO_NAME: Record<string, string> = {
  "001": "Anderson", "002": "Andrews", "003": "Angelina", "004": "Aransas", "005": "Archer",
  "006": "Armstrong", "007": "Atascosa", "008": "Austin", "009": "Bailey", "010": "Bandera",
  "011": "Bastrop", "012": "Baylor", "013": "Bee", "014": "Bell", "015": "Bexar",
  "016": "Blanco", "017": "Borden", "018": "Bosque", "019": "Bowie", "020": "Brazoria",
  "021": "Brazos", "022": "Brewster", "023": "Briscoe", "024": "Brooks", "025": "Brown",
  "026": "Burleson", "027": "Burnet", "028": "Caldwell", "029": "Calhoun", "030": "Callahan",
  "031": "Cameron", "032": "Camp", "033": "Carson", "034": "Cass", "035": "Castro",
  "036": "Chambers", "037": "Cherokee", "038": "Childress", "039": "Clay", "040": "Cochran",
  "041": "Coke", "042": "Coleman", "043": "Collin", "044": "Collingsworth", "045": "Colorado",
  "046": "Comal", "047": "Comanche", "048": "Concho", "049": "Cooke", "050": "Coryell",
  "051": "Cottle", "052": "Crane", "053": "Crockett", "054": "Crosby", "055": "Culberson",
  "056": "Dallam", "057": "Dallas", "058": "Dawson", "059": "Deaf Smith", "060": "Delta",
  "061": "Denton", "062": "DeWitt", "063": "Dickens", "064": "Dimmit", "065": "Donley",
  "066": "Duval", "067": "Eastland", "068": "Ector", "069": "Edwards", "070": "Ellis",
  "071": "El Paso", "072": "Erath", "073": "Falls", "074": "Fannin", "075": "Fayette",
  "076": "Fisher", "077": "Floyd", "078": "Foard", "079": "Fort Bend", "080": "Franklin",
  "081": "Freestone", "082": "Frio", "083": "Gaines", "084": "Galveston", "085": "Garza",
  "086": "Gillespie", "087": "Glasscock", "088": "Goliad", "089": "Gonzales", "090": "Gray",
  "091": "Grayson", "092": "Gregg", "093": "Grimes", "094": "Guadalupe", "095": "Hale",
  "096": "Hall", "097": "Hamilton", "098": "Hansford", "099": "Hardeman", "100": "Hardin",
  "101": "Harris", "102": "Harrison", "103": "Hartley", "104": "Haskell", "105": "Hays",
  "106": "Hemphill", "107": "Henderson", "108": "Hidalgo", "109": "Hill", "110": "Hockley",
  "111": "Hood", "112": "Hopkins", "113": "Houston", "114": "Howard", "115": "Hudspeth",
  "116": "Hunt", "117": "Hutchinson", "118": "Irion", "119": "Jack", "120": "Jackson",
  "121": "Jasper", "122": "Jeff Davis", "123": "Jefferson", "124": "Jim Hogg", "125": "Jim Wells",
  "126": "Johnson", "127": "Jones", "128": "Karnes", "129": "Kaufman", "130": "Kendall",
  "131": "Kenedy", "132": "Kent", "133": "Kerr", "134": "Kimble", "135": "King",
  "136": "Kinney", "137": "Kleberg", "138": "Knox", "139": "Lamar", "140": "Lamb",
  "141": "Lampasas", "142": "La Salle", "143": "Lavaca", "144": "Lee", "145": "Leon",
  "146": "Liberty", "147": "Limestone", "148": "Lipscomb", "149": "Live Oak", "150": "Llano",
  "151": "Loving", "152": "Lubbock", "153": "Lynn", "154": "Madison", "155": "Marion",
  "156": "Martin", "157": "Mason", "158": "Matagorda", "159": "Maverick", "160": "McCulloch",
  "161": "McLennan", "162": "McMullen", "163": "Medina", "164": "Menard", "165": "Midland",
  "166": "Milam", "167": "Mills", "168": "Mitchell", "169": "Montague", "170": "Montgomery",
  "171": "Moore", "172": "Morris", "173": "Motley", "174": "Nacogdoches", "175": "Navarro",
  "176": "Newton", "177": "Nolan", "178": "Nueces", "179": "Ochiltree", "180": "Oldham",
  "181": "Orange", "182": "Palo Pinto", "183": "Panola", "184": "Parker", "185": "Parmer",
  "186": "Pecos", "187": "Polk", "188": "Potter", "189": "Presidio", "190": "Rains",
  "191": "Randall", "192": "Reagan", "193": "Real", "194": "Red River", "195": "Reeves",
  "196": "Refugio", "197": "Roberts", "198": "Robertson", "199": "Rockwall", "200": "Runnels",
  "201": "Rusk", "202": "Sabine", "203": "San Augustine", "204": "San Jacinto", "205": "San Patricio",
  "206": "San Saba", "207": "Schleicher", "208": "Scurry", "209": "Shackelford", "210": "Shelby",
  "211": "Sherman", "212": "Smith", "213": "Somervell", "214": "Starr", "215": "Stephens",
  "216": "Sterling", "217": "Stonewall", "218": "Sutton", "219": "Swisher", "220": "Tarrant",
  "221": "Taylor", "222": "Terrell", "223": "Terry", "224": "Throckmorton", "225": "Titus",
  "226": "Tom Green", "227": "Travis", "228": "Trinity", "229": "Tyler", "230": "Upshur",
  "231": "Upton", "232": "Uvalde", "233": "Val Verde", "234": "Van Zandt", "235": "Victoria",
  "236": "Walker", "237": "Waller", "238": "Ward", "239": "Washington", "240": "Webb",
  "241": "Wharton", "242": "Wheeler", "243": "Wichita", "244": "Wilbarger", "245": "Willacy",
  "246": "Williamson", "247": "Wilson", "248": "Winkler", "249": "Wise", "250": "Wood",
  "251": "Yoakum", "252": "Young", "253": "Zapata", "254": "Zavala"
};

export default function Home() {
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedPermitNumber, setSelectedPermitNumber] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  // Available years: 2015-2024 in database, 2025 from API (real-time)
  const availableYears = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

  // Fetch full location details (all-time data) when a location is selected
  const { data: selectedLocationFull } = useQuery<LocationSummary>({
    queryKey: ["/api/locations/full", selectedPermitNumber], // Use unique key to avoid cache conflicts
    queryFn: async () => {
      const response = await fetch(`/api/locations/${selectedPermitNumber}`);
      if (!response.ok) throw new Error('Failed to fetch location');
      const data = await response.json();
      console.log(`[HOME] Fetched full location data:`, {
        permitNumber: data.permitNumber,
        totalSales: data.totalSales,
        monthlyRecords: data.monthlyRecords?.length
      });
      return data;
    },
    enabled: !!selectedPermitNumber,
    staleTime: 0, // Always fetch fresh all-time data
  });

  const dateRange = useMemo(() => {
    const year = parseInt(selectedYear);
    return {
      startDate: `${year}-01-01T00:00:00.000`,
      endDate: `${year}-12-31T23:59:59.999`
    };
  }, [selectedYear]);

  const { data: locations, isLoading, error } = useQuery<LocationSummary[]>({
    queryKey: ["/api/locations", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      // Fetch first page to get total count
      const params = new URLSearchParams();
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      params.append('page', '1');
      params.append('limit', '1000');
      
      const firstResponse = await fetch(`/api/locations?${params.toString()}`);
      if (!firstResponse.ok) {
        const errorData = await firstResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${firstResponse.status}`);
      }
      
      const firstData = await firstResponse.json();
      const allLocations: LocationSummary[] = [...firstData.locations];
      
      // If there are more pages, fetch them in parallel (batches of 5)
      if (firstData.pagination.hasMore) {
        const totalPages = firstData.pagination.totalPages;
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        
        // Fetch in batches of 5 pages at a time to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < remainingPages.length; i += batchSize) {
          const batch = remainingPages.slice(i, i + batchSize);
          const batchPromises = batch.map(async (page) => {
            const batchParams = new URLSearchParams();
            if (dateRange.startDate && dateRange.endDate) {
              batchParams.append('startDate', dateRange.startDate);
              batchParams.append('endDate', dateRange.endDate);
            }
            batchParams.append('page', page.toString());
            batchParams.append('limit', '1000');
            
            const response = await fetch(`/api/locations?${batchParams.toString()}`);
            if (!response.ok) throw new Error(`Failed to fetch page ${page}`);
            const data = await response.json();
            return { page, locations: data.locations };
          });
          
          const batchResults = await Promise.all(batchPromises);
          batchResults
            .sort((a, b) => a.page - b.page)
            .forEach(result => allLocations.push(...result.locations));
            
          console.log(`Fetched batch: pages ${batch[0]}-${batch[batch.length - 1]} (${allLocations.length}/${firstData.pagination.total} total)`);
        }
      }
      
      console.log(`All data loaded: ${allLocations.length} locations`);
      return allLocations;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter locations based on search and county selection
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    
    let filtered = locations;

    // Filter by selected county (selectedCounty is now a code like "101")
    if (selectedCounty) {
      filtered = filtered.filter(
        (loc) => loc.locationCounty === selectedCounty
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.locationName.toLowerCase().includes(query) ||
          loc.locationCity.toLowerCase().includes(query) ||
          loc.locationCounty.toLowerCase().includes(query) ||
          loc.locationAddress.toLowerCase().includes(query)
      );
    }

    // Sort by total sales (highest first) - clone to avoid mutating cache
    return [...filtered].sort((a, b) => b.totalSales - a.totalSales);
  }, [locations, searchQuery, selectedCounty]);

  // Paginate filtered locations
  const paginatedLocations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredLocations.slice(start, end);
  }, [filteredLocations, currentPage]);

  const totalPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);

  const totalSales = useMemo(() => {
    if (!filteredLocations) return 0;
    return filteredLocations.reduce((sum, loc) => sum + loc.totalSales, 0);
  }, [filteredLocations]);

  const clearFilters = () => {
    setSelectedCounty(null);
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      <SEO
        title="Texas Alcohol Sales Map - Explore Sales Data by Location"
        description="Interactive map showing alcohol sales data for 22,000+ Texas establishments. Filter by year, search locations, and analyze sales trends across all 254 counties."
        type="website"
      />
      {/* Sidebar */}
      <div className="w-full lg:w-96 border-r bg-card flex flex-col h-1/2 lg:h-full">
        <div className="p-3 lg:p-4 border-b space-y-3 lg:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Star className="h-5 w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              <h1 className="text-lg lg:text-xl font-bold truncate">Texas Alcohol Sales</h1>
            </div>
            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
              <Link href="/reports">
                <Button variant="outline" size="sm" data-testid="button-reports" className="hidden sm:flex">
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                </Button>
                <Button variant="outline" size="icon" data-testid="button-reports-mobile" className="sm:hidden h-8 w-8">
                  <FileText className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/subscribe">
                <Button variant="default" size="sm" data-testid="button-subscribe" className="hidden sm:flex">
                  Upgrade
                </Button>
                <Button variant="default" size="icon" data-testid="button-subscribe-mobile" className="sm:hidden h-8 w-8">
                  <Star className="h-4 w-4" />
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={(value) => {
                setSelectedYear(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="flex-1" data-testid="select-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations, cities, counties..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            {selectedCounty && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-md">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium flex-1">
                  Filtered: {COUNTY_CODE_TO_NAME[selectedCounty] || selectedCounty} County
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={clearFilters}
                  data-testid="button-clear-county-filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-b">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedCounty ? `${COUNTY_CODE_TO_NAME[selectedCounty] || selectedCounty} County` : "Total Sales"} {selectedYear !== "all" ? `(${selectedYear})` : "(All Time)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <p className="text-3xl font-mono font-bold" data-testid="text-total-sales">
                    ${totalSales.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-location-count">
                    {filteredLocations.length.toLocaleString()} location{filteredLocations.length !== 1 ? 's' : ''}
                    {searchQuery && " (filtered)"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load locations: {error instanceof Error ? error.message : 'Unknown error'}. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            )}

            {!isLoading && !error && paginatedLocations.length > 0 && (
              <>
                {paginatedLocations.map((location) => (
                  <Card 
                    key={location.permitNumber}
                    className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
                    onClick={() => setSelectedPermitNumber(location.permitNumber)}
                    data-testid={`card-location-${location.permitNumber}`}
                  >
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold truncate">{location.locationName}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {location.locationAddress}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {location.locationCity}, {location.locationCounty}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-bold text-lg">
                          ${location.totalSales.toLocaleString()}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <span style={{ color: "#9333ea" }}>■</span> ${(location.liquorSales / 1000).toFixed(0)}k{" "}
                          <span style={{ color: "#dc2626" }}>■</span> ${(location.wineSales / 1000).toFixed(0)}k{" "}
                          <span style={{ color: "#f59e0b" }}>■</span> ${(location.beerSales / 1000).toFixed(0)}k
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}

            {!isLoading && !error && filteredLocations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || selectedCounty ? (
                  <>
                    <p>No locations found matching your filters.</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <p>No locations available for the selected period.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Detail Modal */}
      <LocationDetailModal
        location={selectedLocationFull || null}
        open={!!selectedPermitNumber}
        onClose={() => setSelectedPermitNumber(null)}
        selectedYear={selectedYear}
      />

      {/* Map Section */}
      <div className="flex-1 flex flex-col h-1/2 lg:h-full overflow-hidden">
        <div className="p-2 lg:p-4 border-b flex-shrink-0">
          <div className="text-xs lg:text-sm text-muted-foreground">
            <p className="font-medium">
              <span className="hidden sm:inline">Click location markers for details • Click counties to filter sidebar</span>
              <span className="sm:hidden">Tap markers & counties to explore</span>
            </p>
            <p className="text-xs mt-1 hidden sm:block">
              Marker colors: <span style={{ color: "#9333ea" }}>■ Liquor-dominant</span>{" "}
              <span style={{ color: "#dc2626" }}>■ Wine-dominant</span>{" "}
              <span style={{ color: "#f59e0b" }}>■ Beer-dominant</span>
            </p>
          </div>
        </div>
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center space-y-3 lg:space-y-4 px-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-primary"></div>
                </div>
                <div>
                  <p className="text-base lg:text-lg font-medium">Loading Texas Alcohol Sales Data</p>
                  <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                    Fetching {selectedYear} sales data for 22,000+ locations...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <InteractiveMap
              locations={filteredLocations}
              allLocations={locations}
              onLocationClick={(location) => {
                setSelectedPermitNumber(location.permitNumber);
              }}
              onCountyClick={(countyName) => {
                setSelectedCounty(countyName);
                setCurrentPage(1);
              }}
              selectedCounty={selectedCounty}
            />
          )}
        </div>
      </div>
    </div>
  );
}
