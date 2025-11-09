import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LocationSummary } from "@shared/schema";
import { useDebounce } from "@/hooks/useDebounce";

const COLORS = ["#9333ea", "#dc2626", "#f59e0b", "#3b82f6", "#10b981", "#ec4899"];

export function PermitComparison() {
  const [permitNumbers, setPermitNumbers] = useState<string[]>([]);
  const [locationName, setLocationName] = useState("");

  // Debounce search query (300ms delay)
  const debouncedLocationName = useDebounce(locationName, 300);

  // Search for locations by name (uses debounced value)
  const { data: searchResults, isLoading: isSearching } = useQuery<{ locations: LocationSummary[]; total: number }>({
    queryKey: [`/api/locations/search/by-name?name=${debouncedLocationName.trim()}`],
    enabled: debouncedLocationName.trim().length > 0,
  });

  const permitQueries = useQueries({
    queries: permitNumbers.map(permit => ({
      queryKey: ["/api/locations", permit],
      enabled: !!permit,
    })),
  });

  const handleAddLocation = (permitNumber: string) => {
    if (permitNumber && !permitNumbers.includes(permitNumber) && permitNumbers.length < 6) {
      setPermitNumbers([...permitNumbers, permitNumber]);
      setLocationName("");
    }
  };

  const handleRemovePermit = (permit: string) => {
    setPermitNumbers(permitNumbers.filter(p => p !== permit));
  };

  // Prepare comparison data
  const validData = permitQueries
    .map((query, index) => ({
      permit: permitNumbers[index],
      data: query.data as LocationSummary | undefined,
      isLoading: query.isLoading,
      error: query.error,
    }))
    .filter(item => item.data);

  // Get all unique dates from all permits with actual Date objects for proper sorting
  const allDatesMap = new Map<string, Date>();
  validData.forEach(item => {
    item.data?.monthlyRecords?.forEach(record => {
      const dateObj = new Date(record.obligationEndDate);
      const dateKey = dateObj.toISOString();
      if (!allDatesMap.has(dateKey)) {
        allDatesMap.set(dateKey, dateObj);
      }
    });
  });

  // Sort dates chronologically (oldest to newest)
  const sortedDates = Array.from(allDatesMap.entries())
    .sort(([, a], [, b]) => a.getTime() - b.getTime())
    .map(([key, dateObj]) => ({
      key,
      dateObj,
      display: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }));

  // Create chart data with chronologically sorted dates
  const chartData = sortedDates.map(({ key, display }) => {
    const dataPoint: any = { date: display };
    validData.forEach((item) => {
      const record = item.data?.monthlyRecords?.find(r => 
        new Date(r.obligationEndDate).toISOString() === key
      );
      dataPoint[item.permit] = record?.totalReceipts || 0;
    });
    return dataPoint;
  });

  const isLoading = permitQueries.some(q => q.isLoading);
  const showSearchResults = searchResults && searchResults.locations.length > 0;
  const showNoResults = locationName.trim() && !isSearching && searchResults?.locations.length === 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="location-name">Search Location to Add (max 6)</Label>
          <div className="relative">
            <Input
              id="location-name"
              placeholder="Enter location name"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              disabled={permitNumbers.length >= 6}
              data-testid="input-location-name"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {isSearching && (
          <Skeleton className="h-20 w-full" />
        )}

        {showSearchResults && (
          <div className="border rounded-lg p-4 bg-muted/20">
            <Label htmlFor="location-select">Select a Location to Add ({searchResults.total} found)</Label>
            <Select onValueChange={handleAddLocation}>
              <SelectTrigger id="location-select" className="w-full mt-2" data-testid="select-location">
                <SelectValue placeholder="Choose a location to add" />
              </SelectTrigger>
              <SelectContent>
                {searchResults.locations.map((location) => (
                  <SelectItem 
                    key={location.permitNumber} 
                    value={location.permitNumber}
                    disabled={permitNumbers.includes(location.permitNumber)}
                  >
                    {location.locationName} - {location.locationCity} (${location.totalSales.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showNoResults && (
          <Alert data-testid="alert-no-results">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No locations found matching "{locationName.trim()}". Please try a different search term.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {permitNumbers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {permitNumbers.map((permit, index) => {
            const locationData = permitQueries[index]?.data as LocationSummary | undefined;
            return (
              <Badge key={permit} variant="secondary" className="pl-3 pr-1 py-1" data-testid={`badge-location-${index}`}>
                <span style={{ color: COLORS[index % COLORS.length] }} className="font-medium mr-2">
                  {locationData?.locationName || permit}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0.5"
                  onClick={() => handleRemovePermit(permit)}
                  data-testid={`button-remove-location-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {isLoading && (
        <Skeleton className="h-96 w-full" />
      )}

      {permitQueries.some(q => q.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some locations could not be loaded. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {validData.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validData.map((item, index) => (
              <div key={item.permit} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2" style={{ color: COLORS[index % COLORS.length] }}>
                  {item.data?.locationName}
                </h4>
                <p className="text-sm text-muted-foreground mb-1">{item.permit}</p>
                <p className="text-sm text-muted-foreground mb-2">{item.data?.locationCity}</p>
                <p className="text-xl font-bold" data-testid={`text-total-sales-${index}`}>
                  ${item.data?.totalSales.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4 text-base lg:text-lg">Sales Comparison Over Time</h4>
              <ResponsiveContainer width="100%" height={300} className="sm:hidden">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {validData.map((item, index) => (
                    <Line
                      key={item.permit}
                      type="monotone"
                      dataKey={item.permit}
                      stroke={COLORS[index % COLORS.length]}
                      name={`${item.data?.locationName.substring(0, 15)}...`}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={400} className="hidden sm:block">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  {validData.map((item, index) => (
                    <Line
                      key={item.permit}
                      type="monotone"
                      dataKey={item.permit}
                      stroke={COLORS[index % COLORS.length]}
                      name={`${item.data?.locationName.substring(0, 20)}...`}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {permitNumbers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Search for locations above to compare their sales performance over time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
