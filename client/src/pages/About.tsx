import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Database, DollarSign, TrendingUp, Mail, ExternalLink } from "lucide-react";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function About() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/contact", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }
      
      const result = await response.json();
      toast({
        title: "Message Sent",
        description: result.message,
      });
      
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">About Alcohol Sales Tracker</h1>
        <p className="text-lg text-muted-foreground">
          Your comprehensive resource for Texas alcohol sales data and analytics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            How to Use This Application
          </CardTitle>
          <CardDescription>
            Navigate and explore Texas alcohol sales data with ease
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">1. Interactive Map</h3>
            <p className="text-muted-foreground mb-2">
              The map loads instantly showing all 254 Texas counties. Select a county to view locations, or use the search bar to find specific establishments, cities, or addresses.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Click any county</strong> to filter locations within that county</li>
              <li><strong>Search</strong> by location name, city, county, or address</li>
              <li><strong>Click markers</strong> to view detailed sales information</li>
              <li><strong>Use year selector</strong> to filter data by year (2015-2025)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">2. Reports & Analytics</h3>
            <p className="text-muted-foreground mb-2">
              Access three powerful reporting tools:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Permit Report</strong> - Detailed analysis of individual establishments with sales trends</li>
              <li><strong>Permit Comparison</strong> - Compare up to 6 locations side-by-side</li>
              <li><strong>Outliers</strong> - Statistical analysis to identify unusual sales patterns using Z-scores</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">3. Understanding the Data</h3>
            <p className="text-muted-foreground mb-2">
              Sales data is categorized into three types:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong className="text-purple-600 dark:text-purple-400">Liquor</strong> - Spirits and distilled beverages</li>
              <li><strong className="text-red-600 dark:text-red-400">Wine</strong> - Wine and wine-based products</li>
              <li><strong className="text-amber-600 dark:text-amber-400">Beer</strong> - Beer and malt beverages</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">4. Free vs. Pro Access</h3>
            <p className="text-muted-foreground mb-2">
              <strong>Free users:</strong> View top 10 locations per county for the current year
            </p>
            <p className="text-muted-foreground">
              <strong>Pro subscribers ($10/month or $100/year):</strong> Unlimited access to all locations, historical data (2015-2024), full search, and advanced analytics
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Source & Methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Texas Open Data Portal</h3>
            <p className="text-muted-foreground mb-2">
              All sales data is sourced from the official{" "}
              <a 
                href="https://data.texas.gov/resource/naix-2893.json" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
                data-testid="link-data-source"
              >
                Texas Open Data API
                <ExternalLink className="h-3 w-3" />
              </a>
              , maintained by the Texas Comptroller of Public Accounts.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Data Coverage</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Time Range:</strong> Monthly data from January 2015 to present</li>
              <li><strong>Geographic Coverage:</strong> All 254 Texas counties</li>
              <li><strong>Record Count:</strong> 1.8+ million monthly sales records</li>
              <li><strong>Locations Tracked:</strong> 22,000+ active alcohol permit holders</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Update Frequency</h3>
            <p className="text-muted-foreground">
              Our system automatically checks for new data every hour and imports any new monthly reports from the Texas Open Data Portal. This ensures you always have access to the most current information available.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Data Accuracy</h3>
            <p className="text-muted-foreground">
              We maintain 100% parity with the official Texas data. All sales figures represent gross receipts reported by permit holders and are aggregated by location permit number. Historical totals are calculated from all available monthly records.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Financial Analytics
              </h3>
              <p className="text-sm text-muted-foreground">
                Track sales trends, compare establishments, and identify market outliers with statistical analysis
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Geographic Insights
              </h3>
              <p className="text-sm text-muted-foreground">
                Visualize sales data by county, city, and individual location with interactive maps
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Historical Trends
              </h3>
              <p className="text-sm text-muted-foreground">
                Analyze sales patterns over time with 10+ years of monthly data
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Real-Time Updates
              </h3>
              <p className="text-sm text-muted-foreground">
                Automatic hourly checks ensure data is always current and accurate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="contact">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Us
          </CardTitle>
          <CardDescription>
            Have questions, feedback, or need support? Send us a message and we'll get back to you soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-contact">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your full name" 
                        {...field} 
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="your.email@example.com" 
                        {...field} 
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="What's this about?" 
                        {...field} 
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us what's on your mind..." 
                        className="min-h-32"
                        {...field} 
                        data-testid="input-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                data-testid="button-submit-contact"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
