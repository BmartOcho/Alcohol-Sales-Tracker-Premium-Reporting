// Subscription page with Stripe integration (from blueprint:javascript_stripe)
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { SEO } from "@/components/SEO";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
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

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed!",
      });
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

type PlanType = 'monthly' | 'lifetime';

export default function Subscribe() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Create payment intent when plan is selected
    const endpoint = selectedPlan === 'monthly' ? '/api/create-subscription' : '/api/create-payment-intent';
    const payload = selectedPlan === 'lifetime' ? { amount: 250 } : {};

    apiRequest("POST", endpoint, payload)
      .then((res) => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.message || 'Failed to create payment');
          });
        }
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        console.error('Error creating payment:', err);
        setError(err.message);
      });
  }, [selectedPlan]);

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
        description="Upgrade to Pro starting at $10/month or $250 lifetime. Get unlimited access to interactive maps, detailed analytics, location reports, and county insights for Texas alcohol sales data."
        type="website"
      />
      <div className="max-w-4xl mx-auto py-4 lg:py-8 space-y-6 lg:space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold">Upgrade to Pro</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Choose the plan that works best for you
          </p>
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
            className={`cursor-pointer transition-all ${selectedPlan === 'lifetime' ? 'ring-2 ring-primary' : 'hover-elevate'}`}
            onClick={() => setSelectedPlan('lifetime')}
            data-testid="card-lifetime-plan"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Lifetime Access
                {selectedPlan === 'lifetime' && <Check className="h-5 w-5 text-primary" />}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">$250</span>
                <span className="text-muted-foreground"> one-time</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pay once, access forever. Best value!
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
                    <span className="text-2xl font-bold text-foreground">$250</span>
                    <span className="text-muted-foreground"> one-time</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }} key={clientSecret}>
                <SubscribeForm />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
