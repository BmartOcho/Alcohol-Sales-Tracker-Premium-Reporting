import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Search, Download, AlertCircle } from "lucide-react";
import type { LocationSummary } from "@shared/schema";

export function PermitReport() {
  const [permitNumber, setPermitNumber] = useState("");
  const [searchedPermit, setSearchedPermit] = useState("");

  const { data: permitData, isLoading, error } = useQuery<LocationSummary>({
    queryKey: ["/api/locations", searchedPermit],
    enabled: !!searchedPermit,
  });

  const handleSearch = () => {
    setSearchedPermit(permitNumber.trim());
  };

  // Prepare chart data from monthly records
  const chartData = permitData?.monthlyRecords?.map(record => ({
    date: new Date(record.obligationEndDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    liquor: record.liquorReceipts,
    wine: record.wineReceipts,
    beer: record.beerReceipts,
    total: record.totalReceipts,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="permit-number">Permit Number</Label>
          <Input
            id="permit-number"
            placeholder="Enter permit number (e.g., MB105473178)"
            value={permitNumber}
            onChange={(e) => setPermitNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            data-testid="input-permit-number"
          />
        </div>
        <Button onClick={handleSearch} disabled={!permitNumber.trim()} data-testid="button-search-permit">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load permit data. Please check the permit number and try again.
          </AlertDescription>
        </Alert>
      )}

      {permitData && (
        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-lg mb-4" data-testid="text-location-name">{permitData.locationName}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{permitData.locationAddress}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{permitData.locationCity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">County</p>
                <p className="font-medium">{permitData.locationCounty}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Permit Number</p>
                <p className="font-medium">{permitData.permitNumber}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold" data-testid="text-total-sales">${permitData.totalSales.toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Liquor Sales</p>
              <p className="text-2xl font-bold text-purple-600">${permitData.liquorSales.toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Wine Sales</p>
              <p className="text-2xl font-bold text-red-600">${permitData.wineSales.toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Beer Sales</p>
              <p className="text-2xl font-bold text-amber-600">${permitData.beerSales.toLocaleString()}</p>
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

      {searchedPermit && !isLoading && !permitData && !error && (
        <Alert data-testid="alert-no-results">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No data found for permit number "{searchedPermit}". Please try another permit number.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
