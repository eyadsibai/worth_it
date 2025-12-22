"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RSUFormComponent } from "./rsu-form";
import { StockOptionsFormComponent } from "./stock-options-form";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

interface StartupOfferFormProps {
  /** External value to sync with (e.g., from Zustand store) */
  value?: RSUForm | StockOptionsForm | null;
  onRSUChange?: (data: RSUForm) => void;
  onStockOptionsChange?: (data: StockOptionsForm) => void;
  /** Enable collapsible card behavior (default: true) */
  collapsible?: boolean;
  /** Initial open state when collapsible (default: true) */
  defaultOpen?: boolean;
}

export function StartupOfferFormComponent({
  value,
  onRSUChange,
  onStockOptionsChange,
  collapsible = true,
  defaultOpen = true,
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

  const formContent = (
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
  );

  if (collapsible) {
    return (
      <Collapsible defaultOpen={defaultOpen}>
        <Card className="terminal-card animate-slide-up border-l-4 border-l-primary/50" data-tour="startup-offer-card">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    Startup Offer
                  </CardTitle>
                  <CardDescription>Configure your equity package</CardDescription>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=closed]_&]:-rotate-90" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <CardContent>{formContent}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="terminal-card animate-slide-up border-l-4 border-l-primary/50" data-tour="startup-offer-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          Startup Offer
        </CardTitle>
        <CardDescription>Configure your equity package</CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
