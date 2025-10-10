import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import type { LocationSummary } from "@shared/schema";

const COUNTY_CODE_TO_NAME: Record<string, string> = {
  "001": "Anderson", "002": "Andrews", "003": "Angelina", "004": "Aransas", "005": "Archer",
  "006": "Armstrong", "007": "Atascosa", "008": "Austin", "009": "Bailey", "010": "Bandera",
  "011": "Bastrop", "012": "Baylor", "013": "Bee", "014": "Bell", "015": "Bexar",
  "016": "Blanco", "017": "Borden", "018": "Bosque", "019": "Bowie", "020": "Brazoria",
  "021": "Brazos", "022": "Brewster", "023": "Briscoe", "024": "Brooks", "025": "Brown",
  "026": "Burleson", "027": "Burnet", "028": "Caldwell", "029": "Calhoun", "030": "Callahan",
  "031": "Cameron", "032": "Camp", "033": "Carson", "034": "Cass", "035": "Castro",
  "036": "Chambers", "037": "Cherokee", "038": "Childress", "039": "Clay", "040": "Cochran",
  "041": "Coke", "042": "Coleman", "043": "Collin", "044": "Collingsworth", "045": "Colorado",
  "046": "Comal", "047": "Comanche", "048": "Concho", "049": "Cooke", "050": "Coryell",
  "051": "Cottle", "052": "Crane", "053": "Crockett", "054": "Crosby", "055": "Culberson",
  "056": "Dallam", "057": "Dallas", "058": "Dawson", "059": "Deaf Smith", "060": "Delta",
  "061": "Denton", "062": "DeWitt", "063": "Dickens", "064": "Dimmit", "065": "Donley",
  "066": "Duval", "067": "Eastland", "068": "Ector", "069": "Edwards", "070": "Ellis",
  "071": "El Paso", "072": "Erath", "073": "Falls", "074": "Fannin", "075": "Fayette",
  "076": "Fisher", "077": "Floyd", "078": "Foard", "079": "Fort Bend", "080": "Franklin",
  "081": "Freestone", "082": "Frio", "083": "Gaines", "084": "Galveston", "085": "Garza",
  "086": "Gillespie", "087": "Glasscock", "088": "Goliad", "089": "Gonzales", "090": "Gray",
  "091": "Grayson", "092": "Gregg", "093": "Grimes", "094": "Guadalupe", "095": "Hale",
  "096": "Hall", "097": "Hamilton", "098": "Hansford", "099": "Hardeman", "100": "Hardin",
  "101": "Harris", "102": "Harrison", "103": "Hartley", "104": "Haskell", "105": "Hays",
  "106": "Hemphill", "107": "Henderson", "108": "Hidalgo", "109": "Hill", "110": "Hockley",
  "111": "Hood", "112": "Hopkins", "113": "Houston", "114": "Howard", "115": "Hudspeth",
  "116": "Hunt", "117": "Hutchinson", "118": "Irion", "119": "Jack", "120": "Jackson",
  "121": "Jasper", "122": "Jeff Davis", "123": "Jefferson", "124": "Jim Hogg", "125": "Jim Wells",
  "126": "Johnson", "127": "Jones", "128": "Karnes", "129": "Kaufman", "130": "Kendall",
  "131": "Kenedy", "132": "Kent", "133": "Kerr", "134": "Kimble", "135": "King",
  "136": "Kinney", "137": "Kleberg", "138": "Knox", "139": "Lamar", "140": "Lamb",
  "141": "Lampasas", "142": "La Salle", "143": "Lavaca", "144": "Lee", "145": "Leon",
  "146": "Liberty", "147": "Limestone", "148": "Lipscomb", "149": "Live Oak", "150": "Llano",
  "151": "Loving", "152": "Lubbock", "153": "Lynn", "154": "Madison", "155": "Marion",
  "156": "Martin", "157": "Mason", "158": "Matagorda", "159": "Maverick", "160": "McCulloch",
  "161": "McLennan", "162": "McMullen", "163": "Medina", "164": "Menard", "165": "Midland",
  "166": "Milam", "167": "Mills", "168": "Mitchell", "169": "Montague", "170": "Montgomery",
  "171": "Moore", "172": "Morris", "173": "Motley", "174": "Nacogdoches", "175": "Navarro",
  "176": "Newton", "177": "Nolan", "178": "Nueces", "179": "Ochiltree", "180": "Oldham",
  "181": "Orange", "182": "Palo Pinto", "183": "Panola", "184": "Parker", "185": "Parmer",
  "186": "Pecos", "187": "Polk", "188": "Potter", "189": "Presidio", "190": "Rains",
  "191": "Randall", "192": "Reagan", "193": "Real", "194": "Red River", "195": "Reeves",
  "196": "Refugio", "197": "Roberts", "198": "Robertson", "199": "Rockwall", "200": "Runnels",
  "201": "Rusk", "202": "Sabine", "203": "San Augustine", "204": "San Jacinto", "205": "San Patricio",
  "206": "San Saba", "207": "Schleicher", "208": "Scurry", "209": "Shackelford", "210": "Shelby",
  "211": "Sherman", "212": "Smith", "213": "Somervell", "214": "Starr", "215": "Stephens",
  "216": "Sterling", "217": "Stonewall", "218": "Sutton", "219": "Swisher", "220": "Tarrant",
  "221": "Taylor", "222": "Terrell", "223": "Terry", "224": "Throckmorton", "225": "Titus",
  "226": "Tom Green", "227": "Travis", "228": "Trinity", "229": "Tyler", "230": "Upshur",
  "231": "Upton", "232": "Uvalde", "233": "Val Verde", "234": "Van Zandt", "235": "Victoria",
  "236": "Walker", "237": "Waller", "238": "Ward", "239": "Washington", "240": "Webb",
  "241": "Wharton", "242": "Wheeler", "243": "Wichita", "244": "Wilbarger", "245": "Willacy",
  "246": "Williamson", "247": "Wilson", "248": "Winkler", "249": "Wise", "250": "Wood",
  "251": "Yoakum", "252": "Young", "253": "Zapata", "254": "Zavala"
};

const COLORS = {
  beer: "#f59e0b",
  wine: "#dc2626", 
  liquor: "#3b82f6"
};

type AreaType = "county" | "city" | "zip";

interface OutlierLocation {
  permitNumber: string;
  locationName: string;
  address: string;
  city: string;
  totalSales: number;
  beerPercent: number;
  winePercent: number;
  liquorPercent: number;
  beerZScore: number;
  wineZScore: number;
  liquorZScore: number;
  maxAbsZScore: number;
  outlierType: "beer" | "wine" | "liquor";
}

interface AreaStats {
  avgBeerPercent: number;
  avgWinePercent: number;
  avgLiquorPercent: number;
  stdBeerPercent: number;
  stdWinePercent: number;
  stdLiquorPercent: number;
}

// Calculate standard deviation
function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

interface OutliersProps {
  onNavigateToReport?: (permitNumber: string, startDate: string, endDate: string) => void;
}

export function Outliers({ onNavigateToReport }: OutliersProps = {}) {
  const [areaType, setAreaType] = useState<AreaType>("county");
  const [areaValue, setAreaValue] = useState("101"); // Harris County default
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [minRevenue, setMinRevenue] = useState("10000");

  // Fetch unique cities and zips for dropdowns from dedicated endpoint
  const areasParams = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return params.toString();
  }, [startDate, endDate]);

  const { data: areasData } = useQuery<{ cities: string[]; zips: string[] }>({
    queryKey: [`/api/areas?${areasParams}`],
    enabled: !!startDate && !!endDate,
  });

  // Build query parameters based on area type for filtered results
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    params.append('limit', '10000'); // Increased limit for better area coverage
    
    if (areaType === 'county') {
      // Send county code directly (database stores codes, not names)
      params.append('county', areaValue);
    } else if (areaType === 'city') {
      params.append('city', areaValue);
    } else if (areaType === 'zip') {
      params.append('zip', areaValue);
    }
    
    if (minRevenue) {
      params.append('minRevenue', minRevenue);
    }
    
    return params.toString();
  }, [startDate, endDate, areaType, areaValue, minRevenue]);

  // Fetch locations for selected area and date range
  const { data: locationsData, isLoading, error } = useQuery<{ locations: LocationSummary[]; total: number }>({
    queryKey: [`/api/locations?${queryParams}`],
    enabled: !!startDate && !!endDate && !!areaValue,
  });

  // Calculate outliers using Z-scores
  const { outliers, areaStats, areaName } = useMemo(() => {
    if (!locationsData?.locations || locationsData.locations.length === 0) {
      return { outliers: [], areaStats: null, areaName: "" };
    }

    // API already filters by area and min revenue, so we can use all locations directly
    const filteredLocations = locationsData.locations;

    if (filteredLocations.length < 3) {
      return { outliers: [], areaStats: null, areaName: "" };
    }

    // Calculate percentages for each location
    const locationsWithPercents = filteredLocations.map(loc => ({
      ...loc,
      beerPercent: loc.totalSales > 0 ? (loc.beerSales / loc.totalSales) * 100 : 0,
      winePercent: loc.totalSales > 0 ? (loc.wineSales / loc.totalSales) * 100 : 0,
      liquorPercent: loc.totalSales > 0 ? (loc.liquorSales / loc.totalSales) * 100 : 0,
    }));

    // Calculate area averages
    const avgBeerPercent = locationsWithPercents.reduce((sum, loc) => sum + loc.beerPercent, 0) / locationsWithPercents.length;
    const avgWinePercent = locationsWithPercents.reduce((sum, loc) => sum + loc.winePercent, 0) / locationsWithPercents.length;
    const avgLiquorPercent = locationsWithPercents.reduce((sum, loc) => sum + loc.liquorPercent, 0) / locationsWithPercents.length;

    // Calculate standard deviations
    const stdBeerPercent = calculateStdDev(locationsWithPercents.map(l => l.beerPercent), avgBeerPercent);
    const stdWinePercent = calculateStdDev(locationsWithPercents.map(l => l.winePercent), avgWinePercent);
    const stdLiquorPercent = calculateStdDev(locationsWithPercents.map(l => l.liquorPercent), avgLiquorPercent);

    const stats: AreaStats = {
      avgBeerPercent,
      avgWinePercent,
      avgLiquorPercent,
      stdBeerPercent,
      stdWinePercent,
      stdLiquorPercent
    };

    // Calculate Z-scores for each location
    const locationsWithZScores = locationsWithPercents.map(loc => {
      const beerZScore = stdBeerPercent > 0 ? (loc.beerPercent - avgBeerPercent) / stdBeerPercent : 0;
      const wineZScore = stdWinePercent > 0 ? (loc.winePercent - avgWinePercent) / stdWinePercent : 0;
      const liquorZScore = stdLiquorPercent > 0 ? (loc.liquorPercent - avgLiquorPercent) / stdLiquorPercent : 0;

      // Find which category has the most extreme Z-score
      const absZScores = [
        { type: "beer" as const, z: Math.abs(beerZScore) },
        { type: "wine" as const, z: Math.abs(wineZScore) },
        { type: "liquor" as const, z: Math.abs(liquorZScore) }
      ];
      const maxAbs = absZScores.reduce((max, curr) => curr.z > max.z ? curr : max);

      return {
        permitNumber: loc.permitNumber,
        locationName: loc.locationName,
        address: `${loc.locationAddress}, ${loc.locationCity}, TX ${loc.locationZip}`,
        city: loc.locationCity,
        totalSales: loc.totalSales,
        beerPercent: loc.beerPercent,
        winePercent: loc.winePercent,
        liquorPercent: loc.liquorPercent,
        beerZScore,
        wineZScore,
        liquorZScore,
        maxAbsZScore: maxAbs.z,
        outlierType: maxAbs.type
      };
    });

    // Filter outliers (|Z-score| > 2)
    const results = locationsWithZScores
      .filter(loc => loc.maxAbsZScore > 2)
      .sort((a, b) => b.maxAbsZScore - a.maxAbsZScore);

    // Determine area name
    let name = areaValue;
    if (areaType === "county") {
      name = COUNTY_CODE_TO_NAME[areaValue] || areaValue;
    }

    return { outliers: results, areaStats: stats, areaName: name };
  }, [locationsData, areaType, areaValue]);

  // Get unique cities and zips from the areas endpoint
  const uniqueCities = areasData?.cities || [];
  const uniqueZips = areasData?.zips || [];

  const availableCounties = Object.entries(COUNTY_CODE_TO_NAME)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Area Type</Label>
            <Select value={areaType} onValueChange={(value) => {
              const newType = value as AreaType;
              setAreaType(newType);
              if (newType === "county") {
                setAreaValue("101"); // Harris County
              } else if (newType === "city") {
                setAreaValue(uniqueCities.length > 0 ? uniqueCities[0] : "");
              } else if (newType === "zip") {
                setAreaValue(uniqueZips.length > 0 ? uniqueZips[0] : "");
              }
            }} data-testid="select-area-type">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="county">County</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="zip">Zip Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{areaType === "county" ? "County" : areaType === "city" ? "City" : "Zip Code"}</Label>
            {areaType === "county" ? (
              <Select value={areaValue} onValueChange={setAreaValue} data-testid="select-area-value">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCounties.map(county => (
                    <SelectItem key={county.code} value={county.code}>
                      {county.name} County
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : areaType === "city" ? (
              <Select value={areaValue} onValueChange={setAreaValue} data-testid="select-area-value" disabled={uniqueCities.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={uniqueCities.length === 0 ? "Loading cities..." : "Select a city"} />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCities.length > 0 ? (
                    uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No cities available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Select value={areaValue} onValueChange={setAreaValue} data-testid="select-area-value" disabled={uniqueZips.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={uniqueZips.length === 0 ? "Loading zip codes..." : "Select a zip code"} />
                </SelectTrigger>
                <SelectContent>
                  {uniqueZips.length > 0 ? (
                    uniqueZips.map(zip => (
                      <SelectItem key={zip} value={zip}>
                        {zip}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No zip codes available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="input-start-date"
            />
          </div>

          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              data-testid="input-end-date"
            />
          </div>
        </div>

        <div className="w-64">
          <Label className="flex items-center gap-2">
            Minimum Revenue ($)
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </Label>
          <Input
            type="number"
            value={minRevenue}
            onChange={(e) => setMinRevenue(e.target.value)}
            placeholder="10000"
            data-testid="input-min-revenue"
          />
        </div>
      </div>

      {isLoading && <Skeleton className="h-96 w-full" data-testid="skeleton-loading" />}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load outlier data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && areaStats && outliers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No outliers found in {areaName} {areaType === "county" ? "County" : ""} for the selected date range. 
            Outliers are locations with Z-score &gt; 2 or &lt; -2 for any alcohol category.
          </AlertDescription>
        </Alert>
      )}

      {areaStats && outliers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Statistical Outliers in {areaName} {areaType === "county" ? "County" : ""}
            </h3>
            <div className="flex gap-2">
              <Badge variant="outline" style={{ borderColor: COLORS.beer }}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS.beer }} />
                Beer Avg: {areaStats.avgBeerPercent.toFixed(1)}%
              </Badge>
              <Badge variant="outline" style={{ borderColor: COLORS.wine }}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS.wine }} />
                Wine Avg: {areaStats.avgWinePercent.toFixed(1)}%
              </Badge>
              <Badge variant="outline" style={{ borderColor: COLORS.liquor }}>
                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS.liquor }} />
                Liquor Avg: {areaStats.avgLiquorPercent.toFixed(1)}%
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Locations with unusual sales patterns (|Z-score| &gt; 2) sorted by most extreme deviation
          </p>

          <div className="grid gap-3">
            {outliers.map((outlier, index) => {
              const zScores = [
                { type: "beer", z: outlier.beerZScore, percent: outlier.beerPercent, avg: areaStats.avgBeerPercent },
                { type: "wine", z: outlier.wineZScore, percent: outlier.winePercent, avg: areaStats.avgWinePercent },
                { type: "liquor", z: outlier.liquorZScore, percent: outlier.liquorPercent, avg: areaStats.avgLiquorPercent }
              ];
              
              return (
                <Card 
                  key={outlier.permitNumber} 
                  className="hover-elevate cursor-pointer transition-all" 
                  data-testid={`card-outlier-${outlier.permitNumber}`}
                  onClick={() => onNavigateToReport?.(outlier.permitNumber, startDate, endDate)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-muted-foreground font-normal">#{index + 1}</span>
                          {outlier.locationName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{outlier.address}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {outlier[`${outlier.outlierType}ZScore`] > 0 ? (
                            <TrendingUp className="h-4 w-4" style={{ color: COLORS[outlier.outlierType] }} />
                          ) : (
                            <TrendingDown className="h-4 w-4" style={{ color: COLORS[outlier.outlierType] }} />
                          )}
                          <span className="text-2xl font-bold" style={{ color: COLORS[outlier.outlierType] }}>
                            Z = {outlier[`${outlier.outlierType}ZScore`].toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{outlier.outlierType} outlier</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        {zScores.map(({ type, z, percent, avg }) => (
                          <div key={type} className="text-sm">
                            <p className="text-muted-foreground capitalize">{type}</p>
                            <p className="font-semibold">{percent.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">
                              Avg: {avg.toFixed(1)}% (Z={z.toFixed(2)})
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t text-sm">
                        <span className="text-muted-foreground">Total Sales:</span>
                        <span className="font-semibold ml-2">${outlier.totalSales.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
