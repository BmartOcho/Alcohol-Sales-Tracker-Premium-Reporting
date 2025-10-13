import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

interface FreemiumPaywallModalProps {
  open: boolean;
  searchesUsed: number;
  reason?: 'search_limit' | 'data_access';
}

export function FreemiumPaywallModal({ open, searchesUsed, reason = 'search_limit' }: FreemiumPaywallModalProps) {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  const handleSignUp = () => {
    window.location.href = "/api/login";
  };

  const isSearchLimit = reason === 'search_limit';
  const title = isSearchLimit ? 'Search Limit Reached' : 'Premium Data Access';
  const description = isSearchLimit 
    ? `You've used all ${searchesUsed} free searches today. Sign in to unlock unlimited searches and access full sales data!`
    : 'Sign in to access detailed location data, historical records, and advanced analytics.';

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent 
        className="max-w-md [&>button]:hidden"
        data-testid="modal-freemium-paywall"
        // Prevent closing by clicking outside or pressing escape
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
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

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSignIn}
            data-testid="button-paywall-signin"
          >
            Sign In to Continue
          </Button>

          <div className="text-center">
            <button
              onClick={handleSignUp}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              data-testid="button-paywall-signup"
            >
              Don't have an account? Sign up free
            </button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Free tier resets daily at midnight
        </p>
      </DialogContent>
    </Dialog>
  );
}
