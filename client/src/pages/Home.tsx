import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { InteractiveMap } from "@/components/InteractiveMap";
import { CountyLocationsDialog } from "@/components/CountyLocationsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, AlertCircle, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CountySales } from "@shared/schema";

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return "Unknown";
  
  let year: string;
  let month: string;
  
  if (dateStr.includes('-') || dateStr.includes('T')) {
    const date = new Date(dateStr);
    year = date.getFullYear().toString();
    month = (date.getMonth() + 1).toString().padStart(2, '0');
  } else {
    year = dateStr.substring(0, 4);
    month = dateStr.substring(4, 6);
  }
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(month) - 1;
  
  if (monthIndex < 0 || monthIndex > 11) return "Unknown";
  
  return `${monthNames[monthIndex]} ${year}`;
}

export default function Home() {
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedCounty, setSelectedCounty] = useState<CountySales | null>(null);

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

  const { data: counties, isLoading, error } = useQuery<CountySales[]>({
    queryKey: ["/api/counties", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      const url = `/api/counties${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch county data');
      return response.json();
    },
  });

  const totalSales = useMemo(() => {
    if (!counties) return 0;
    return counties.reduce((sum, county) => sum + county.totalSales, 0);
  }, [counties]);

  const totalLocations = useMemo(() => {
    if (!counties) return 0;
    return counties.reduce((sum, county) => sum + county.locationCount, 0);
  }, [counties]);

  const topCounties = useMemo(() => {
    if (!counties) return [];
    return [...counties]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
  }, [counties]);

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
          </div>
        </div>

        <div className="p-4 border-b">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales {selectedYear !== "all" ? `(${selectedYear})` : "(All Time)"}
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
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalLocations.toLocaleString()} locations across {counties?.length || 0} counties
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
                  Failed to load county data. Please try again later.
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

            {!isLoading && !error && topCounties.length > 0 && (
              <>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Top 10 Counties by Sales</h3>
                {topCounties.map((county, index) => (
                  <Card 
                    key={county.countyName}
                    className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
                    onClick={() => setSelectedCounty(county)}
                    data-testid={`card-county-${county.countyName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                          <h3 className="font-semibold truncate">{county.countyName}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {county.locationCount} locations
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-bold text-lg">
                          ${county.totalSales.toLocaleString()}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          <div>L: ${(county.liquorSales / 1000).toFixed(0)}k</div>
                          <div>W: ${(county.wineSales / 1000).toFixed(0)}k</div>
                          <div>B: ${(county.beerSales / 1000).toFixed(0)}k</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}

            {!isLoading && !error && counties && counties.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No county data available for the selected period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* County Locations Dialog */}
      <CountyLocationsDialog
        county={selectedCounty}
        open={!!selectedCounty}
        onClose={() => setSelectedCounty(null)}
      />

      {/* Map Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Click any county to view locations sorted by sales</p>
            <p className="text-xs mt-1">Hover over counties to see sales breakdown</p>
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
            <>
              <InteractiveMap
                counties={counties || []}
                onCountyClick={(county) => {
                  setSelectedCounty(county);
                }}
              />
              <div className="absolute bottom-4 left-4 bg-card border rounded-lg p-3 shadow-lg">
                <div className="text-xs font-medium mb-2">Sales Legend</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-[#7c2d12]" />
                    <span>Highest Sales</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-[#c2410c]" />
                    <span>Medium Sales</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 bg-[#f97316]" />
                    <span>Lower Sales</span>
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
