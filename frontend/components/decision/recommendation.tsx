"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type {
  DecisionRecommendation,
  DecisionInputs,
  ComparisonFactor,
} from "@/lib/decision-framework";
import { generateComparisonTable, getRecommendationLabel } from "@/lib/decision-framework";

// ============================================================================
// Types
// ============================================================================

interface DecisionRecommendationDisplayProps {
  /** The generated recommendation */
  recommendation: DecisionRecommendation;
  /** The inputs used to generate the recommendation */
  inputs: DecisionInputs;
  /** Called when user wants to redo the wizard */
  onRedo?: () => void;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface ScoreGaugeProps {
  score: number;
  maxScore: number;
  label: string;
  explanation: string;
}

function ScoreGauge({ score, maxScore, label, explanation }: ScoreGaugeProps) {
  const percentage = (score / maxScore) * 100;
  const getColor = () => {
    if (percentage >= 70) return "bg-terminal";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {score.toFixed(1)}/{maxScore}
        </span>
      </div>
      <div className="bg-muted relative h-2 overflow-hidden rounded-full">
        <div
          className={cn("absolute top-0 left-0 h-full rounded-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-muted-foreground text-xs">{explanation}</p>
    </div>
  );
}

interface ConsiderationListProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
  variant: "success" | "warning" | "destructive";
}

function ConsiderationList({ title, items, icon, variant }: ConsiderationListProps) {
  if (items.length === 0) return null;

  const colorClass = {
    success: "text-terminal",
    warning: "text-amber-500",
    destructive: "text-destructive",
  }[variant];

  return (
    <div className="space-y-2">
      <div className={cn("flex items-center gap-2", colorClass)}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ul className="space-y-1 pl-6">
        {items.map((item, idx) => (
          <li key={idx} className="text-muted-foreground list-disc text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ComparisonTableProps {
  factors: ComparisonFactor[];
}

function ComparisonTable({ factors }: ComparisonTableProps) {
  const getAdvantageIcon = (advantage: ComparisonFactor["advantage"]) => {
    switch (advantage) {
      case "startup":
        return <TrendingUp className="text-terminal h-4 w-4" />;
      case "current":
        return <TrendingDown className="h-4 w-4 text-amber-500" />;
      default:
        return <Minus className="text-muted-foreground h-4 w-4" />;
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-medium tracking-wide uppercase">Factor</TableHead>
            <TableHead className="text-center text-xs font-medium tracking-wide uppercase">
              Current Job
            </TableHead>
            <TableHead className="text-center text-xs font-medium tracking-wide uppercase">
              Startup
            </TableHead>
            <TableHead className="w-12 text-xs font-medium tracking-wide uppercase" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {factors.map((factor, idx) => (
            <TableRow key={idx} className="border-b last:border-b-0">
              <TableCell className="text-sm font-medium">{factor.factor}</TableCell>
              <TableCell
                className={cn(
                  "text-center text-sm",
                  factor.advantage === "current" && "text-terminal font-medium"
                )}
              >
                {factor.currentJob}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center text-sm",
                  factor.advantage === "startup" && "text-terminal font-medium"
                )}
              >
                {factor.startup}
              </TableCell>
              <TableCell className="text-center">{getAdvantageIcon(factor.advantage)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DecisionRecommendationDisplay({
  recommendation,
  inputs,
  onRedo,
  className,
}: DecisionRecommendationDisplayProps) {
  const comparisonFactors = generateComparisonTable(inputs);

  const recommendationBadgeVariant = () => {
    switch (recommendation.recommendation) {
      case "accept":
        return "default";
      case "lean_accept":
        return "secondary";
      case "neutral":
        return "outline";
      case "lean_reject":
        return "secondary";
      case "reject":
        return "destructive";
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Recommendation Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="text-primary h-5 w-5" />
              Your Personalized Recommendation
            </CardTitle>
            {onRedo && (
              <Button variant="ghost" size="sm" onClick={onRedo}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Redo
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Score and Recommendation */}
          <div className="space-y-4 text-center">
            <div>
              <p className="text-muted-foreground mb-2 text-sm">Overall Score</p>
              <div className="flex items-center justify-center gap-4">
                <div className="relative h-24 w-24">
                  <svg className="h-24 w-24 -rotate-90 transform">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(recommendation.overallScore / 10) * 251.2} 251.2`}
                      className={cn(
                        recommendation.overallScore >= 7
                          ? "text-terminal"
                          : recommendation.overallScore >= 5
                            ? "text-amber-500"
                            : "text-destructive"
                      )}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums">
                      {recommendation.overallScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Badge
              variant={recommendationBadgeVariant()}
              className={cn(
                "px-4 py-1.5 text-sm",
                recommendation.recommendation === "accept" && "bg-terminal hover:bg-terminal/90",
                recommendation.recommendation === "lean_accept" &&
                  "bg-lime-600 text-white hover:bg-lime-700"
              )}
            >
              {getRecommendationLabel(recommendation.recommendation)}
            </Badge>

            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              {recommendation.recommendationText}
            </p>
          </div>

          {/* Factor Scores */}
          <div className="border-border space-y-4 border-t pt-4">
            <h4 className="text-muted-foreground text-sm font-medium">Factor Breakdown</h4>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ScoreGauge {...recommendation.factorScores.financial} />
              <ScoreGauge {...recommendation.factorScores.risk} />
              <ScoreGauge {...recommendation.factorScores.career} />
              <ScoreGauge {...recommendation.factorScores.personal} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Considerations Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Key Considerations</CardTitle>
          <CardDescription>Factors to weigh in your final decision</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConsiderationList
            title="Pros"
            items={recommendation.considerations.pros}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant="success"
          />
          <ConsiderationList
            title="Cons"
            items={recommendation.considerations.cons}
            icon={<XCircle className="h-4 w-4" />}
            variant="destructive"
          />
          <ConsiderationList
            title="Warnings"
            items={recommendation.considerations.warnings}
            icon={<AlertTriangle className="h-4 w-4" />}
            variant="warning"
          />
        </CardContent>
      </Card>

      {/* Comparison Table Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Side-by-Side Comparison</CardTitle>
          <CardDescription>How the options stack up</CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonTable factors={comparisonFactors} />
        </CardContent>
      </Card>
    </div>
  );
}

export default DecisionRecommendationDisplay;
