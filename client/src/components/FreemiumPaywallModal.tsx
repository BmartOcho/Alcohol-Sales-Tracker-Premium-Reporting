import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, CreditCard } from "lucide-react";

interface FreemiumPaywallModalProps {
  open: boolean;
  onClose: () => void;
  searchesUsed: number;
  reason?: 'search_limit' | 'data_access';
  isAuthenticated?: boolean;
}

export function FreemiumPaywallModal({ 
  open, 
  onClose,
  searchesUsed, 
  reason = 'search_limit',
  isAuthenticated = false 
}: FreemiumPaywallModalProps) {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  const handleUpgrade = () => {
    window.location.href = "/subscribe";
  };

  const isSearchLimit = reason === 'search_limit';
  
  // Different messaging based on authentication status
  const title = isAuthenticated 
    ? 'Upgrade to Pro' 
    : (isSearchLimit ? 'Search Limit Reached' : 'Premium Data Access');
    
  const description = isAuthenticated
    ? 'Unlock unlimited access to all locations, historical data, search, and advanced analytics.'
    : (isSearchLimit 
        ? `You've used all ${searchesUsed} free searches today. Sign in to unlock unlimited searches and access full sales data!`
        : 'Sign in to access detailed location data, historical records, and advanced analytics.');

  return (
    <Dialog open={open} onOpenChange={onClose} modal>
      <DialogContent 
        className="max-w-md"
        data-testid="modal-freemium-paywall"
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isAuthenticated ? <CreditCard className="h-8 w-8 text-primary" /> : <Lock className="h-8 w-8 text-primary" />}
          </div>
          <DialogTitle className="text-2xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Premium Features</p>
                <p className="text-sm text-muted-foreground">Unlimited searches, detailed reports, and advanced analytics</p>
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleUpgrade}
                data-testid="button-paywall-upgrade"
              >
                Upgrade to Pro - Starting at $10/month
              </Button>
              <div className="text-center text-xs text-muted-foreground pt-2">
                <p>💳 Secure payment powered by Stripe</p>
                <p>Cancel anytime • Full access instantly</p>
              </div>
            </>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSignIn}
                data-testid="button-paywall-signin"
              >
                Sign In with Google/GitHub
              </Button>

              <div className="text-center">
                <button
                  onClick={handleSignIn}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  data-testid="button-paywall-signup"
                >
                  Don't have an account? Sign up free
                </button>
              </div>
              
              <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
                <p>🔒 Secure login powered by Replit Auth</p>
                <p>Use your existing Google or GitHub account</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
