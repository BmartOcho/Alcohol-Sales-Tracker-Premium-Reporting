import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, FileText, BarChart3, TrendingUp } from "lucide-react";
import { PermitReport } from "@/components/reports/PermitReport";
import { PermitComparison } from "@/components/reports/PermitComparison";
import { HotSpotTimeline } from "@/components/reports/HotSpotTimeline";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("location");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Map
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Sales Reports & Analytics</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="tabs-report-types">
            <TabsTrigger value="location" data-testid="tab-location-report">
              <FileText className="h-4 w-4 mr-2" />
              Location Report
            </TabsTrigger>
            <TabsTrigger value="comparison" data-testid="tab-comparison-report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Location Comparison
            </TabsTrigger>
            <TabsTrigger value="hotspot" data-testid="tab-hotspot-report">
              <TrendingUp className="h-4 w-4 mr-2" />
              Hot Spot Timeline
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

          <TabsContent value="hotspot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>County Hot Spot Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <HotSpotTimeline />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
