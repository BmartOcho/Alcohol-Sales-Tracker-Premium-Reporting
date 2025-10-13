// Subscription page with Stripe integration (from blueprint:javascript_stripe)
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ setupIntentId }: { setupIntentId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    // Confirm the SetupIntent with payment method
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/subscribe?success=true',
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    } else if (setupIntent && setupIntent.status === 'succeeded') {
      // Payment method saved, now create the subscription
      try {
        const response = await apiRequest("POST", '/api/complete-subscription', {
          setupIntentId: setupIntent.id,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to create subscription');
        }

        toast({
          title: "Subscription Successful!",
          description: "Welcome to Pro! Redirecting...",
        });

        // Redirect to home after success
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (err: any) {
        toast({
          title: "Subscription Error",
          description: err.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-subscribe">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isSubmitting}
        data-testid="button-submit-payment"
      >
        {isSubmitting ? "Processing..." : "Subscribe Now"}
      </Button>
    </form>
  );
};

type PlanType = 'monthly' | 'yearly';

export default function Subscribe() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Only create SetupIntent if user is authenticated
    if (!isAuthenticated) {
      console.log('[Subscribe] Not authenticated, skipping setup');
      return;
    }

    // Reset states when plan changes
    setClientSecret("");
    setSetupIntentId("");
    setError("");
    
    // Create SetupIntent for payment method collection
    const endpoint = '/api/create-subscription';
    const payload = { plan: selectedPlan };
    
    console.log('[Subscribe] Creating SetupIntent for plan:', selectedPlan);
    console.log('[Subscribe] isAuthenticated:', isAuthenticated);

    apiRequest("POST", endpoint, payload)
      .then((res) => {
        console.log('[Subscribe] API response status:', res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Session expired. Please sign in again.');
          }
          return res.json().then(data => {
            throw new Error(data.message || 'Failed to create setup');
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log('[Subscribe] Received clientSecret:', data.clientSecret ? 'YES' : 'NO');
        console.log('[Subscribe] Received setupIntentId:', data.setupIntentId ? 'YES' : 'NO');
        setClientSecret(data.clientSecret);
        setSetupIntentId(data.setupIntentId);
      })
      .catch((err) => {
        console.error('[Subscribe] Error creating setup:', err);
        setError(err.message);
      });
  }, [selectedPlan, isAuthenticated]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You must be signed in to subscribe. Please sign in to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/api/login'} 
              className="w-full"
              data-testid="button-signin-subscribe"
            >
              Sign In with Google/GitHub
            </Button>
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="outline"
              className="w-full"
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Subscription Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} data-testid="button-back-home">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 lg:p-4">
      <SEO
        title="Subscribe - Texas Alcohol Sales Map Pro"
        description="Upgrade to Pro starting at $10/month or $100/year. Get unlimited access to interactive maps, detailed analytics, location reports, and county insights for Texas alcohol sales data."
        type="website"
      />
      <div className="max-w-4xl mx-auto py-4 lg:py-8 space-y-6 lg:space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-2xl lg:text-3xl font-bold">Welcome! Complete Your Subscription</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Choose your plan and complete payment to unlock full access to all features
          </p>
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm">
            ✨ After payment, you'll have instant access to all 22,000+ locations and historical data
          </div>
        </div>

        {/* Plan Selection Cards */}
        <div className="grid md:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <Card 
            className={`cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'ring-2 ring-primary' : 'hover-elevate'}`}
            onClick={() => setSelectedPlan('monthly')}
            data-testid="card-monthly-plan"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Monthly Plan
                {selectedPlan === 'monthly' && <Check className="h-5 w-5 text-primary" />}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$10</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for ongoing access. Cancel anytime.
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${selectedPlan === 'yearly' ? 'ring-2 ring-primary' : 'hover-elevate'}`}
            onClick={() => setSelectedPlan('yearly')}
            data-testid="card-yearly-plan"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Yearly Plan
                {selectedPlan === 'yearly' && <Check className="h-5 w-5 text-primary" />}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$100</span>
                <span className="text-muted-foreground">/year</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Save 17% with annual billing. Best value!
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
              <CardDescription>Full access to all premium features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Interactive Map</p>
                  <p className="text-sm text-muted-foreground">Explore 22,000+ locations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Detailed Analytics</p>
                  <p className="text-sm text-muted-foreground">Location reports and comparisons</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">County Insights</p>
                  <p className="text-sm text-muted-foreground">Track consumption trends</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Historical Data</p>
                  <p className="text-sm text-muted-foreground">Access to all years (2015-2025)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Priority Support</p>
                  <p className="text-sm text-muted-foreground">Get help when you need it</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                {selectedPlan === 'monthly' ? (
                  <>
                    <span className="text-2xl font-bold text-foreground">$10</span>
                    <span className="text-muted-foreground"> /month</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-foreground">$100</span>
                    <span className="text-muted-foreground"> /year</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }} key={clientSecret}>
                <SubscribeForm setupIntentId={setupIntentId} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
