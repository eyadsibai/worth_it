"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SAFEForm } from "./safe-form";
import { ConvertibleNoteForm } from "./convertible-note-form";
import { PricedRoundForm } from "./priced-round-form";
import {
  motion,
  MotionFadeInUp,
  MotionList,
  MotionListItem,
  AnimatedNumber,
} from "@/lib/motion";
import type {
  FundingInstrument,
  SAFEFormData,
  ConvertibleNoteFormData,
  PricedRoundFormData,
  SAFE,
  ConvertibleNote,
  PricedRound,
} from "@/lib/schemas";
import { FileText, Banknote, TrendingUp, Trash2 } from "lucide-react";

interface FundingRoundsManagerProps {
  instruments: FundingInstrument[];
  onAddInstrument: (instrument: FundingInstrument) => void;
  onRemoveInstrument: (id: string) => void;
  totalShares?: number;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `SAR ${(value / 1000000).toFixed(2)}M`;
  }
  return `SAR ${value.toLocaleString()}`;
}

export function FundingRoundsManager({
  instruments,
  onAddInstrument,
  onRemoveInstrument,
  totalShares = 10000000,
}: FundingRoundsManagerProps) {
  const [activeTab, setActiveTab] = React.useState<"safe" | "note" | "priced">("safe");

  const handleAddSAFE = (data: SAFEFormData) => {
    const safe: SAFE = {
      id: generateId(),
      type: "SAFE",
      investor_name: data.investor_name,
      investment_amount: data.investment_amount,
      valuation_cap: data.valuation_cap,
      discount_pct: data.discount_pct,
      pro_rata_rights: data.pro_rata_rights,
      mfn_clause: data.mfn_clause,
      status: "outstanding",
    };
    onAddInstrument(safe);
  };

  const handleAddNote = (data: ConvertibleNoteFormData) => {
    const note: ConvertibleNote = {
      id: generateId(),
      type: "CONVERTIBLE_NOTE",
      investor_name: data.investor_name,
      principal_amount: data.principal_amount,
      interest_rate: data.interest_rate,
      valuation_cap: data.valuation_cap,
      discount_pct: data.discount_pct,
      maturity_months: data.maturity_months,
      status: "outstanding",
    };
    onAddInstrument(note);
  };

  const handleAddPricedRound = (data: PricedRoundFormData) => {
    const preMoney = data.pre_money_valuation;
    const amountRaised = data.amount_raised;
    const postMoney = preMoney + amountRaised;
    const pricePerShare = totalShares > 0 ? preMoney / totalShares : 0;
    const newShares = pricePerShare > 0 ? amountRaised / pricePerShare : 0;

    const round: PricedRound = {
      id: generateId(),
      type: "PRICED_ROUND",
      round_name: data.round_name,
      lead_investor: data.lead_investor,
      pre_money_valuation: preMoney,
      amount_raised: amountRaised,
      price_per_share: pricePerShare,
      liquidation_multiplier: data.liquidation_multiplier,
      participating: data.participating,
      new_shares_issued: Math.round(newShares),
      post_money_valuation: postMoney,
    };
    onAddInstrument(round);
  };

  // Calculate totals
  const totalRaised = instruments.reduce((sum, inst) => {
    if (inst.type === "SAFE") return sum + inst.investment_amount;
    if (inst.type === "CONVERTIBLE_NOTE") return sum + inst.principal_amount;
    if (inst.type === "PRICED_ROUND") return sum + inst.amount_raised;
    return sum;
  }, 0);

  const safes = instruments.filter((i): i is SAFE => i.type === "SAFE");
  const notes = instruments.filter((i): i is ConvertibleNote => i.type === "CONVERTIBLE_NOTE");
  const rounds = instruments.filter((i): i is PricedRound => i.type === "PRICED_ROUND");

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        <motion.div
          className="p-3 border rounded-lg cursor-default"
          whileHover={{ scale: 1.02, borderColor: "hsl(var(--terminal))" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-muted-foreground">Total Raised</div>
          <div className="text-lg font-mono font-medium text-terminal">
            SAR <AnimatedNumber
              value={totalRaised}
              formatValue={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(2)}M` : v.toLocaleString()}
            />
          </div>
        </motion.div>
        <motion.div
          className="p-3 border rounded-lg cursor-default"
          whileHover={{ scale: 1.02, borderColor: "hsl(var(--chart-1))" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-muted-foreground">SAFEs</div>
          <div className="text-lg font-mono">
            <AnimatedNumber value={safes.length} />
          </div>
        </motion.div>
        <motion.div
          className="p-3 border rounded-lg cursor-default"
          whileHover={{ scale: 1.02, borderColor: "hsl(var(--chart-2))" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-muted-foreground">Notes</div>
          <div className="text-lg font-mono">
            <AnimatedNumber value={notes.length} />
          </div>
        </motion.div>
        <motion.div
          className="p-3 border rounded-lg cursor-default"
          whileHover={{ scale: 1.02, borderColor: "hsl(var(--chart-3))" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-muted-foreground">Rounds</div>
          <div className="text-lg font-mono">
            <AnimatedNumber value={rounds.length} />
          </div>
        </motion.div>
      </div>

      {/* Add New Instrument */}
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle>Add Funding Instrument</CardTitle>
          <CardDescription>
            Track SAFEs, convertible notes, and priced rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="safe" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                SAFE
              </TabsTrigger>
              <TabsTrigger value="note" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Convertible Note
              </TabsTrigger>
              <TabsTrigger value="priced" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Priced Round
              </TabsTrigger>
            </TabsList>

            <TabsContent value="safe">
              <SAFEForm onSubmit={handleAddSAFE} />
            </TabsContent>

            <TabsContent value="note">
              <ConvertibleNoteForm onSubmit={handleAddNote} />
            </TabsContent>

            <TabsContent value="priced">
              <PricedRoundForm onSubmit={handleAddPricedRound} totalShares={totalShares} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Instruments List */}
      {instruments.length > 0 && (
        <MotionFadeInUp>
          <Card className="terminal-card">
            <CardHeader>
              <CardTitle>Funding History ({instruments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <MotionList className="space-y-3">
                {instruments.map((instrument) => (
                  <MotionListItem key={instrument.id}>
                    <motion.div
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      whileHover={{ x: 4, borderColor: "hsl(var(--terminal) / 0.5)" }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-3">
                        {instrument.type === "SAFE" && <FileText className="h-5 w-5 text-blue-500" />}
                        {instrument.type === "CONVERTIBLE_NOTE" && <Banknote className="h-5 w-5 text-green-500" />}
                        {instrument.type === "PRICED_ROUND" && <TrendingUp className="h-5 w-5 text-purple-500" />}

                        <div>
                          <div className="font-medium">
                            {instrument.type === "SAFE" && instrument.investor_name}
                            {instrument.type === "CONVERTIBLE_NOTE" && instrument.investor_name}
                            {instrument.type === "PRICED_ROUND" && instrument.round_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {instrument.type === "SAFE" && (
                              <>
                                {formatCurrency(instrument.investment_amount)}
                                {instrument.valuation_cap && ` • Cap: ${formatCurrency(instrument.valuation_cap)}`}
                                {instrument.discount_pct && ` • ${instrument.discount_pct}% discount`}
                              </>
                            )}
                            {instrument.type === "CONVERTIBLE_NOTE" && (
                              <>
                                {formatCurrency(instrument.principal_amount)}
                                {` • ${instrument.interest_rate}% interest`}
                                {` • ${instrument.maturity_months}mo maturity`}
                              </>
                            )}
                            {instrument.type === "PRICED_ROUND" && (
                              <>
                                {formatCurrency(instrument.amount_raised)}
                                {` • Pre: ${formatCurrency(instrument.pre_money_valuation)}`}
                                {instrument.lead_investor && ` • Led by ${instrument.lead_investor}`}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={
                          instrument.type === "SAFE" ? "default" :
                          instrument.type === "CONVERTIBLE_NOTE" ? "secondary" :
                          "outline"
                        }>
                          {instrument.type === "SAFE" && "SAFE"}
                          {instrument.type === "CONVERTIBLE_NOTE" && "Note"}
                          {instrument.type === "PRICED_ROUND" && "Priced"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveInstrument(instrument.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </MotionListItem>
                ))}
              </MotionList>
            </CardContent>
          </Card>
        </MotionFadeInUp>
      )}
    </div>
  );
}
