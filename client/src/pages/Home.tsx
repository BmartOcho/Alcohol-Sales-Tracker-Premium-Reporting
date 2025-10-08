import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBar } from "@/components/SearchBar";
import { SalesChart } from "@/components/SalesChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, AlertCircle } from "lucide-react";
import type { Establishment } from "@shared/schema";

type Category = "liquor" | "wine" | "beer";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(["liquor", "wine", "beer"]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);

  const { data: establishments, isLoading, error } = useQuery<Establishment[]>({
    queryKey: ["/api/establishments"],
  });

  const handleCategoryToggle = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const filteredEstablishments = useMemo(() => {
    if (!establishments) return [];

    return establishments.filter((est) => {
      const matchesSearch =
        est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        est.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        est.county.toLowerCase().includes(searchQuery.toLowerCase());

      const hasSelectedCategory =
        selectedCategories.length === 0 ||
        (selectedCategories.includes("liquor") && est.liquorSales > 0) ||
        (selectedCategories.includes("wine") && est.wineSales > 0) ||
        (selectedCategories.includes("beer") && est.beerSales > 0);

      return matchesSearch && hasSelectedCategory;
    });
  }, [establishments, searchQuery, selectedCategories]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return filteredEstablishments.map((est) => {
      const primaryCategory = 
        est.liquorSales >= est.wineSales && est.liquorSales >= est.beerSales
          ? "liquor"
          : est.wineSales >= est.beerSales
          ? "wine"
          : "beer";

      return {
        id: est.id,
        lat: est.lat,
        lng: est.lng,
        name: est.name,
        category: primaryCategory,
        sales: est.totalSales,
      };
    });
  }, [filteredEstablishments]);

  const chartData = useMemo(() => {
    if (!filteredEstablishments.length) return [];

    const cityAggregates = filteredEstablishments.reduce((acc, est) => {
      if (!acc[est.city]) {
        acc[est.city] = { name: est.city, liquor: 0, wine: 0, beer: 0 };
      }
      acc[est.city].liquor += est.liquorSales;
      acc[est.city].wine += est.wineSales;
      acc[est.city].beer += est.beerSales;
      return acc;
    }, {} as Record<string, { name: string; liquor: number; wine: number; beer: number }>);

    return Object.values(cityAggregates)
      .sort((a, b) => (b.liquor + b.wine + b.beer) - (a.liquor + a.wine + a.beer))
      .slice(0, 10);
  }, [filteredEstablishments]);

  const totalSales = useMemo(() => {
    return filteredEstablishments.reduce((sum, est) => sum + est.totalSales, 0);
  }, [filteredEstablishments]);

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
        </div>

        <div className="p-4 border-b">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales (Filtered)
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
                    {filteredEstablishments.length} establishments
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
                  Failed to load establishment data. Please try again later.
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

            {!isLoading && !error && filteredEstablishments.map((est) => (
              <div
                key={est.id}
                onClick={() => setSelectedEstablishment(est.id)}
                className={selectedEstablishment === est.id ? "ring-2 ring-primary rounded-lg" : ""}
              >
                <EstablishmentCard
                  name={est.name}
                  address={est.address}
                  city={est.city}
                  county={est.county}
                  totalSales={est.totalSales}
                  liquorSales={est.liquorSales}
                  wineSales={est.wineSales}
                  beerSales={est.beerSales}
                />
              </div>
            ))}

            {!isLoading && !error && filteredEstablishments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No establishments found. Try adjusting your filters.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

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
                  setSelectedEstablishment(marker.id);
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
