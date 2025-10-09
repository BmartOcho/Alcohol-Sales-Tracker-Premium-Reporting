import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import type { LocationSummary } from "@shared/schema";

const COUNTY_CODE_TO_NAME: Record<string, string> = {
  "001": "Anderson", "057": "Dallas", "101": "Harris", "015": "Bexar", "227": "Travis",
  "071": "El Paso", "220": "Tarrant", "043": "Collin", "061": "Denton", "246": "Williamson",
  "021": "Brazos", "014": "Bell", "161": "McLennan", "178": "Nueces", "084": "Galveston",
  // Add more as needed
};

const YEARS = ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];

interface CountyTrendData {
  county: string;
  countyName: string;
  year: string;
  totalSales: number;
  liquorSales: number;
  wineSales: number;
  beerSales: number;
  locationCount: number;
}

export function HotSpotTimeline() {
  const [selectedCounties, setSelectedCounties] = useState<string[]>(["101", "057", "015"]); // Harris, Dallas, Bexar
  const [startYear, setStartYear] = useState("2020");
  const [endYear, setEndYear] = useState("2025");

  // Fetch data for each year in the range
  const yearQueries = useQuery({
    queryKey: ["/api/locations/trends", startYear, endYear, selectedCounties.join(",")],
    queryFn: async () => {
      const start = parseInt(startYear);
      const end = parseInt(endYear);
      const trends: CountyTrendData[] = [];

      for (let year = start; year <= end; year++) {
        const params = new URLSearchParams({
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          page: "1",
          limit: "1000"
        });

        // Fetch first page to get total
        const firstResponse = await fetch(`/api/locations?${params.toString()}`);
        if (!firstResponse.ok) continue;
        const firstData = await firstResponse.json();
        
        let allLocations: LocationSummary[] = [...firstData.locations];
        
        // Fetch remaining pages
        const totalPages = firstData.pagination.totalPages || 0;
        if (totalPages > 1) {
          const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
          const batchSize = 5;
          
          for (let i = 0; i < remainingPages.length; i += batchSize) {
            const batch = remainingPages.slice(i, i + batchSize);
            const batchPromises = batch.map(async (page) => {
              const batchParams = new URLSearchParams({
                startDate: `${year}-01-01`,
                endDate: `${year}-12-31`,
                page: page.toString(),
                limit: "1000"
              });
              const response = await fetch(`/api/locations?${batchParams.toString()}`);
              if (!response.ok) return { page, locations: [] };
              const data = await response.json();
              return { page, locations: data.locations };
            });
            
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(result => allLocations.push(...result.locations));
          }
        }

        // Aggregate by county
        selectedCounties.forEach(countyCode => {
          // Database stores county codes, not names - filter by code
          const countyLocations = allLocations.filter(loc => loc.locationCounty === countyCode);
          if (countyLocations.length > 0) {
            trends.push({
              county: countyCode,
              countyName: COUNTY_CODE_TO_NAME[countyCode] || countyCode,
              year: year.toString(),
              totalSales: countyLocations.reduce((sum, loc) => sum + loc.totalSales, 0),
              liquorSales: countyLocations.reduce((sum, loc) => sum + loc.liquorSales, 0),
              wineSales: countyLocations.reduce((sum, loc) => sum + loc.wineSales, 0),
              beerSales: countyLocations.reduce((sum, loc) => sum + loc.beerSales, 0),
              locationCount: countyLocations.length,
            });
          }
        });
      }

      return trends;
    },
    enabled: selectedCounties.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Prepare chart data - group by year
  const chartData = useMemo(() => {
    if (!yearQueries.data) return [];
    
    const yearMap = new Map<string, any>();
    
    yearQueries.data.forEach((item: CountyTrendData) => {
      if (!yearMap.has(item.year)) {
        yearMap.set(item.year, { year: item.year });
      }
      const yearData = yearMap.get(item.year);
      yearData[`${item.countyName}_total`] = item.totalSales;
      yearData[`${item.countyName}_liquor`] = item.liquorSales;
      yearData[`${item.countyName}_wine`] = item.wineSales;
      yearData[`${item.countyName}_beer`] = item.beerSales;
    });

    return Array.from(yearMap.values()).sort((a: any, b: any) => parseInt(a.year) - parseInt(b.year));
  }, [yearQueries.data]);

  // Calculate trends
  const trends = useMemo(() => {
    if (!yearQueries.data || yearQueries.data.length < 2) return [];
    
    return selectedCounties.map(county => {
      const countyData = yearQueries.data.filter((d: CountyTrendData) => d.county === county).sort((a: CountyTrendData, b: CountyTrendData) => parseInt(a.year) - parseInt(b.year));
      if (countyData.length < 2) return null;
      
      const first = countyData[0];
      const last = countyData[countyData.length - 1];
      const change = ((last.totalSales - first.totalSales) / first.totalSales) * 100;
      
      return {
        county,
        countyName: COUNTY_CODE_TO_NAME[county] || county,
        change,
        direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        firstYear: first.year,
        lastYear: last.year,
        firstSales: first.totalSales,
        lastSales: last.totalSales,
      };
    }).filter(Boolean);
  }, [yearQueries.data, selectedCounties]);

  const availableCounties = Object.entries(COUNTY_CODE_TO_NAME).map(([code, name]) => ({
    code,
    name
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Select Counties (up to 5)</Label>
          <Select
            value={selectedCounties[0] || ""}
            onValueChange={(value) => {
              if (!selectedCounties.includes(value) && selectedCounties.length < 5) {
                setSelectedCounties([...selectedCounties, value]);
              }
            }}
            data-testid="select-county"
          >
            <SelectTrigger>
              <SelectValue placeholder="Add county" />
            </SelectTrigger>
            <SelectContent>
              {availableCounties.map(county => (
                <SelectItem 
                  key={county.code} 
                  value={county.code}
                  disabled={selectedCounties.includes(county.code)}
                >
                  {county.name} County
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Start Year</Label>
          <Select value={startYear} onValueChange={setStartYear} data-testid="select-start-year">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>End Year</Label>
          <Select value={endYear} onValueChange={setEndYear} data-testid="select-end-year">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(year => (
                <SelectItem key={year} value={year} disabled={parseInt(year) < parseInt(startYear)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCounties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCounties.map(county => (
            <Card key={county} className="px-3 py-1 flex items-center gap-2">
              <span className="font-medium">{COUNTY_CODE_TO_NAME[county] || county}</span>
              <button
                onClick={() => setSelectedCounties(selectedCounties.filter(c => c !== county))}
                className="text-muted-foreground hover:text-foreground"
                data-testid={`button-remove-county-${county}`}
              >
                ×
              </button>
            </Card>
          ))}
        </div>
      )}

      {yearQueries.isLoading && (
        <Skeleton className="h-96 w-full" />
      )}

      {yearQueries.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load trend data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {trends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trends.map((trend: any) => (
            <Card key={trend.county} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{trend.countyName} County</h4>
                {trend.direction === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
                {trend.direction === 'down' && <TrendingDown className="h-5 w-5 text-red-600" />}
                {trend.direction === 'stable' && <Minus className="h-5 w-5 text-gray-600" />}
              </div>
              <p className="text-sm text-muted-foreground">
                {trend.firstYear} to {trend.lastYear}
              </p>
              <p className={`text-2xl font-bold mt-2 ${
                trend.change > 0 ? 'text-green-600' : trend.change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ${trend.firstSales.toLocaleString()} → ${trend.lastSales.toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <div>
          <h4 className="font-semibold mb-4">Total Sales by County Over Time</h4>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
              <Legend />
              {selectedCounties.map((county, index) => {
                const countyName = COUNTY_CODE_TO_NAME[county] || county;
                const colors = ["#9333ea", "#dc2626", "#f59e0b", "#3b82f6", "#10b981"];
                return (
                  <Area
                    key={county}
                    type="monotone"
                    dataKey={`${countyName}_total`}
                    fill={colors[index % colors.length]}
                    stroke={colors[index % colors.length]}
                    name={`${countyName} County`}
                    fillOpacity={0.3}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedCounties.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select counties above to view consumption trends and hot spots over time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
