import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Database, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DataRefreshDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataRefreshDialog({ open, onOpenChange }: DataRefreshDialogProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{
    success?: boolean;
    message?: string;
    imported?: number;
    latestDate?: string;
    previousLatestDate?: string;
    error?: string;
  } | null>(null);
  const [latestDataDate, setLatestDataDate] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchLatestDataDate();
    }
  }, [open]);

  const fetchLatestDataDate = async () => {
    try {
      const response = await fetch('/api/admin/data-status');
      if (response.ok) {
        const data = await response.json();
        setLatestDataDate(data.latestDate);
      }
    } catch (error) {
      console.error('Failed to fetch latest data date:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshStatus(null);

    try {
      const response = await apiRequest('POST', '/api/admin/refresh-data');
      const result = await response.json();

      setRefreshStatus({
        success: true,
        message: result.message,
        imported: result.imported,
        latestDate: result.latestDate,
        previousLatestDate: result.previousLatestDate,
      });

      setLatestDataDate(result.latestDate);
    } catch (error: any) {
      setRefreshStatus({
        success: false,
        error: error.message || 'Failed to refresh data',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Refresh
          </DialogTitle>
          <DialogDescription>
            Check for and import the latest alcohol sales data from the Texas Open Data Portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Current Data Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestDataDate ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Latest data in database:</p>
                  <p className="text-lg font-mono font-semibold" data-testid="text-latest-data-date">
                    {latestDataDate}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Refresh Status */}
          {refreshStatus && (
            <Alert variant={refreshStatus.success ? "default" : "destructive"}>
              {refreshStatus.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {refreshStatus.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">{refreshStatus.message}</p>
                    {refreshStatus.imported !== undefined && refreshStatus.imported > 0 && (
                      <p className="text-sm">
                        Imported {refreshStatus.imported.toLocaleString()} new records
                      </p>
                    )}
                    {refreshStatus.imported === 0 && (
                      <p className="text-sm">Your database is already up to date!</p>
                    )}
                  </div>
                ) : (
                  <p>{refreshStatus.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1"
              data-testid="button-refresh-data"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking for updates...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Data
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRefreshing}
              data-testid="button-close-dialog"
            >
              Close
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Checks Texas Open Data Portal for new records</li>
                <li>Only imports data newer than {latestDataDate || 'your latest date'}</li>
                <li>Usually takes 30-60 seconds</li>
                <li>Automatically clears cache after import</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
