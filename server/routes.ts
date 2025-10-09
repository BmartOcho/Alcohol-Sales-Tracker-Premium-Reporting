import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth (from blueprint:javascript_log_in_with_replit)
  await setupAuth(app);

  // Auth route - get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/locations", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1000;
      
      console.log(`Fetching locations from database - Date range: ${startDate || 'all'} to ${endDate || 'all'}`);
      
      // Query database directly (much faster than API)
      const locations = await storage.getLocations(startDate, endDate);
      
      console.log(`Found ${locations.length} locations in database`);

      // Paginate the results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLocations = locations.slice(startIndex, endIndex);

      console.log(`Returning page ${page} (${paginatedLocations.length} locations, ${startIndex}-${endIndex} of ${locations.length})`);

      res.json({
        locations: paginatedLocations,
        pagination: {
          page,
          limit,
          total: locations.length,
          totalPages: Math.ceil(locations.length / limit),
          hasMore: endIndex < locations.length
        }
      });
    } catch (error) {
      console.error("Error fetching locations from database:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      res.status(500).json({ 
        error: "Failed to fetch location data",
        message: `${errorMessage}. Make sure the database has been populated with data.`
      });
    }
  });

  app.post("/api/locations/refresh", async (req, res) => {
    try {
      console.log("Manual cache refresh requested...");
      
      // Clear the in-memory cache to force fresh database queries
      storage.clearCache();
      
      res.json({ 
        success: true, 
        message: "Cache cleared successfully. Next request will fetch fresh data from database." 
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ 
        error: "Failed to clear cache",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/counties", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Query database for all locations (uses cache)
      const locations = await storage.getLocations(startDate, endDate);

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

  app.get("/api/locations/search/by-name", async (req, res) => {
    try {
      const locationName = req.query.name as string;
      
      if (!locationName) {
        return res.status(400).json({ error: "Location name is required" });
      }
      
      // Search for locations by name (returns up to 20 matches)
      const locations = await storage.getLocationsByName(locationName);
      
      res.json({ locations, total: locations.length });
    } catch (error) {
      console.error("Error searching locations by name:", error);
      res.status(500).json({ 
        error: "Failed to search locations",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/locations/:permitNumber", async (req, res) => {
    try {
      const permitNumber = req.params.permitNumber;
      
      // Use dedicated method to query single permit (efficient, no OOM risk)
      const location = await storage.getLocationByPermit(permitNumber);
      
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
