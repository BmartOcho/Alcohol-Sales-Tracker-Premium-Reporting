import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp } from "lucide-react";
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

const YEARS = ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];

const ALCOHOL_TYPES = [
  { value: "beer", label: "Beer", color: "#f59e0b" },
  { value: "wine", label: "Wine", color: "#dc2626" },
  { value: "liquor", label: "Liquor", color: "#3b82f6" }
] as const;

type AlcoholType = "beer" | "wine" | "liquor";

interface OutlierLocation {
  permitNumber: string;
  locationName: string;
  address: string;
  city: string;
  totalSales: number;
  selectedTypeSales: number;
  selectedTypePercent: number;
  countyAvgPercent: number;
  differenceFromAvg: number;
}

export function Outliers() {
  const [selectedType, setSelectedType] = useState<AlcoholType>("beer");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedCounty, setSelectedCounty] = useState("101"); // Harris County default

  // Fetch locations for selected county and year
  const { data: locationsData, isLoading, error } = useQuery<{ locations: LocationSummary[]; total: number }>({
    queryKey: [`/api/locations?startDate=${selectedYear}-01-01&endDate=${selectedYear}-12-31&county=${selectedCounty}&limit=5000`],
    enabled: !!selectedCounty && !!selectedYear,
  });

  // Calculate outliers
  const outliers = useMemo((): OutlierLocation[] => {
    if (!locationsData?.locations || locationsData.locations.length === 0) return [];

    const locations = locationsData.locations;
    
    // Calculate county totals and average percentage
    let countyTotalSales = 0;
    let countyTypeSales = 0;

    locations.forEach(loc => {
      countyTotalSales += loc.totalSales;
      if (selectedType === "beer") countyTypeSales += loc.beerSales;
      else if (selectedType === "wine") countyTypeSales += loc.wineSales;
      else if (selectedType === "liquor") countyTypeSales += loc.liquorSales;
    });

    const countyAvgPercent = countyTotalSales > 0 ? (countyTypeSales / countyTotalSales) * 100 : 0;

    // Calculate each location's difference from county average
    const results = locations
      .map(loc => {
        const totalSales = loc.totalSales;
        let selectedTypeSales = 0;
        
        if (selectedType === "beer") selectedTypeSales = loc.beerSales;
        else if (selectedType === "wine") selectedTypeSales = loc.wineSales;
        else if (selectedType === "liquor") selectedTypeSales = loc.liquorSales;

        const selectedTypePercent = totalSales > 0 ? (selectedTypeSales / totalSales) * 100 : 0;
        const differenceFromAvg = selectedTypePercent - countyAvgPercent;

        return {
          permitNumber: loc.permitNumber,
          locationName: loc.locationName,
          address: `${loc.locationAddress}, ${loc.locationCity}, TX ${loc.locationZip}`,
          city: loc.locationCity,
          totalSales,
          selectedTypeSales,
          selectedTypePercent,
          countyAvgPercent,
          differenceFromAvg
        };
      })
      .filter(loc => loc.differenceFromAvg > 0 && loc.totalSales >= 10000) // Only show positive outliers with meaningful sales
      .sort((a, b) => b.differenceFromAvg - a.differenceFromAvg)
      .slice(0, 20); // Top 20 outliers

    return results;
  }, [locationsData, selectedType]);

  const availableCounties = Object.entries(COUNTY_CODE_TO_NAME)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedAlcoholType = ALCOHOL_TYPES.find(t => t.value === selectedType);
  const countyName = COUNTY_CODE_TO_NAME[selectedCounty] || selectedCounty;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Alcohol Type</Label>
          <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AlcoholType)} data-testid="select-alcohol-type">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALCOHOL_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>County</Label>
          <Select value={selectedCounty} onValueChange={setSelectedCounty} data-testid="select-county">
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
        </div>

        <div>
          <Label>Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear} data-testid="select-year">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {!isLoading && !error && outliers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No outliers found for {countyName} County in {selectedYear}. Try a different county or year.
          </AlertDescription>
        </Alert>
      )}

      {outliers.length > 0 && outliers[0] && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              Top {selectedAlcoholType?.label} Outliers in {countyName} County ({selectedYear})
            </h3>
            <Badge variant="secondary" data-testid="badge-county-average">
              County Avg: {outliers[0].countyAvgPercent.toFixed(1)}% {selectedAlcoholType?.label}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Locations selling disproportionately more {selectedAlcoholType?.label.toLowerCase()} compared to the county average
          </p>

          <div className="grid gap-3">
            {outliers.map((outlier, index) => (
              <Card key={outlier.permitNumber} className="hover-elevate" data-testid={`card-outlier-${outlier.permitNumber}`}>
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
                        <TrendingUp className="h-4 w-4" style={{ color: selectedAlcoholType?.color }} />
                        <span className="text-2xl font-bold" style={{ color: selectedAlcoholType?.color }}>
                          +{outlier.differenceFromAvg.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">above county avg</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{selectedAlcoholType?.label} %</p>
                      <p className="font-semibold">{outlier.selectedTypePercent.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{selectedAlcoholType?.label} Sales</p>
                      <p className="font-semibold">${outlier.selectedTypeSales.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Sales</p>
                      <p className="font-semibold">${outlier.totalSales.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
