import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationSummary, MonthlySalesRecord } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface LocationDetailModalProps {
  location: LocationSummary | null;
  open: boolean;
  onClose: () => void;
  selectedYear?: string;
}

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return "Unknown";
  
  // Handle both YYYYMMDD and ISO datetime formats
  let year: string;
  let month: string;
  
  if (dateStr.includes('-') || dateStr.includes('T')) {
    // ISO format: "2019-07-31T00:00:00.000" or "2019-07-31"
    const date = new Date(dateStr);
    year = date.getFullYear().toString();
    month = (date.getMonth() + 1).toString().padStart(2, '0');
  } else {
    // YYYYMMDD format: "20190731"
    year = dateStr.substring(0, 4);
    month = dateStr.substring(4, 6);
  }
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(month) - 1;
  
  if (monthIndex < 0 || monthIndex > 11) return "Unknown";
  
  return `${monthNames[monthIndex]} ${year}`;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

export function LocationDetailModal({ location, open, onClose, selectedYear }: LocationDetailModalProps) {
  if (!location) return null;

  // Helper to extract year from both ISO and YYYYMMDD formats
  const getRecordYear = (dateStr: string): string => {
    if (dateStr.includes('-') || dateStr.includes('T')) {
      // ISO format
      return new Date(dateStr).getFullYear().toString();
    } else {
      // YYYYMMDD format
      return dateStr.substring(0, 4);
    }
  };

  // Filter monthly records by selected year if provided
  const yearFilteredRecords = selectedYear 
    ? location.monthlyRecords.filter(record => {
        const recordYear = getRecordYear(record.obligationEndDate);
        return recordYear === selectedYear;
      })
    : location.monthlyRecords;

  // Deduplicate by month-year and sum sales for duplicate months
  const monthMap = new Map<string, MonthlySalesRecord>();
  
  for (const record of yearFilteredRecords) {
    const monthKey = formatMonthYear(record.obligationEndDate);
    
    if (monthMap.has(monthKey)) {
      // Sum sales for duplicate months
      const existing = monthMap.get(monthKey)!;
      monthMap.set(monthKey, {
        ...existing,
        liquorReceipts: existing.liquorReceipts + record.liquorReceipts,
        wineReceipts: existing.wineReceipts + record.wineReceipts,
        beerReceipts: existing.beerReceipts + record.beerReceipts,
        totalReceipts: existing.totalReceipts + record.totalReceipts,
      });
    } else {
      monthMap.set(monthKey, { ...record });
    }
  }
  
  const filteredRecords = Array.from(monthMap.values()).sort((a, b) => 
    b.obligationEndDate.localeCompare(a.obligationEndDate)
  );

  // Calculate totals for the filtered year
  const yearTotalSales = filteredRecords.reduce((sum, r) => sum + r.totalReceipts, 0);

  const chartData = filteredRecords
    .slice(0, 12)
    .map(record => ({
      month: formatMonthYear(record.obligationEndDate),
      liquor: record.liquorReceipts,
      wine: record.wineReceipts,
      beer: record.beerReceipts,
    }))
    .reverse();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="modal-location-detail">
        <DialogHeader>
          <DialogTitle className="text-2xl">{location.locationName}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-1">
            <p>{location.locationAddress}</p>
            <p>{location.locationCity}, TX {location.locationZip}</p>
            <p className="text-xs">Permit: {location.permitNumber}</p>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {selectedYear ? `Total Sales (${selectedYear})` : "Total Sales (All Time)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono" data-testid="text-location-total-sales">
                {formatCurrency(selectedYear ? yearTotalSales : location.totalSales)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Months Recorded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredRecords.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Latest Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatMonthYear(filteredRecords[0]?.obligationEndDate || location.latestMonth)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="pb-4">
          <h3 className="text-sm font-semibold mb-3">Sales Trend (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="liquor" fill="#a855f7" name="Liquor" />
              <Bar dataKey="wine" fill="#e11d48" name="Wine" />
              <Bar dataKey="beer" fill="#f59e0b" name="Beer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
