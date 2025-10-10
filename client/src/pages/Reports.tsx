import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, FileText, BarChart3, TrendingUp } from "lucide-react";
import { PermitReport } from "@/components/reports/PermitReport";
import { PermitComparison } from "@/components/reports/PermitComparison";
import { Outliers } from "@/components/reports/Outliers";
import { SEO } from "@/components/SEO";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("location");

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
                <PermitReport />
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
                <Outliers />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
