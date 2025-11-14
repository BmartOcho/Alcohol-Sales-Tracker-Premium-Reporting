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
import About from "@/pages/About";
import AdminContacts from "@/pages/AdminContacts";
import NotFound from "@/pages/not-found";

// 👇 Add this import (your new dashboard page)
import EstablishmentPage from "@/pages/EstablishmentPage";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Freemium/public routes */}
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />

      {/* Establishment dashboard (public) */}
      <Route path="/establishment/:permit" component={EstablishmentPage} />

      {/* Auth pages */}
      <Route path="/login" component={Landing} />
      <Route path="/signup" component={Landing} />

      {/* Protected routes */}
      {isLoading ? (
        <Route
          path="/reports"
          component={() => (
            <div className="flex items-center justify-center h-screen">
              Loading...
            </div>
          )}
        />
      ) : isAuthenticated ? (
        <>
          <Route path="/reports" component={Reports} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/admin/contacts" component={AdminContacts} />
        </>
      ) : (
        <>
          <Route path="/reports" component={Landing} />
          <Route path="/subscribe" component={Landing} />
          <Route path="/admin/contacts" component={Landing} />
        </>
      )}

      {/* Catch-all */}
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
