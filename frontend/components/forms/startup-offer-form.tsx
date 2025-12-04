"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RSUFormComponent } from "./rsu-form";
import { StockOptionsFormComponent } from "./stock-options-form";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

interface StartupOfferFormProps {
  onRSUChange?: (data: RSUForm) => void;
  onStockOptionsChange?: (data: StockOptionsForm) => void;
}

export function StartupOfferFormComponent({
  onRSUChange,
  onStockOptionsChange,
}: StartupOfferFormProps) {
  const [activeTab, setActiveTab] = React.useState<"rsu" | "options">("rsu");

  return (
    <Card className="glass-card animate-slide-up border-l-4 border-l-chart-1/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-chart-1"></div>
          Startup Offer
        </CardTitle>
        <CardDescription>Configure your equity package</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rsu" | "options")}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg">
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
            <RSUFormComponent onChange={onRSUChange} />
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-6">
            <StockOptionsFormComponent onChange={onStockOptionsChange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
