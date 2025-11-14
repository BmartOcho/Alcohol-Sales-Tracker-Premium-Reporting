import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { useLocation } from "wouter";

type EstablishmentCardProps = {
  permit: string;          // 👈 new
  name: string;
  address: string;
  city: string;
  county: string;
  totalSales: number;
  liquorSales: number;
  wineSales: number;
  beerSales: number;
};

export function EstablishmentCard({
  permit,
  name,
  address,
  city,
  county,
  totalSales,
  liquorSales,
  wineSales,
  beerSales,
}: EstablishmentCardProps) {
  const [, navigate] = useLocation();

  return (
    <Card
      className="hover-elevate cursor-pointer"
      data-testid={`card-establishment-${name}`}
      onClick={() => navigate(`/establishment/${permit}`)}   // 👈 navigate to dashboard
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight">{name}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {county}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {address}, {city}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total Sales</span>
          <span
            className="font-mono font-semibold text-lg"
            data-testid="text-total-sales"
          >
            ${totalSales.toLocaleString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a855f7]" />
              <span className="text-muted-foreground">Liquor</span>
            </div>
            <span className="font-mono font-semibold">
              ${liquorSales.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#e11d48]" />
              <span className="text-muted-foreground">Wine</span>
            </div>
            <span className="font-mono font-semibold">
              ${wineSales.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <span className="text-muted-foreground">Beer</span>
            </div>
            <span className="font-mono font-semibold">
              ${beerSales.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
