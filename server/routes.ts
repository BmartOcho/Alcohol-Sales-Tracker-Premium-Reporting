import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Initialize Stripe (from blueprint:javascript_stripe)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

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

  // Stripe subscription route (from blueprint:javascript_stripe)
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If user already has a subscription, check its status
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
          { expand: ['latest_invoice.payment_intent'] }
        );
        
        // Check if already active
        if (subscription.status === 'active') {
          return res.status(400).json({ message: 'Already subscribed' });
        }
        
        // If subscription is incomplete (awaiting payment), return it
        if (subscription.status === 'incomplete') {
          const clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret;
          if (clientSecret) {
            return res.json({
              subscriptionId: subscription.id,
              clientSecret,
            });
          }
        }
        
        // If subscription is canceled, expired, or otherwise unusable, clear it
        // and create a new one (fall through to creation logic)
        await storage.clearStripeSubscription(userId);
        user = await storage.getUser(userId);
      }

      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      // Get or create Stripe customer (reuse existing if available)
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });
        customerId = customer.id;
      }

      // Get or create the product and price (idempotent)
      // Search for existing product by name
      const products = await stripe.products.list({ limit: 100 });
      let product = products.data.find(p => p.name === 'Texas Alcohol Sales Map Pro');
      
      if (!product) {
        product = await stripe.products.create({
          name: 'Texas Alcohol Sales Map Pro',
          description: 'Full access to all features and analytics',
        });
      }

      // Search for existing price for this product
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      let price = prices.data.find(p => p.unit_amount === 2000 && p.currency === 'usd' && p.recurring?.interval === 'month');
      
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 2000, // $20.00 in cents
          currency: 'usd',
          recurring: { interval: 'month' },
        });
      }

      // Create subscription using the price
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with Stripe info (status remains 'free' until payment confirmed)
      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/locations", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const county = req.query.county as string;
      const city = req.query.city as string;
      const zip = req.query.zip as string;
      const minRevenue = req.query.minRevenue ? parseFloat(req.query.minRevenue as string) : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1000;
      
      console.log(`Fetching locations from database - Date range: ${startDate || 'all'} to ${endDate || 'all'}`);
      if (county) console.log(`  Filtering by county: ${county}`);
      if (city) console.log(`  Filtering by city: ${city}`);
      if (zip) console.log(`  Filtering by zip: ${zip}`);
      if (minRevenue) console.log(`  Filtering by min revenue: $${minRevenue}`);
      
      // Query database directly (much faster than API)
      let locations = await storage.getLocations(startDate, endDate);
      
      // Apply area filters
      if (county) {
        locations = locations.filter(loc => loc.locationCounty.toLowerCase() === county.toLowerCase());
      }
      if (city) {
        locations = locations.filter(loc => loc.locationCity.toLowerCase() === city.toLowerCase());
      }
      if (zip) {
        locations = locations.filter(loc => loc.locationZip === zip);
      }
      
      // Filter out ceased operations (locations with zero sales)
      locations = locations.filter(loc => loc.totalSales > 0);
      
      if (minRevenue !== undefined) {
        locations = locations.filter(loc => loc.totalSales >= minRevenue);
      }
      
      console.log(`Found ${locations.length} locations in database after filters`);

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

  // New endpoint for Outliers tab - get unique cities and zips
  app.get("/api/areas", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Query database for all locations (uses cache)
      const locations = await storage.getLocations(startDate, endDate);

      // Extract unique cities and zips
      const cities = new Set<string>();
      const zips = new Set<string>();
      
      locations.forEach(location => {
        if (location.locationCity) cities.add(location.locationCity);
        if (location.locationZip) zips.add(location.locationZip);
      });

      res.json({
        cities: Array.from(cities).sort(),
        zips: Array.from(zips).sort()
      });
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ 
        error: "Failed to fetch areas",
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

  // Sitemap.xml for SEO
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/reports</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/subscribe</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // Robots.txt for SEO
  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const robots = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`;
    
    res.header('Content-Type', 'text/plain');
    res.send(robots);
  });

  const httpServer = createServer(app);
  return httpServer;
}
