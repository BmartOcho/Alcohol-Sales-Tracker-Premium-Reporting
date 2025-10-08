import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBar } from "@/components/SearchBar";
import { SalesChart } from "@/components/SalesChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocationDetailModal } from "@/components/LocationDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, AlertCircle, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LocationSummary, MonthlySalesRecord } from "@shared/schema";

type Category = "liquor" | "wine" | "beer";

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(["liquor", "wine", "beer"]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const { data: locations, isLoading, error } = useQuery<LocationSummary[]>({
    queryKey: ["/api/locations"],
  });

  const handleCategoryToggle = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const availableMonths = useMemo(() => {
    if (!locations) return [];
    const monthSet = new Set<string>();
    locations.forEach(loc => {
      loc.monthlyRecords.forEach(record => {
        if (record.obligationEndDate) {
          monthSet.add(record.obligationEndDate);
        }
      });
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    if (!locations) return [];

    return locations
      .map(loc => {
        // Filter monthly records by selected month
        const filteredMonthlyRecords = selectedMonth === "all" 
          ? loc.monthlyRecords
          : loc.monthlyRecords.filter(r => r.obligationEndDate === selectedMonth);

        if (filteredMonthlyRecords.length === 0) return null;

        // Recalculate totals based on filtered months
        const totalSales = filteredMonthlyRecords.reduce((sum, r) => sum + r.totalReceipts, 0);
        const liquorSales = filteredMonthlyRecords.reduce((sum, r) => sum + r.liquorReceipts, 0);
        const wineSales = filteredMonthlyRecords.reduce((sum, r) => sum + r.wineReceipts, 0);
        const beerSales = filteredMonthlyRecords.reduce((sum, r) => sum + r.beerReceipts, 0);

        return {
          ...loc,
          totalSales,
          liquorSales,
          wineSales,
          beerSales,
          monthlyRecords: filteredMonthlyRecords,
        };
      })
      .filter((loc): loc is LocationSummary => loc !== null)
      .filter((loc) => {
        const matchesSearch =
          loc.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.locationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.locationCounty.toLowerCase().includes(searchQuery.toLowerCase());

        const hasSelectedCategory =
          selectedCategories.length === 0 ||
          (selectedCategories.includes("liquor") && loc.liquorSales > 0) ||
          (selectedCategories.includes("wine") && loc.wineSales > 0) ||
          (selectedCategories.includes("beer") && loc.beerSales > 0);

        return matchesSearch && hasSelectedCategory;
      });
  }, [locations, searchQuery, selectedCategories, selectedMonth]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return filteredLocations.map((loc) => {
      const primaryCategory = 
        loc.liquorSales >= loc.wineSales && loc.liquorSales >= loc.beerSales
          ? "liquor"
          : loc.wineSales >= loc.beerSales
          ? "wine"
          : "beer";

      return {
        id: loc.permitNumber,
        lat: loc.lat,
        lng: loc.lng,
        name: loc.locationName,
        category: primaryCategory,
        sales: loc.totalSales,
      };
    });
  }, [filteredLocations]);

  const chartData = useMemo(() => {
    if (!filteredLocations.length) return [];

    const cityAggregates = filteredLocations.reduce((acc, loc) => {
      if (!acc[loc.locationCity]) {
        acc[loc.locationCity] = { name: loc.locationCity, liquor: 0, wine: 0, beer: 0 };
      }
      acc[loc.locationCity].liquor += loc.liquorSales;
      acc[loc.locationCity].wine += loc.wineSales;
      acc[loc.locationCity].beer += loc.beerSales;
      return acc;
    }, {} as Record<string, { name: string; liquor: number; wine: number; beer: number }>);

    return Object.values(cityAggregates)
      .sort((a, b) => (b.liquor + b.wine + b.beer) - (a.liquor + a.wine + a.beer))
      .slice(0, 10);
  }, [filteredLocations]);

  const totalSales = useMemo(() => {
    return filteredLocations.reduce((sum, loc) => sum + loc.totalSales, 0);
  }, [filteredLocations]);

  const selectedLocationData = useMemo(() => {
    if (!selectedLocation || !locations) return null;
    return locations.find(loc => loc.permitNumber === selectedLocation);
  }, [selectedLocation, locations]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 border-r bg-card flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Texas Alcohol Sales</h1>
            </div>
            <ThemeToggle />
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <CategoryFilter selectedCategories={selectedCategories} onToggle={handleCategoryToggle} />
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="flex-1" data-testid="select-month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.slice(0, 24).map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthYear(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 border-b">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales {selectedMonth !== "all" ? `(${formatMonthYear(selectedMonth)})` : "(All Time)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <p className="text-3xl font-mono font-bold" data-testid="text-total-filtered-sales">
                    ${totalSales.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredLocations.length} locations
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load location data. Please try again later.
                </AlertDescription>
              </Alert>
            )}
            
            {isLoading && (
              <>
                {[...Array(5)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {!isLoading && !error && filteredLocations.map((loc) => (
              <div
                key={loc.permitNumber}
                onClick={() => setSelectedLocation(loc.permitNumber)}
                className={selectedLocation === loc.permitNumber ? "ring-2 ring-primary rounded-lg" : ""}
              >
                <EstablishmentCard
                  name={loc.locationName}
                  address={loc.locationAddress}
                  city={loc.locationCity}
                  county={loc.locationCounty}
                  totalSales={loc.totalSales}
                  liquorSales={loc.liquorSales}
                  wineSales={loc.wineSales}
                  beerSales={loc.beerSales}
                />
              </div>
            ))}

            {!isLoading && !error && filteredLocations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No locations found. Try adjusting your filters.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Location Detail Modal */}
      <LocationDetailModal
        location={selectedLocationData}
        open={!!selectedLocationData}
        onClose={() => setSelectedLocation(null)}
      />

      {/* Map Section */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <SalesChart data={chartData} />
          )}
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
            <>
              <InteractiveMap
                markers={mapMarkers}
                onMarkerClick={(marker) => {
                  setSelectedLocation(marker.id);
                }}
              />
              <div className="absolute bottom-4 left-4 bg-card border rounded-lg p-3 shadow-lg">
                <div className="text-xs font-medium mb-2">Category Legend</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-[#a855f7]" />
                    <span>Liquor (Primary)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-[#e11d48]" />
                    <span>Wine (Primary)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <span>Beer (Primary)</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
