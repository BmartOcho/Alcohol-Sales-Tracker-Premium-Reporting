import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchTexasAlcoholData } from "./services/texasDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/establishments", async (req, res) => {
    try {
      let establishments = storage.getCachedEstablishments();
      
      if (!establishments) {
        const limit = parseInt(req.query.limit as string) || 500;
        establishments = await fetchTexasAlcoholData(limit);
        storage.setCachedEstablishments(establishments);
      }

      res.json(establishments);
    } catch (error) {
      console.error("Error fetching establishments:", error);
      res.status(500).json({ 
        error: "Failed to fetch establishment data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/establishments/refresh", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 500;
      const establishments = await fetchTexasAlcoholData(limit);
      storage.setCachedEstablishments(establishments);
      res.json({ success: true, count: establishments.length });
    } catch (error) {
      console.error("Error refreshing establishments:", error);
      res.status(500).json({ 
        error: "Failed to refresh establishment data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
