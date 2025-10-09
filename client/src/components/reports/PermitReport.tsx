import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Search, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LocationSummary } from "@shared/schema";

export function PermitReport() {
  const [locationName, setLocationName] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const [selectedPermit, setSelectedPermit] = useState<string>("");

  // Search for locations by name
  const { data: searchResults, isLoading: isSearching } = useQuery<{ locations: LocationSummary[]; total: number }>({
    queryKey: [`/api/locations/search/by-name?name=${searchedName}`],
    enabled: !!searchedName,
  });

  // Get details for selected location
  const { data: locationData, isLoading: isLoadingDetails, error } = useQuery<LocationSummary>({
    queryKey: ["/api/locations", selectedPermit],
    enabled: !!selectedPermit,
  });

  const handleSearch = () => {
    setSearchedName(locationName.trim());
    setSelectedPermit(""); // Reset selection when new search
  };

  const handleSelectLocation = (permitNumber: string) => {
    setSelectedPermit(permitNumber);
  };

  // Prepare chart data from monthly records
  const chartData = locationData?.monthlyRecords?.map(record => ({
    date: new Date(record.obligationEndDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    liquor: record.liquorReceipts,
    wine: record.wineReceipts,
    beer: record.beerReceipts,
    total: record.totalReceipts,
  })) || [];

  const showSearchResults = searchResults && searchResults.locations.length > 0 && !selectedPermit;
  const showNoResults = searchedName && !isSearching && searchResults?.locations.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="location-name">Location Name</Label>
          <Input
            id="location-name"
            placeholder="Enter location name (e.g., Specs, HEB, Walmart)"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            data-testid="input-location-name"
          />
        </div>
        <Button onClick={handleSearch} disabled={!locationName.trim()} data-testid="button-search-location">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {isSearching && (
        <Skeleton className="h-20 w-full" />
      )}

      {showSearchResults && (
        <div className="border rounded-lg p-4 bg-muted/20">
          <Label htmlFor="location-select">Select a Location ({searchResults.total} found)</Label>
          <Select onValueChange={handleSelectLocation} value={selectedPermit}>
            <SelectTrigger id="location-select" className="w-full mt-2" data-testid="select-location">
              <SelectValue placeholder="Choose a location from search results" />
            </SelectTrigger>
            <SelectContent>
              {searchResults.locations.map((location) => (
                <SelectItem key={location.permitNumber} value={location.permitNumber}>
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
            No locations found matching "{searchedName}". Please try a different search term.
          </AlertDescription>
        </Alert>
      )}

      {isLoadingDetails && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load location data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {locationData && (
        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-lg mb-4" data-testid="text-location-name">{locationData.locationName}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{locationData.locationAddress}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{locationData.locationCity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">County</p>
                <p className="font-medium">{locationData.locationCounty}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Permit Number</p>
                <p className="font-medium">{locationData.permitNumber}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold" data-testid="text-total-sales">${locationData.totalSales.toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Liquor Sales</p>
              <p className="text-2xl font-bold text-purple-600">${locationData.liquorSales.toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Wine Sales</p>
              <p className="text-2xl font-bold text-red-600">${locationData.wineSales.toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Beer Sales</p>
              <p className="text-2xl font-bold text-amber-600">${locationData.beerSales.toLocaleString()}</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <>
              <div>
                <h4 className="font-semibold mb-4">Sales Over Time</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="liquor" stroke="#9333ea" name="Liquor" />
                    <Line type="monotone" dataKey="wine" stroke="#dc2626" name="Wine" />
                    <Line type="monotone" dataKey="beer" stroke="#f59e0b" name="Beer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Sales by Category</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="liquor" fill="#9333ea" name="Liquor" />
                    <Bar dataKey="wine" fill="#dc2626" name="Wine" />
                    <Bar dataKey="beer" fill="#f59e0b" name="Beer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
