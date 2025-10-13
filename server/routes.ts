import type { Express } from "express";
import express from "express";
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
console.log('[Stripe] Initialized with production keys');

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe webhook endpoint - must come before JSON parsing middleware
  // This endpoint needs raw body for signature verification
  app.post('/api/stripe-webhook', 
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'];
      
      if (!sig) {
        return res.status(400).send('Missing stripe-signature header');
      }

      let event: Stripe.Event;

      try {
        // Verify webhook signature - STRIPE_WEBHOOK_SECRET is required for security
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error('Missing STRIPE_WEBHOOK_SECRET - webhook verification required');
          return res.status(500).send('Server configuration error: webhook secret not configured');
        }
        
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      try {
        switch (event.type) {
          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const userId = paymentIntent.metadata.userId;
            const tier = paymentIntent.metadata.tier;

            if (userId && tier === 'lifetime') {
              // Update user to lifetime access
              await storage.updateSubscriptionStatus(userId, {
                subscriptionStatus: 'active',
                subscriptionTier: 'lifetime',
                subscriptionEndsAt: null, // Lifetime never ends
              });
              console.log(`User ${userId} upgraded to lifetime access`);
            }
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Find user by Stripe customer ID
            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) {
              const status = subscription.status === 'active' ? 'active' : 
                           subscription.status === 'past_due' ? 'past_due' : 
                           subscription.status === 'canceled' ? 'canceled' : 'free';

              await storage.updateSubscriptionStatus(user.id, {
                subscriptionStatus: status,
                subscriptionTier: status === 'active' ? 'pro' : user.subscriptionTier,
                stripeSubscriptionId: subscription.id as string,
                subscriptionEndsAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
              });
              console.log(`User ${user.id} subscription ${event.type}: ${status}`);
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) {
              await storage.updateSubscriptionStatus(user.id, {
                subscriptionStatus: 'canceled',
                subscriptionTier: 'free',
                stripeSubscriptionId: null,
                subscriptionEndsAt: null,
              });
              console.log(`User ${user.id} subscription canceled`);
            }
            break;
          }

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err: any) {
        console.error('Error handling webhook event:', err);
        res.status(500).send(`Webhook handler error: ${err.message}`);
      }
    }
  );

  // Setup Replit Auth (from blueprint:javascript_log_in_with_replit)
  await setupAuth(app);

  // Debug auth route - check if session exists
  app.get('/api/auth/debug', (req: any, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      hasUser: !!req.user,
      sessionID: req.sessionID,
    });
  });

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
      // Validate user authentication metadata
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: 'Authentication required - missing user ID' });
      }

      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get selected plan from request body (monthly or yearly)
      const { plan } = req.body;
      if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
        return res.status(400).json({ message: 'Invalid plan. Must be "monthly" or "yearly"' });
      }

      // If user already has a subscription, retrieve it and check status
      if (user.stripeSubscriptionId) {
        console.log('[Stripe] User has existing subscription ID:', user.stripeSubscriptionId);
        
        // Check if it's a SetupIntent ID (starts with 'seti_') vs Subscription ID (starts with 'sub_')
        if (user.stripeSubscriptionId.startsWith('seti_')) {
          console.log('[Stripe] Found SetupIntent ID, clearing for new attempt');
          await storage.clearStripeSubscription(userId);
          const refreshedUser = await storage.getUser(userId);
          if (!refreshedUser) {
            return res.status(404).json({ message: 'User not found after clearing' });
          }
          user = refreshedUser;
        } else if (user.stripeSubscriptionId.startsWith('sub_')) {
          // It's a real subscription, check its status
          const subscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId
          );
          
          console.log('[Stripe] Existing subscription status:', subscription.status);
          
          // Check if already active
          if (subscription.status === 'active') {
            return res.status(400).json({ message: 'Already subscribed' });
          }
          
          // If subscription is incomplete, get the invoice and payment intent
          if (subscription.status === 'incomplete' && subscription.latest_invoice) {
            const invoiceId = typeof subscription.latest_invoice === 'string' 
              ? subscription.latest_invoice 
              : subscription.latest_invoice.id;
            
            const invoice = await stripe.invoices.retrieve(invoiceId, {
              expand: ['payment_intent']
            }) as Stripe.Response<Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string | null }>;
            
            const paymentIntentData = invoice.payment_intent;
            
            if (paymentIntentData) {
              const paymentIntentId = typeof paymentIntentData === 'string'
                ? paymentIntentData
                : paymentIntentData.id;
              
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
              
              if (paymentIntent.client_secret) {
                console.log('[Stripe] Returning existing subscription clientSecret');
                return res.json({
                  subscriptionId: subscription.id,
                  clientSecret: paymentIntent.client_secret,
                });
              }
            }
          }
          
          // If subscription is canceled, expired, or otherwise unusable, clear it
          console.log('[Stripe] Clearing unusable subscription');
          await storage.clearStripeSubscription(userId);
          const refreshedUser = await storage.getUser(userId);
          if (!refreshedUser) {
            return res.status(404).json({ message: 'User not found after clearing subscription' });
          }
          user = refreshedUser;
        }
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

      // Determine pricing based on selected plan
      const priceConfig = plan === 'monthly' 
        ? { amount: 1000, interval: 'month' as const }  // $10/month
        : { amount: 10000, interval: 'year' as const }; // $100/year

      // Search for existing price for this product and plan
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      let price = prices.data.find(p => 
        p.unit_amount === priceConfig.amount && 
        p.currency === 'usd' && 
        p.recurring?.interval === priceConfig.interval
      );
      
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceConfig.amount,
          currency: 'usd',
          recurring: { interval: priceConfig.interval },
        });
      }

      // Create a SetupIntent to collect payment method first
      // This is the correct flow for subscriptions - collect payment method, then create subscription
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          userId,
          priceId: price.id,
          plan,
        },
      });

      console.log('[Stripe] SetupIntent created:', {
        setupIntentId: setupIntent.id,
        status: setupIntent.status,
        clientSecret: setupIntent.client_secret ? 'YES' : 'NO',
      });

      // Update customer ID but DON'T store SetupIntent ID in subscription field
      // We'll only store the actual subscription ID after payment is confirmed
      if (!user.stripeCustomerId) {
        await storage.updateUserStripeInfo(userId, customerId, '');
      }

      res.json({
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        priceId: price.id,
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return res.status(400).json({ message: error.message });
    }
  });

  // Complete subscription after payment method is confirmed
  app.post('/api/complete-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { setupIntentId } = req.body;

      if (!setupIntentId) {
        return res.status(400).json({ message: 'Missing setupIntentId' });
      }

      // Retrieve the SetupIntent to get the payment method
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      
      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment method not confirmed' });
      }

      const paymentMethodId = setupIntent.payment_method as string;
      const customerId = setupIntent.customer as string;
      const priceId = setupIntent.metadata?.priceId;

      if (!paymentMethodId || !customerId || !priceId) {
        return res.status(400).json({ message: 'Invalid SetupIntent data' });
      }

      // Set the payment method as default for the customer
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Now create the subscription with the payment method
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
      });

      console.log('[Stripe] Subscription created after payment:', {
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      // Update user with subscription info
      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      // If subscription is active, upgrade user immediately
      if (subscription.status === 'active') {
        await storage.updateSubscriptionStatus(userId, {
          subscriptionStatus: 'active',
          subscriptionTier: 'pro',
          stripeSubscriptionId: subscription.id,
        });
        console.log(`[Stripe] User ${userId} upgraded to pro immediately`);
      }

      res.json({
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    } catch (error: any) {
      console.error('Error completing subscription:', error);
      return res.status(400).json({ message: error.message });
    }
  });

  // DEBUG: Test Stripe API directly
  app.get('/api/test-stripe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.json({ error: 'User not found or no email' });
      }

      // Test 1: Create a customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: 'Test Customer',
      });

      // Test 2: Get/create product
      let product = await stripe.products.create({
        name: 'Test Product ' + Date.now(),
      });

      // Test 3: Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 1000,
        currency: 'usd',
        recurring: { interval: 'month' },
      });

      // Test 4: Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Test 5: Get client secret
      let clientSecret = null;
      if (subscription.latest_invoice) {
        const invoiceId = typeof subscription.latest_invoice === 'string' 
          ? subscription.latest_invoice 
          : subscription.latest_invoice.id;
        
        const invoice = await stripe.invoices.retrieve(invoiceId, {
          expand: ['payment_intent']
        }) as Stripe.Response<Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string | null }>;
        
        const paymentIntentData = invoice.payment_intent;
        
        if (paymentIntentData) {
          const paymentIntentId = typeof paymentIntentData === 'string'
            ? paymentIntentData
            : paymentIntentData.id;
          
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          clientSecret = paymentIntent.client_secret;
        }
      }

      res.json({
        success: true,
        customerId: customer.id,
        productId: product.id,
        priceId: price.id,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        clientSecret: clientSecret,
        clientSecretExists: !!clientSecret,
      });
    } catch (error: any) {
      res.json({ error: error.message, stack: error.stack });
    }
  });

  // Stripe one-time payment route for lifetime access (from blueprint:javascript_stripe)
  app.post('/api/create-payment-intent', isAuthenticated, async (req: any, res) => {
    try {
      // Validate user authentication metadata
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: 'Authentication required - missing user ID' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user already has lifetime access
      if (user.subscriptionTier === 'lifetime') {
        return res.status(400).json({ message: 'Already have lifetime access' });
      }

      const { amount } = req.body;
      
      if (!amount || amount !== 250) {
        return res.status(400).json({ message: 'Invalid amount for lifetime access' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId: userId,
          tier: 'lifetime'
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });

  app.get("/api/locations", async (req: any, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const county = req.query.county as string;
      const city = req.query.city as string;
      const zip = req.query.zip as string;
      const minRevenue = req.query.minRevenue ? parseFloat(req.query.minRevenue as string) : undefined;
      const page = parseInt(req.query.page as string) || 1;
      let limit = parseInt(req.query.limit as string) || 1000;
      
      // Check if user is authenticated
      const isAuth = req.user?.claims?.sub;
      
      // Freemium restrictions for unauthenticated users
      if (!isAuth) {
        // Enforce county-only access (no statewide view)
        if (!county) {
          return res.status(401).json({ 
            error: "Authentication required",
            message: "Free users must select a county. Sign in to view all locations."
          });
        }
        
        // Enforce current year only (2025) - require BOTH startDate and endDate
        const currentYear = new Date().getFullYear().toString();
        if (!startDate || !endDate) {
          return res.status(401).json({ 
            error: "Authentication required",
            message: "Date range required for free users."
          });
        }
        if (!startDate.startsWith(currentYear) || !endDate.startsWith(currentYear)) {
          return res.status(401).json({ 
            error: "Authentication required",
            message: "Historical data requires sign in to view."
          });
        }
        
        // Enforce page 1 only (prevent pagination bypass - including negative pages)
        if (page !== 1) {
          return res.status(401).json({ 
            error: "Authentication required",
            message: "Only page 1 is available for free users. Sign in to view more."
          });
        }
        
        // Enforce top 10 limit
        limit = 10;
        console.log(`[FREEMIUM] Enforcing top 10 limit for county: ${county}`);
      }
      
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

  app.get("/api/locations/search/by-name", async (req: any, res) => {
    try {
      // Require authentication for search functionality
      const isAuth = req.user?.claims?.sub;
      if (!isAuth) {
        return res.status(401).json({ 
          error: "Authentication required",
          message: "Search functionality requires sign in."
        });
      }
      
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
