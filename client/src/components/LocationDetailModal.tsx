import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationSummary, MonthlySalesRecord } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface LocationDetailModalProps {
  location: LocationSummary | null;
  open: boolean;
  onClose: () => void;
  selectedYear?: string;
}

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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

export function LocationDetailModal({ location, open, onClose, selectedYear }: LocationDetailModalProps) {
  const [, navigate] = useLocation();

  if (!location) return null;

  const getRecordYear = (dateStr: string): string => {
    if (dateStr.includes('-') || dateStr.includes('T')) {
      return new Date(dateStr).getFullYear().toString();
    } else {
      return dateStr.substring(0, 4);
    }
  };

  const yearFilteredRecords = selectedYear 
    ? location.monthlyRecords.filter(record => {
        const recordYear = getRecordYear(record.obligationEndDate);
        return recordYear === selectedYear;
      })
    : location.monthlyRecords;

  const monthMap = new Map<string, MonthlySalesRecord>();

  for (const record of yearFilteredRecords) {
    const monthKey = formatMonthYear(record.obligationEndDate);

    if (monthMap.has(monthKey)) {
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

  const yearTotalSales = filteredRecords.reduce((sum, r) => sum + r.totalReceipts, 0);

  const chartData = filteredRecords.slice(0, 12).map(record => ({
    month: formatMonthYear(record.obligationEndDate),
    liquor: record.liquorReceipts,
    wine: record.wineReceipts,
    beer: record.beerReceipts,
  })).reverse();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="modal-location-detail">
        <DialogHeader>
          <DialogTitle className="text-2xl">{location.locationName}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-1">
            <p>{location.locationAddress}</p>
            <p>{location.locationCity}, TX {location.locationZip}</p>
            <p className="text-xs">Permit: {location.permitNumber}</p>

            {/* Added dashboard button */}
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => navigate(`/establishment/${location.permitNumber}`)}
              >
                View Full Dashboard
              </Button>
            </div>

          </DialogDescription>
        </DialogHeader>
