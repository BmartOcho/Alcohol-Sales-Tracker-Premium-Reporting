import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Reports from "@/pages/Reports";
import Subscribe from "@/pages/Subscribe";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Freemium: Home is accessible to everyone */}
      <Route path="/" component={Home} />
      
      {/* Auth pages */}
      <Route path="/login" component={Landing} />
      <Route path="/signup" component={Landing} />
      
      {/* Protected routes - require authentication */}
      {isLoading ? (
        <Route path="/reports" component={() => <div className="flex items-center justify-center h-screen">Loading...</div>} />
      ) : isAuthenticated ? (
        <>
          <Route path="/reports" component={Reports} />
          <Route path="/subscribe" component={Subscribe} />
        </>
      ) : (
        <>
          <Route path="/reports" component={Landing} />
          <Route path="/subscribe" component={Landing} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
