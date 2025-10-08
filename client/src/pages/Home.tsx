import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { InteractiveMap } from "@/components/InteractiveMap";
import { LocationDetailModal } from "@/components/LocationDetailModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, AlertCircle, Calendar, Search, MapPin, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LocationSummary } from "@shared/schema";

export default function Home() {
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedLocation, setSelectedLocation] = useState<LocationSummary | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  const dateRange = useMemo(() => {
    if (selectedYear === "all") {
      return { startDate: undefined, endDate: undefined };
    }
    const year = parseInt(selectedYear);
    return {
      startDate: `${year}-01-01T00:00:00.000`,
      endDate: `${year}-12-31T23:59:59.999`
    };
  }, [selectedYear]);

  const { data: locations, isLoading, error } = useQuery<LocationSummary[]>({
    queryKey: ["/api/locations", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      const url = `/api/locations${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    },
  });

  // Filter locations based on search and county selection
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    
    let filtered = locations;

    // Filter by selected county
    if (selectedCounty) {
      filtered = filtered.filter(
        (loc) => loc.locationCounty.toUpperCase() === selectedCounty.toUpperCase()
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

    return filtered;
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
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 border-r bg-card flex flex-col h-full">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Texas Alcohol Sales</h1>
            </div>
            <ThemeToggle />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="flex-1" data-testid="select-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                  <SelectItem value="2019">2019</SelectItem>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2017">2017</SelectItem>
                  <SelectItem value="2016">2016</SelectItem>
                  <SelectItem value="2015">2015</SelectItem>
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
                  Filtered: {selectedCounty} County
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
                {selectedCounty ? `${selectedCounty} County` : "Total Sales"} {selectedYear !== "all" ? `(${selectedYear})` : "(All Time)"}
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
                  Failed to load locations. Please try again later.
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
                    onClick={() => setSelectedLocation(location)}
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
        location={selectedLocation}
        open={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />

      {/* Map Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">
              Click location markers for details • Click counties to filter sidebar
            </p>
            <p className="text-xs mt-1">
              Marker colors: <span style={{ color: "#9333ea" }}>■ Liquor-dominant</span>{" "}
              <span style={{ color: "#dc2626" }}>■ Wine-dominant</span>{" "}
              <span style={{ color: "#f59e0b" }}>■ Beer-dominant</span>
            </p>
          </div>
        </div>
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-8 w-48 mx-auto mb-2" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            </div>
          ) : (
            <InteractiveMap
              locations={filteredLocations}
              onLocationClick={(location) => {
                setSelectedLocation(location);
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
