import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { AlertCircle, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LocationSummary } from "@shared/schema";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useDebounce } from "@/hooks/useDebounce";

const COLORS = {
  liquor: "#3b82f6", // blue
  wine: "#dc2626", // red
  beer: "#f59e0b", // amber
};

export function PermitReport() {
  const [locationName, setLocationName] = useState("");
  const [selectedPermit, setSelectedPermit] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  // Debounce search query (300ms delay)
  const debouncedLocationName = useDebounce(locationName, 300);

  // Search for locations by name (uses debounced value)
  const { data: searchResults, isLoading: isSearching } = useQuery<{ locations: LocationSummary[]; total: number }>({
    queryKey: [`/api/locations/search/by-name?name=${debouncedLocationName.trim()}`],
    enabled: debouncedLocationName.trim().length > 0,
  });

  // Get details for selected location
  const { data: locationData, isLoading: isLoadingDetails, error } = useQuery<LocationSummary>({
    queryKey: ["/api/locations", selectedPermit],
    enabled: !!selectedPermit,
  });

  const handleSelectLocation = (permitNumber: string) => {
    setSelectedPermit(permitNumber);
    setSelectedYear("all"); // Reset year filter when selecting new location
  };

  // Helper to extract year from both ISO and YYYYMMDD formats
  const getRecordYear = (dateStr: string): string => {
    if (dateStr.includes('-') || dateStr.includes('T')) {
      return new Date(dateStr).getFullYear().toString();
    } else {
      return dateStr.substring(0, 4);
    }
  };

  // Filter records by selected year
  const getFilteredRecords = () => {
    if (!locationData?.monthlyRecords) return [];
    if (selectedYear === "all") return locationData.monthlyRecords;
    
    return locationData.monthlyRecords.filter(record => {
      const recordYear = getRecordYear(record.obligationEndDate);
      return recordYear === selectedYear;
    });
  };

  const filteredRecords = getFilteredRecords();

  // Calculate available years from data
  const availableYears = locationData?.monthlyRecords 
    ? Array.from(new Set(locationData.monthlyRecords.map(r => getRecordYear(r.obligationEndDate)))).sort().reverse()
    : [];

  // Calculate totals based on filtered records (must be before calculatePeriodMetrics)
  const calculateTotals = () => {
    if (!filteredRecords.length) return { total: 0, liquor: 0, wine: 0, beer: 0 };
    
    return filteredRecords.reduce((acc, record) => ({
      total: acc.total + record.totalReceipts,
      liquor: acc.liquor + record.liquorReceipts,
      wine: acc.wine + record.wineReceipts,
      beer: acc.beer + record.beerReceipts,
    }), { total: 0, liquor: 0, wine: 0, beer: 0 });
  };

  const totals = calculateTotals();

  // Calculate time period metrics
  const calculatePeriodMetrics = () => {
    if (!locationData?.monthlyRecords || locationData.monthlyRecords.length === 0) return null;

    const records = selectedYear === "all" ? locationData.monthlyRecords : filteredRecords;
    if (records.length === 0) return null;
    
    // Find the latest record date from filtered data
    const latestFilteredRecord = records[0]; // Records are sorted by date desc
    const latestRecordDate = new Date(latestFilteredRecord.obligationEndDate);
    const now = new Date();
    
    // Check if location is inactive (latest record > 6 months old)
    const monthsSinceLastRecord = (now.getTime() - latestRecordDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const isInactive = monthsSinceLastRecord > 6;
    
    // Always use latest record date as reference (data is only available up to previous month)
    const referenceDate = latestRecordDate;

    // Helper to get sales for date range
    const getSalesForPeriod = (monthsAgo: number) => {
      const startDate = new Date(referenceDate);
      startDate.setMonth(startDate.getMonth() - monthsAgo);
      
      const periodRecords = records.filter(r => {
        const recordDate = new Date(r.obligationEndDate);
        return recordDate >= startDate && recordDate <= referenceDate;
      });

      const total = periodRecords.reduce((sum, r) => sum + r.totalReceipts, 0);
      const liquor = periodRecords.reduce((sum, r) => sum + r.liquorReceipts, 0);
      const wine = periodRecords.reduce((sum, r) => sum + r.wineReceipts, 0);
      const beer = periodRecords.reduce((sum, r) => sum + r.beerReceipts, 0);

      return { total, liquor, wine, beer };
    };

    // Calculate metrics for different periods
    // For latest month, get only the single most recent month (not a trailing window)
    const latestMonthRecords = records.filter(r => {
      const recordDate = new Date(r.obligationEndDate);
      return recordDate.getMonth() === referenceDate.getMonth() && 
             recordDate.getFullYear() === referenceDate.getFullYear();
    });
    const recentMonth = {
      total: latestMonthRecords.reduce((sum, r) => sum + r.totalReceipts, 0),
      liquor: latestMonthRecords.reduce((sum, r) => sum + r.liquorReceipts, 0),
      wine: latestMonthRecords.reduce((sum, r) => sum + r.wineReceipts, 0),
      beer: latestMonthRecords.reduce((sum, r) => sum + r.beerReceipts, 0),
    };
    
    // Get previous month for comparison
    const prevMonthDate = new Date(referenceDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const previousMonthRecords = records.filter(r => {
      const recordDate = new Date(r.obligationEndDate);
      return recordDate.getMonth() === prevMonthDate.getMonth() && 
             recordDate.getFullYear() === prevMonthDate.getFullYear();
    });
    const previousMonth = previousMonthRecords.reduce((sum, r) => sum + r.totalReceipts, 0);
    const recentMonthChange = previousMonth > 0 ? ((recentMonth.total - previousMonth) / previousMonth) * 100 : 0;

    const pastQuarter = getSalesForPeriod(3);
    const previousQuarter = getSalesForPeriod(6).total - pastQuarter.total;
    const quarterChange = previousQuarter > 0 ? ((pastQuarter.total - previousQuarter) / previousQuarter) * 100 : 0;

    const past6Months = getSalesForPeriod(6);
    const previous6Months = getSalesForPeriod(12).total - past6Months.total;
    const sixMonthsChange = previous6Months > 0 ? ((past6Months.total - previous6Months) / previous6Months) * 100 : 0;

    const pastYear = getSalesForPeriod(12);
    const previousYear = getSalesForPeriod(24).total - pastYear.total;
    const yearChange = previousYear > 0 ? ((pastYear.total - previousYear) / previousYear) * 100 : 0;

    const past2Years = getSalesForPeriod(24);

    return {
      recentMonth: { value: recentMonth.total, change: recentMonthChange },
      pastQuarter: { value: pastQuarter.total, change: quarterChange },
      past6Months: { value: past6Months.total, change: sixMonthsChange },
      pastYear: { value: pastYear.total, change: yearChange },
      past2Years: { value: past2Years.total },
      breakdown: {
        liquor: totals.liquor,
        wine: totals.wine,
        beer: totals.beer,
      },
      isInactive,
      latestRecordDate: latestRecordDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  };

  const metrics = calculatePeriodMetrics();

  // Prepare revenue mix data based on filtered data
  const revenueData = locationData ? [
    { name: "Liquor", value: totals.liquor, color: COLORS.liquor },
    { name: "Wine", value: totals.wine, color: COLORS.wine },
    { name: "Beer", value: totals.beer, color: COLORS.beer },
  ].filter(item => item.value > 0) : [];

  // Get the largest revenue source
  const largestRevenue = revenueData.reduce((max, item) => 
    item.value > max.value ? item : max, revenueData[0] || { name: "", value: 0 }
  );

  const largestPercentage = totals.total 
    ? ((largestRevenue.value / totals.total) * 100).toFixed(1)
    : "0";

  // Download PDF
  const downloadPDF = async () => {
    if (!reportRef.current || !locationData) return;

    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`${locationData.locationName.replace(/[^a-z0-9]/gi, '_')}_report.pdf`);
  };

  const showSearchResults = searchResults && searchResults.locations.length > 0 && !selectedPermit;
  const showNoResults = locationName.trim() && !isSearching && searchResults?.locations.length === 0;

  // Calculate permit age
  const getPermitAge = () => {
    if (!locationData?.monthlyRecords || locationData.monthlyRecords.length === 0) return "N/A";
    
    const oldestRecord = locationData.monthlyRecords[locationData.monthlyRecords.length - 1];
    const oldestDate = new Date(oldestRecord.obligationEndDate);
    const now = new Date();
    
    const years = now.getFullYear() - oldestDate.getFullYear();
    const months = now.getMonth() - oldestDate.getMonth();
    const totalMonths = years * 12 + months;
    
    const displayYears = Math.floor(totalMonths / 12);
    const displayMonths = totalMonths % 12;
    
    if (displayYears > 0 && displayMonths > 0) {
      return `${displayYears} years, ${displayMonths} months`;
    } else if (displayYears > 0) {
      return `${displayYears} year${displayYears > 1 ? 's' : ''}`;
    } else {
      return `${displayMonths} month${displayMonths > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="location-name">Search Location</Label>
          <Input
            id="location-name"
            placeholder="Enter location name"
            value={locationName}
            onChange={(e) => {
              setLocationName(e.target.value);
              setSelectedPermit("");
            }}
            data-testid="input-location-name"
          />
        </div>

        {locationData && availableYears.length > 0 && (
          <div className="w-48">
            <Label htmlFor="year-filter">Filter by Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year-filter" data-testid="select-year-filter">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {locationData && (
          <Button 
            onClick={downloadPDF} 
            variant="default" 
            className="gap-2"
            data-testid="button-download-pdf"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      {isSearching && <Skeleton className="h-20 w-full" />}

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
            No locations found matching "{locationName.trim()}". Please try a different search term.
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

      {locationData && metrics && (
        <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-lg">
          {/* Inactive Warning */}
          {metrics.isInactive && (
            <Alert data-testid="alert-inactive-location">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This location has been inactive since <strong>{metrics.latestRecordDate}</strong>. 
                Time periods shown below are calculated from the last reporting date, not current date.
              </AlertDescription>
            </Alert>
          )}

          {/* Header Metrics */}
          <div className="grid grid-cols-5 gap-4">
            <MetricCard
              label={metrics.isInactive ? "Final Month" : "Latest Month"}
              value={metrics.recentMonth.value}
              change={metrics.recentMonth.change}
              sublabel={metrics.latestRecordDate}
              data-testid="metric-recent-month"
            />
            <MetricCard
              label="Past Quarter"
              value={metrics.pastQuarter.value}
              change={metrics.pastQuarter.change}
              sublabel={metrics.isInactive ? "Before Closing" : "Last 3 Months"}
              data-testid="metric-past-quarter"
            />
            <MetricCard
              label="Past 6 Months"
              value={metrics.past6Months.value}
              change={metrics.past6Months.change}
              sublabel={metrics.isInactive ? "Before Closing" : "Last 6 Months"}
              data-testid="metric-past-6-months"
            />
            <MetricCard
              label="Past Year"
              value={metrics.pastYear.value}
              change={metrics.pastYear.change}
              sublabel={metrics.isInactive ? "Before Closing" : "Last 12 Months"}
              data-testid="metric-past-year"
            />
            <MetricCard
              label="Past 2 Years"
              value={metrics.past2Years.value}
              sublabel={metrics.isInactive ? "Before Closing" : "Last 24 Months"}
              data-testid="metric-past-2-years"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Location Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Location</h3>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationData.locationAddress + ', ' + locationData.locationCity + ', TX')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Google Map
                  </a>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <p className="font-medium">{locationData.locationName}</p>
                  <p className="text-muted-foreground">{locationData.locationAddress}</p>
                  <p className="text-muted-foreground">{locationData.locationCity}, TX {locationData.locationZip}</p>
                </div>

                {/* Embedded Map - Fallback to static map */}
                <div className="w-full h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center" data-testid="container-map">
                  <div className="text-center p-4">
                    <p className="text-sm font-medium mb-2">
                      {locationData.locationAddress}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {locationData.locationCity}, TX {locationData.locationZip}
                    </p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationData.locationAddress + ', ' + locationData.locationCity + ', TX ' + locationData.locationZip)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {locationData.locationAddress}, {locationData.locationCity}, TX {locationData.locationZip}
                </p>
              </CardContent>
            </Card>

            {/* Taxpayer & Permit Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Taxpayer & Permit Info</h3>
                
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-sm text-muted-foreground mb-1">Taxpayer Info</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Taxpayer Name</p>
                        <p className="text-sm font-medium">{locationData.monthlyRecords?.[0]?.taxpayerName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Location Number</p>
                        <p className="text-sm font-medium">#{locationData.permitNumber.slice(-4)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Permit Info</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Permit Number</span>
                        <span className="text-sm font-medium">{locationData.permitNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Time Since Issue</span>
                        <span className="text-sm font-medium">{getPermitAge()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Sales Trend - Professional Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">
                Monthly Sales Trend {selectedYear !== "all" && `(${selectedYear})`}
              </h3>
              
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={filteredRecords.slice().reverse().map(record => ({
                    month: new Date(record.obligationEndDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    Liquor: record.liquorReceipts,
                    Wine: record.wineReceipts,
                    Beer: record.beerReceipts,
                    Total: record.totalReceipts
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="rect"
                  />
                  <Bar dataKey="Liquor" fill={COLORS.liquor} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Wine" fill={COLORS.wine} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Beer" fill={COLORS.beer} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">${totals.liquor.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Liquor Sales</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">${totals.wine.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Wine Sales</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">${totals.beer.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Beer Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Mix */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Revenue Mix</h3>
              
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={revenueData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {revenueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold mb-2" data-testid="text-total-revenue">
                    ${totals.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {largestPercentage}% from {largestRevenue.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: number;
  change?: number;
  sublabel: string;
  "data-testid"?: string;
}

function MetricCard({ label, value, change, sublabel, ...props }: MetricCardProps) {
  const hasChange = change !== undefined;
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card {...props}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {hasChange && (
            <div className={`flex items-center gap-1 text-xs ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold mb-1">${value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}
