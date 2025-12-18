"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RSUFormComponent } from "./rsu-form";
import { StockOptionsFormComponent } from "./stock-options-form";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

interface StartupOfferFormProps {
  /** External value to sync with (e.g., from Zustand store) */
  value?: RSUForm | StockOptionsForm | null;
  onRSUChange?: (data: RSUForm) => void;
  onStockOptionsChange?: (data: StockOptionsForm) => void;
}

export function StartupOfferFormComponent({
  value,
  onRSUChange,
  onStockOptionsChange,
}: StartupOfferFormProps) {
  // Determine which tab should be active based on the value's equity_type
  const [activeTab, setActiveTab] = React.useState<"rsu" | "options">(() => {
    if (value?.equity_type === "STOCK_OPTIONS") return "options";
    return "rsu";
  });

  // Update active tab when value changes to a different equity type
  React.useEffect(() => {
    if (value?.equity_type === "STOCK_OPTIONS") {
      setActiveTab("options");
    } else if (value?.equity_type === "RSU") {
      setActiveTab("rsu");
    }
  }, [value?.equity_type]);

  return (
    <Card className="terminal-card animate-slide-up border-l-4 border-l-primary/50" data-tour="startup-offer-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          Startup Offer
        </CardTitle>
        <CardDescription>Configure your equity package</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rsu" | "options")}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg" data-tour="equity-type-selector">
            <TabsTrigger
              value="rsu"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground data-[state=active]:shadow-sm transition-all"
            >
              RSUs
            </TabsTrigger>
            <TabsTrigger
              value="options"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground data-[state=active]:shadow-sm transition-all"
            >
              Stock Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rsu" className="space-y-4 mt-6">
            <RSUFormComponent
              value={value?.equity_type === "RSU" ? value : null}
              onChange={onRSUChange}
            />
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-6">
            <StockOptionsFormComponent
              value={value?.equity_type === "STOCK_OPTIONS" ? value : null}
              onChange={onStockOptionsChange}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
