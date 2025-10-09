import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, X, AlertCircle } from "lucide-react";
import type { LocationSummary } from "@shared/schema";

const COLORS = ["#9333ea", "#dc2626", "#f59e0b", "#3b82f6", "#10b981", "#ec4899"];

export function PermitComparison() {
  const [permitNumbers, setPermitNumbers] = useState<string[]>([]);
  const [newPermit, setNewPermit] = useState("");

  const permitQueries = useQueries({
    queries: permitNumbers.map(permit => ({
      queryKey: ["/api/locations", permit],
      enabled: !!permit,
    })),
  });

  const handleAddPermit = () => {
    const trimmed = newPermit.trim();
    if (trimmed && !permitNumbers.includes(trimmed) && permitNumbers.length < 6) {
      setPermitNumbers([...permitNumbers, trimmed]);
      setNewPermit("");
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

  // Get all unique dates from all permits
  const allDates = new Set<string>();
  validData.forEach(item => {
    item.data?.monthlyRecords?.forEach(record => {
      const date = new Date(record.obligationEndDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      allDates.add(date);
    });
  });

  // Create chart data with all dates and permits
  const chartData = Array.from(allDates).sort().map(date => {
    const dataPoint: any = { date };
    validData.forEach((item, index) => {
      const record = item.data?.monthlyRecords?.find(r => 
        new Date(r.obligationEndDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === date
      );
      dataPoint[item.permit] = record?.totalReceipts || 0;
    });
    return dataPoint;
  });

  const isLoading = permitQueries.some(q => q.isLoading);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="new-permit">Add Permit to Compare (max 6)</Label>
          <Input
            id="new-permit"
            placeholder="Enter permit number"
            value={newPermit}
            onChange={(e) => setNewPermit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPermit()}
            disabled={permitNumbers.length >= 6}
            data-testid="input-add-permit"
          />
        </div>
        <Button 
          onClick={handleAddPermit} 
          disabled={!newPermit.trim() || permitNumbers.length >= 6}
          data-testid="button-add-permit"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {permitNumbers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {permitNumbers.map((permit, index) => (
            <Badge key={permit} variant="secondary" className="pl-3 pr-1 py-1">
              <span style={{ color: COLORS[index % COLORS.length] }} className="font-medium mr-2">
                {permit}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0.5"
                onClick={() => handleRemovePermit(permit)}
                data-testid={`button-remove-permit-${index}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {isLoading && (
        <Skeleton className="h-96 w-full" />
      )}

      {permitQueries.some(q => q.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some permits could not be loaded. Please check the permit numbers and try again.
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
              <h4 className="font-semibold mb-4">Sales Comparison Over Time</h4>
              <ResponsiveContainer width="100%" height={400}>
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
            Add permit numbers above to compare their sales performance over time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
