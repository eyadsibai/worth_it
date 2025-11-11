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
    <Card>
      <CardHeader>
        <CardTitle>Startup Offer</CardTitle>
        <CardDescription>Configure your equity package</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rsu" | "options")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rsu">RSUs</TabsTrigger>
            <TabsTrigger value="options">Stock Options</TabsTrigger>
          </TabsList>

          <TabsContent value="rsu" className="space-y-4 mt-4">
            <RSUFormComponent onChange={onRSUChange} />
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-4">
            <StockOptionsFormComponent onChange={onStockOptionsChange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
