import { useState } from "react";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SearchBar } from "@/components/SearchBar";
import { SalesChart } from "@/components/SalesChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";

type Category = "liquor" | "wine" | "beer";

//todo: remove mock functionality
const mockEstablishments = [
  {
    id: "1",
    name: "The Rustic Tavern",
    address: "123 Main Street",
    city: "Austin",
    county: "Travis",
    lat: 30.2672,
    lng: -97.7431,
    totalSales: 125000,
    liquorSales: 65000,
    wineSales: 35000,
    beerSales: 25000,
  },
  {
    id: "2",
    name: "Downtown Wine Bar",
    address: "456 Congress Ave",
    city: "Austin",
    county: "Travis",
    lat: 30.2699,
    lng: -97.7441,
    totalSales: 98000,
    liquorSales: 28000,
    wineSales: 52000,
    beerSales: 18000,
  },
  {
    id: "3",
    name: "Texas Brew House",
    address: "789 6th Street",
    city: "Austin",
    county: "Travis",
    lat: 30.2669,
    lng: -97.7428,
    totalSales: 145000,
    liquorSales: 45000,
    wineSales: 35000,
    beerSales: 65000,
  },
  {
    id: "4",
    name: "Houston Wine Cellar",
    address: "321 Montrose Blvd",
    city: "Houston",
    county: "Harris",
    lat: 29.7604,
    lng: -95.3698,
    totalSales: 182000,
    liquorSales: 52000,
    wineSales: 95000,
    beerSales: 35000,
  },
  {
    id: "5",
    name: "Dallas Sports Bar",
    address: "555 Commerce St",
    city: "Dallas",
    county: "Dallas",
    lat: 32.7767,
    lng: -96.7970,
    totalSales: 215000,
    liquorSales: 85000,
    wineSales: 48000,
    beerSales: 82000,
  },
  {
    id: "6",
    name: "San Antonio Cantina",
    address: "888 River Walk",
    city: "San Antonio",
    county: "Bexar",
    lat: 29.4241,
    lng: -98.4936,
    totalSales: 156000,
    liquorSales: 72000,
    wineSales: 42000,
    beerSales: 42000,
  },
];

const chartData = [
  { name: "Austin", liquor: 138000, wine: 122000, beer: 108000 },
  { name: "Houston", liquor: 52000, wine: 95000, beer: 35000 },
  { name: "Dallas", liquor: 85000, wine: 48000, beer: 82000 },
  { name: "San Antonio", liquor: 72000, wine: 42000, beer: 42000 },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(["liquor", "wine", "beer"]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);

  const handleCategoryToggle = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const filteredEstablishments = mockEstablishments.filter((est) => {
    const matchesSearch =
      est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.county.toLowerCase().includes(searchQuery.toLowerCase());

    const hasSelectedCategory =
      selectedCategories.length === 0 ||
      (selectedCategories.includes("liquor") && est.liquorSales > 0) ||
      (selectedCategories.includes("wine") && est.wineSales > 0) ||
      (selectedCategories.includes("beer") && est.beerSales > 0);

    return matchesSearch && hasSelectedCategory;
  });

  const mapMarkers: MapMarker[] = filteredEstablishments.map((est) => {
    const primaryCategory = 
      est.liquorSales >= est.wineSales && est.liquorSales >= est.beerSales
        ? "liquor"
        : est.wineSales >= est.beerSales
        ? "wine"
        : "beer";

    return {
      id: est.id,
      lat: est.lat,
      lng: est.lng,
      name: est.name,
      category: primaryCategory,
      sales: est.totalSales,
    };
  });

  const totalSales = filteredEstablishments.reduce((sum, est) => sum + est.totalSales, 0);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 border-r bg-card flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Texas Alcohol Sales</h1>
            </div>
            <ThemeToggle />
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <CategoryFilter selectedCategories={selectedCategories} onToggle={handleCategoryToggle} />
        </div>

        <div className="p-4 border-b">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales (Filtered)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono font-bold" data-testid="text-total-filtered-sales">
                ${totalSales.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredEstablishments.length} establishments
              </p>
            </CardContent>
          </Card>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredEstablishments.map((est) => (
              <div
                key={est.id}
                onClick={() => setSelectedEstablishment(est.id)}
                className={selectedEstablishment === est.id ? "ring-2 ring-primary rounded-lg" : ""}
              >
                <EstablishmentCard
                  name={est.name}
                  address={est.address}
                  city={est.city}
                  county={est.county}
                  totalSales={est.totalSales}
                  liquorSales={est.liquorSales}
                  wineSales={est.wineSales}
                  beerSales={est.beerSales}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Map Section */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <SalesChart data={chartData} />
        </div>
        <div className="flex-1 relative">
          <InteractiveMap
            markers={mapMarkers}
            onMarkerClick={(marker) => {
              setSelectedEstablishment(marker.id);
              console.log("Selected establishment:", marker);
            }}
          />
          <div className="absolute bottom-4 left-4 bg-card border rounded-lg p-3 shadow-lg">
            <div className="text-xs font-medium mb-2">Category Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#a855f7]" />
                <span>Liquor (Primary)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#e11d48]" />
                <span>Wine (Primary)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span>Beer (Primary)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
