import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { importIncrementalData } from "./scripts/importData";
import cron from "node-cron";
import analyticsRouter from "./routes/analytics";

app.use("/api/analytics", analyticsRouter);


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set CSP headers to allow Stripe Elements and Leaflet (required for payment forms and maps)
// Always use permissive CSP to ensure Stripe and testing work correctly
app.use((req, res, next) => {
  // Permissive CSP to avoid blocking Stripe/Leaflet in development and testing
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Schedule hourly data refresh for real-time accuracy
function scheduleDataRefresh() {
  const performRefresh = async () => {
    try {
      const startTime = new Date().toISOString();
      log(`[${startTime}] Starting automatic data refresh...`);
      const result = await importIncrementalData();
      const endTime = new Date().toISOString();
      log(`[${endTime}] Refresh complete: ${result.message}, imported ${result.imported || 0} records, latest date: ${result.latestDate || 'unknown'}`);
    } catch (error: any) {
      const errorTime = new Date().toISOString();
      log(`[${errorTime}] Refresh failed: ${error.message}`);
    }
  };
  
  // Run every hour for real-time data accuracy
  // Cron format: minute hour day month dayOfWeek
  // timezone: 'America/Chicago' handles both CST and CDT
  cron.schedule('0 * * * *', performRefresh, {
    timezone: 'America/Chicago'
  });
  
  log("Data refresh scheduler initialized - will check for new data every hour");
}

(async () => {
  // Run data refresh on startup to catch any missed updates
  try {
    log("Running startup data refresh...");
    const result = await importIncrementalData();
    log(`Startup refresh complete: ${result.message}, imported ${result.imported || 0} records, latest date: ${result.latestDate || 'unknown'}`);
  } catch (error: any) {
    log(`Startup refresh failed (non-fatal): ${error.message}`);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Schedule daily data refresh at 3 AM CST (9 AM UTC)
    scheduleDataRefresh();
  });
})();
