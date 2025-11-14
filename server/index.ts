// server/route.ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { importIncrementalData } from "./scripts/importData";
import cron from "node-cron";
import analyticsRouter from "./routes/analytics";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Permissive CSP (needed for Stripe Elements and Leaflet)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  next();
});

// Mount analytics routes BEFORE logging middleware
app.use("/api/analytics", analyticsRouter);

// Logging middleware
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

// Schedule hourly data refresh
function scheduleDataRefresh() {
  const performRefresh = async () => {
    try {
      const startTime = new Date().toISOString();
      log(`[${startTime}] Starting automatic data refresh...`);
      const result = await importIncrementalData();
      const endTime = new Date().toISOString();
      log(
        `[${endTime}] Refresh complete: ${result.message}, imported ${result.imported || 0} records, latest date: ${
          result.latestDate || "unknown"
        }`
      );
    } catch (error: any) {
      const errorTime = new Date().toISOString();
      log(`[${errorTime}] Refresh failed: ${error.message}`);
    }
  };

  // run hourly
  cron.schedule("0 * * * *", performRefresh, {
    timezone: "America/Chicago",
  });

  log("Data refresh scheduler initialized - will check for new data every hour");
}

(async () => {
  // Run initial data refresh
  try {
    log("Running startup data refresh...");
    const result = await importIncrementalData();
    log(
      `Startup refresh complete: ${result.message}, imported ${result.imported || 0} records, latest date: ${
        result.latestDate || "unknown"
      }`
    );
  } catch (error: any) {
    log(`Startup refresh failed (non-fatal): ${error.message}`);
  }

  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Vite in development, static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve API + client on allowed port
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      scheduleDataRefresh();
    }
  );
})();
