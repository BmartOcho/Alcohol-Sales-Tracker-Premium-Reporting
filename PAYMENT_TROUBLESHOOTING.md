# Payment System Troubleshooting Guide

## ✅ System Status: CONFIGURED

The payment system is now properly configured with all required Stripe secrets:
- ✅ STRIPE_SECRET_KEY
- ✅ VITE_STRIPE_PUBLIC_KEY  
- ✅ STRIPE_WEBHOOK_SECRET (Just added!)

## Payment Flow Overview

### Step 1: User Visits Subscribe Page
- URL: `/subscribe`
- **Requirement:** User must be logged in (Replit Auth)
- **Plans Available:** 
  - Monthly: $10/month
  - Yearly: $100/year

### Step 2: SetupIntent Creation
- Frontend calls: `POST /api/create-subscription` with `{ plan: 'monthly' | 'yearly' }`
- Backend creates:
  1. Stripe customer (or reuses existing)
  2. Product: "Texas Alcohol Sales Map Pro"
  3. Price: $10/month or $100/year
  4. SetupIntent for collecting payment method
- Returns: `clientSecret` for Stripe PaymentElement

### Step 3: User Enters Payment Details
- Stripe PaymentElement embedded in page
- User enters credit card information
- **Security:** All card data handled by Stripe (PCI compliant)

### Step 4: Payment Confirmation
- User clicks "Subscribe Now"
- Frontend confirms SetupIntent with Stripe
- Frontend calls: `POST /api/complete-subscription` with `{ setupIntentId }`

### Step 5: Subscription Creation
- Backend verifies SetupIntent succeeded
- Creates actual Stripe subscription
- **Immediate upgrade:** If subscription.status === 'active', user upgraded to Pro immediately

### Step 6: Webhook Confirmation (Redundancy)
- Stripe sends webhook to: `/api/stripe-webhook`
- Events listened:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `payment_intent.succeeded`
- User upgraded to Pro via webhook (backup if Step 5 didn't upgrade)

## Testing Payments

### Stripe Test Cards
Use these test cards in **TEST MODE**:

**Success:**
- Card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

**3D Secure (requires auth):**
- Card: `4000 0027 6000 3184`

**Declined:**
- Card: `4000 0000 0000 0002`

### What to Monitor

**Server Logs:**
```bash
# Look for these messages:
[Stripe] SetupIntent created
[Stripe] Subscription created after payment
[Stripe] User {userId} upgraded to pro immediately
User {userId} subscription status updated
```

**User Database:**
After successful payment, user record should have:
- `subscriptionStatus`: 'active'
- `subscriptionTier`: 'pro'
- `stripeCustomerId`: 'cus_...'
- `stripeSubscriptionId`: 'sub_...'
- `subscriptionEndsAt`: (future date for subscriptions)

## Common Issues & Solutions

### Issue 1: "Missing stripe-signature header"
**Cause:** Webhook endpoint not receiving proper Stripe headers
**Solution:** Ensure webhook endpoint URL is correct in Stripe Dashboard

### Issue 2: "Webhook signature verification failed"
**Cause:** Wrong STRIPE_WEBHOOK_SECRET
**Solution:** 
1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your endpoint
3. Click "Reveal" on signing secret
4. Update STRIPE_WEBHOOK_SECRET in Replit Secrets

### Issue 3: User pays but doesn't get upgraded
**Possible causes:**
1. Webhook not configured - Check Stripe Dashboard
2. Webhook secret wrong - Verify secret matches
3. Server error in webhook handler - Check server logs
4. Database update failed - Check server logs for errors

**Debug steps:**
1. Check Stripe Dashboard → Events - see if webhook was sent
2. Check server logs for webhook receipt
3. Check database - query user's subscription status
4. Manually trigger upgrade if needed (via database update)

### Issue 4: "Already subscribed" error
**Cause:** User already has active subscription
**Solution:** This is expected - user should manage subscription in Stripe portal

### Issue 5: Payment form doesn't appear
**Possible causes:**
1. User not authenticated
2. API error creating SetupIntent
3. Missing Stripe public key

**Debug steps:**
1. Check browser console for errors
2. Check Network tab - look for failed API calls
3. Verify user is logged in
4. Check server logs for errors in `/api/create-subscription`

## Webhook Configuration Checklist

Your Stripe webhook should be configured at:
- **URL:** `https://[your-replit-domain].replit.app/api/stripe-webhook`
- **Events:**
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `payment_intent.succeeded`
- **Signing Secret:** Stored in STRIPE_WEBHOOK_SECRET

## Database Schema Reference

Users table subscription fields:
```sql
subscriptionStatus: 'free' | 'active' | 'past_due' | 'canceled'
subscriptionTier: 'free' | 'pro' | 'lifetime'
stripeCustomerId: 'cus_...' (Stripe customer ID)
stripeSubscriptionId: 'sub_...' (Stripe subscription ID)
subscriptionEndsAt: timestamp (when subscription expires)
```

## Support & Monitoring

**Check subscription status for a user:**
```sql
SELECT id, email, "subscriptionStatus", "subscriptionTier", "stripeSubscriptionId"
FROM users 
WHERE email = 'user@example.com';
```

**Find all active subscribers:**
```sql
SELECT COUNT(*) FROM users WHERE "subscriptionTier" = 'pro';
```

**Webhook event history:**
- Stripe Dashboard → Developers → Events
- Shows all webhook deliveries and responses

## Production Checklist

Before going live:
- [ ] Replace test Stripe keys with production keys
- [ ] Update webhook endpoint to production URL
- [ ] Test with real credit card (small amount)
- [ ] Verify user gets upgraded immediately
- [ ] Test subscription cancellation flow
- [ ] Monitor first few real payments closely

## Emergency Fixes

**If webhook is down/broken:**
Users may pay but not get upgraded. To manually upgrade:
```sql
UPDATE users 
SET "subscriptionStatus" = 'active',
    "subscriptionTier" = 'pro',
    "subscriptionEndsAt" = NOW() + INTERVAL '1 month'
WHERE "stripeCustomerId" = 'cus_...'
AND "stripeSubscriptionId" = 'sub_...';
```

**To cancel a subscription:**
1. In Stripe Dashboard, cancel subscription
2. Webhook will automatically downgrade user
3. OR manually: `UPDATE users SET "subscriptionStatus" = 'canceled', "subscriptionTier" = 'free'`
