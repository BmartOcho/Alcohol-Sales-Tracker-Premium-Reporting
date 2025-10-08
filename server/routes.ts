import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchAllTexasAlcoholData } from "./services/texasDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/locations", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Create cache key based on date range
      const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'default';
      let locations = storage.getCachedLocations(cacheKey);
      
      if (!locations) {
        console.log(`Cache miss for ${cacheKey} - fetching fresh data from Texas API...`);
        // Fetch ALL records for the date range (no maxRecords limit when dates provided)
        locations = await fetchAllTexasAlcoholData(Infinity, startDate, endDate);
        storage.setCachedLocations(locations, cacheKey);
      } else {
        console.log(`Cache hit for ${cacheKey} - returning ${locations.length} locations from cache`);
      }

      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations - Full error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("Error stack:", errorStack);
      
      res.status(500).json({ 
        error: "Failed to fetch location data",
        message: `${errorMessage}. This may indicate network restrictions preventing access to data.texas.gov from published apps. Try running in development mode.`
      });
    }
  });

  app.get("/api/locations/refresh", async (req, res) => {
    try {
      console.log("Manual refresh requested...");
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'default';
      
      // Fetch ALL records for the date range
      const locations = await fetchAllTexasAlcoholData(Infinity, startDate, endDate);
      storage.setCachedLocations(locations, cacheKey);
      res.json({ success: true, count: locations.length });
    } catch (error) {
      console.error("Error refreshing locations:", error);
      res.status(500).json({ 
        error: "Failed to refresh location data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/counties", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'default';
      
      let locations = storage.getCachedLocations(cacheKey);
      
      if (!locations) {
        console.log(`Cache miss for ${cacheKey} - fetching fresh data from Texas API...`);
        locations = await fetchAllTexasAlcoholData(Infinity, startDate, endDate);
        storage.setCachedLocations(locations, cacheKey);
      }

      // Aggregate by county
      const countyMap = new Map<string, any>();
      
      locations.forEach(location => {
        const county = location.locationCounty;
        if (!countyMap.has(county)) {
          countyMap.set(county, {
            countyName: county,
            totalSales: 0,
            liquorSales: 0,
            wineSales: 0,
            beerSales: 0,
            locationCount: 0,
            locations: [],
          });
        }
        
        const countyData = countyMap.get(county);
        countyData.totalSales += location.totalSales;
        countyData.liquorSales += location.liquorSales;
        countyData.wineSales += location.wineSales;
        countyData.beerSales += location.beerSales;
        countyData.locationCount += 1;
        countyData.locations.push(location);
      });

      const counties = Array.from(countyMap.values());
      res.json(counties);
    } catch (error) {
      console.error("Error fetching county data:", error);
      res.status(500).json({ 
        error: "Failed to fetch county data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/locations/:permitNumber", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const cacheKey = startDate && endDate ? `${startDate}_${endDate}` : 'default';
      
      const locations = storage.getCachedLocations(cacheKey);
      if (!locations) {
        return res.status(503).json({ error: "Data not loaded yet" });
      }

      const location = locations.find(l => l.permitNumber === req.params.permitNumber);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }

      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ 
        error: "Failed to fetch location",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
