import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BarChart3, MapPin, TrendingUp, LineChart } from "lucide-react";
import { SEO } from "@/components/SEO";
import { StructuredData } from "@/components/StructuredData";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Texas Alcohol Sales Map - Interactive Sales Data & Analytics"
        description="Explore Texas alcohol sales data with interactive maps and analytics. Track 22,000+ locations, analyze sales trends, and discover market opportunities across all 254 Texas counties."
        type="website"
      />
      <StructuredData
        type="WebApplication"
        data={{
          name: "Texas Alcohol Sales Map",
          description: "Interactive mapping and analytics platform for Texas alcohol sales data",
          applicationCategory: "BusinessApplication",
          offers: {
            "@type": "Offer",
            price: "20.00",
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "20.00",
              priceCurrency: "USD",
              referenceQuantity: {
                "@type": "QuantitativeValue",
                value: "1",
                unitCode: "MON"
              }
            }
          },
          featureList: [
            "Interactive map with 22,000+ Texas locations",
            "Detailed sales analytics and reports",
            "County-level consumption trends",
            "Historical data from 2015-2025"
          ]
        }}
      />
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Texas Alcohol Sales Map</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={handleLogin} data-testid="button-login">
              Log In
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Visualize Texas Alcohol Sales Data
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Interactive mapping and analytics for mixed beverage gross receipts across Texas establishments
            </p>
            <div className="pt-4">
              <Button size="lg" onClick={handleLogin} className="text-lg px-8" data-testid="button-hero-login">
                Get Started
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <MapPin className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Interactive Map</CardTitle>
                <CardDescription>
                  Explore 22,000+ locations across Texas with real-time sales data visualization
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <LineChart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Location Reports</CardTitle>
                <CardDescription>
                  Detailed sales analysis and historical trends for individual establishments
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>County Analytics</CardTitle>
                <CardDescription>
                  Track consumption patterns and identify market opportunities by county
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Data Coverage */}
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Data Coverage</CardTitle>
              <CardDescription>Access years of mixed beverage sales data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Historical Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete sales records from 2015 to present, including liquor, wine, and beer categories
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Real-time Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Monthly updates from the Texas Comptroller's office for the latest market insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center space-y-4 py-8">
            <h3 className="text-2xl font-bold">Ready to explore?</h3>
            <p className="text-muted-foreground">
              Log in to access the full map, analytics, and reporting tools
            </p>
            <Button size="lg" onClick={handleLogin} data-testid="button-footer-login">
              Access the Platform
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
