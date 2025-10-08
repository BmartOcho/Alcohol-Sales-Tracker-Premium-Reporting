import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import type { CountySales } from "@shared/schema";

type CountyLocationsDialogProps = {
  county: CountySales | null;
  open: boolean;
  onClose: () => void;
};

export function CountyLocationsDialog({ county, open, onClose }: CountyLocationsDialogProps) {
  if (!county) return null;

  // Sort locations by total sales (highest to lowest)
  const sortedLocations = [...county.locations].sort(
    (a, b) => b.totalSales - a.totalSales
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" data-testid="dialog-county-locations">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {county.countyName} County - Top Locations by Sales
          </DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Total Sales: <span className="font-mono font-bold">${county.totalSales.toLocaleString()}</span></p>
            <p className="text-xs">
              Liquor: ${county.liquorSales.toLocaleString()} | 
              Wine: ${county.wineSales.toLocaleString()} | 
              Beer: ${county.beerSales.toLocaleString()}
            </p>
            <p>{county.locationCount} total locations</p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 py-4">
            {sortedLocations.map((location, index) => (
              <Card 
                key={location.permitNumber} 
                className="p-4 hover-elevate active-elevate-2 transition-all"
                data-testid={`card-location-${location.permitNumber}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                      <h3 className="font-semibold text-lg truncate" data-testid={`text-location-name-${location.permitNumber}`}>
                        {location.locationName}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {location.locationAddress}, {location.locationCity}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold text-xl" data-testid={`text-location-sales-${location.permitNumber}`}>
                      ${location.totalSales.toLocaleString()}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>${location.liquorSales.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>${location.wineSales.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>${location.beerSales.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
