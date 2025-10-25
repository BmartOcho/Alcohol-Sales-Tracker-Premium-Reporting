import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, FileText, BarChart3, TrendingUp, Lock, Loader2 } from "lucide-react";
import { PermitReport } from "@/components/reports/PermitReport";
import { PermitComparison } from "@/components/reports/PermitComparison";
import { Outliers } from "@/components/reports/Outliers";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

export default function Reports() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("location");
  const [selectedPermitForReport, setSelectedPermitForReport] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);

  // Check if user has paid access
  const hasPaidAccess = isAuthenticated && user && (
    (user as any).subscriptionStatus === 'active' || 
    (user as any).subscriptionTier === 'lifetime'
  );

  const handleNavigateToLocationReport = (permitNumber: string, startDate: string, endDate: string) => {
    setSelectedPermitForReport(permitNumber);
    setSelectedDateRange({ start: startDate, end: endDate });
    setActiveTab("location");
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  const handleUpgrade = () => {
    setLocation("/subscribe");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <div>
            <p className="text-lg font-medium">Loading Reports</p>
            <p className="text-sm text-muted-foreground mt-1">
              Preparing your analytics dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sales Reports & Analytics - Texas Alcohol Sales Map"
        description="Detailed alcohol sales reports and analytics for Texas establishments. Compare locations, analyze permit-level data, and identify outliers selling disproportionately more beer, wine, or liquor by county."
        type="website"
      />
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 lg:px-4 py-3 lg:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home" className="hidden sm:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Map
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-back-home-mobile" className="sm:hidden h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg lg:text-2xl font-bold truncate">
              <span className="hidden sm:inline">Sales Reports & Analytics</span>
              <span className="sm:hidden">Reports</span>
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-3 lg:px-4 py-4 lg:py-8">
        {!hasPaidAccess ? (
          <Card className="max-w-2xl mx-auto" data-testid="card-reports-paywall">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Premium Feature: Reports & Analytics</CardTitle>
              <CardDescription className="text-base pt-2">
                Access detailed location reports, multi-location comparisons, and outlier analysis with a Pro subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Location Sales Reports</p>
                    <p className="text-sm text-muted-foreground">Analyze detailed sales data for any location with charts and insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Multi-Location Comparison</p>
                    <p className="text-sm text-muted-foreground">Compare sales performance across multiple establishments</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Outliers Analysis</p>
                    <p className="text-sm text-muted-foreground">Identify locations with unusual sales patterns using Z-score analysis</p>
                  </div>
                </div>
              </div>

              {isAuthenticated ? (
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleUpgrade}
                  data-testid="button-upgrade-reports"
                >
                  Upgrade to Pro - Starting at $10/month
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSignIn}
                    data-testid="button-signin-reports"
                  >
                    Sign In to Continue
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    New users get a free trial • Sign in with Google or GitHub
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 lg:mb-8" data-testid="tabs-report-types">
            <TabsTrigger value="location" data-testid="tab-location-report" className="text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Location Report</span>
              <span className="sm:hidden">Location</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" data-testid="tab-comparison-report" className="text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Location Comparison</span>
              <span className="sm:hidden">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="outliers" data-testid="tab-outliers-report" className="text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="sm:hidden">Outliers</span>
              <span className="hidden sm:inline">Outliers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Location Sales Report</CardTitle>
              </CardHeader>
              <CardContent>
                <PermitReport 
                  initialPermit={selectedPermitForReport} 
                  initialDateRange={selectedDateRange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compare Multiple Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <PermitComparison />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outliers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Outliers Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Outliers onNavigateToReport={handleNavigateToLocationReport} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </main>
    </div>
  );
}
