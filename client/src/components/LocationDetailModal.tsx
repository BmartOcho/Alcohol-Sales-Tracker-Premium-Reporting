import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { LocationSummary, MonthlySalesRecord } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface LocationDetailModalProps {
  location: LocationSummary | null;
  open: boolean;
  onClose: () => void;
}

function formatMonthYear(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

export function LocationDetailModal({ location, open, onClose }: LocationDetailModalProps) {
  if (!location) return null;

  const chartData = location.monthlyRecords
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
          <div className="text-sm text-muted-foreground space-y-1 mt-2">
            <p>{location.locationAddress}</p>
            <p>{location.locationCity}, TX {location.locationZip}</p>
            <p className="text-xs">Permit: {location.permitNumber}</p>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono" data-testid="text-location-total-sales">
                {formatCurrency(location.totalSales)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Months Recorded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{location.monthlyRecords.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Latest Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{formatMonthYear(location.latestMonth)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-3">Sales Trend (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={200}>
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

        <div className="flex-1 min-h-0">
          <h3 className="text-sm font-semibold mb-3">Monthly Sales History</h3>
          <ScrollArea className="h-[200px] border rounded-lg">
            <div className="p-4 space-y-3">
              {location.monthlyRecords.map((record: MonthlySalesRecord, index: number) => (
                <Card key={`${record.permitNumber}-${record.obligationEndDate}`} className="hover-elevate" data-testid={`card-monthly-record-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{formatMonthYear(record.obligationEndDate)}</CardTitle>
                      <Badge variant="outline" className="font-mono">
                        {formatCurrency(record.totalReceipts)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Liquor</p>
                        <p className="font-semibold text-[#a855f7]">{formatCurrency(record.liquorReceipts)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Wine</p>
                        <p className="font-semibold text-[#e11d48]">{formatCurrency(record.wineReceipts)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Beer</p>
                        <p className="font-semibold text-[#f59e0b]">{formatCurrency(record.beerReceipts)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
