import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchAllTexasAlcoholData } from "./services/texasDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/locations", async (req, res) => {
    try {
      let locations = storage.getCachedLocations();
      
      if (!locations) {
        console.log("Cache miss - fetching fresh data from Texas API...");
        const maxRecords = parseInt(req.query.maxRecords as string) || 50000;
        locations = await fetchAllTexasAlcoholData(maxRecords);
        storage.setCachedLocations(locations);
      } else {
        console.log(`Cache hit - returning ${locations.length} locations from cache`);
      }

      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ 
        error: "Failed to fetch location data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/locations/refresh", async (req, res) => {
    try {
      console.log("Manual refresh requested...");
      const maxRecords = parseInt(req.query.maxRecords as string) || 50000;
      const locations = await fetchAllTexasAlcoholData(maxRecords);
      storage.setCachedLocations(locations);
      res.json({ success: true, count: locations.length });
    } catch (error) {
      console.error("Error refreshing locations:", error);
      res.status(500).json({ 
        error: "Failed to refresh location data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/locations/:permitNumber", async (req, res) => {
    try {
      const locations = storage.getCachedLocations();
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
