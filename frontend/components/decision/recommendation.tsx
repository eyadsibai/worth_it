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
import {
  generateComparisonTable,
  getRecommendationLabel,
} from "@/lib/decision-framework";

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
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{explanation}</p>
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
          <li key={idx} className="text-sm text-muted-foreground list-disc">
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
        return <TrendingUp className="h-4 w-4 text-terminal" />;
      case "current":
        return <TrendingDown className="h-4 w-4 text-amber-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs uppercase tracking-wide font-medium">Factor</TableHead>
            <TableHead className="text-xs uppercase tracking-wide font-medium text-center">
              Current Job
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wide font-medium text-center">
              Startup
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wide font-medium w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {factors.map((factor, idx) => (
            <TableRow key={idx} className="border-b last:border-b-0">
              <TableCell className="text-sm font-medium">{factor.factor}</TableCell>
              <TableCell
                className={cn(
                  "text-sm text-center",
                  factor.advantage === "current" && "text-terminal font-medium"
                )}
              >
                {factor.currentJob}
              </TableCell>
              <TableCell
                className={cn(
                  "text-sm text-center",
                  factor.advantage === "startup" && "text-terminal font-medium"
                )}
              >
                {factor.startup}
              </TableCell>
              <TableCell className="text-center">
                {getAdvantageIcon(factor.advantage)}
              </TableCell>
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
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Personalized Recommendation
            </CardTitle>
            {onRedo && (
              <Button variant="ghost" size="sm" onClick={onRedo}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Redo
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Score and Recommendation */}
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
              <div className="flex items-center justify-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
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
                "text-sm px-4 py-1.5",
                recommendation.recommendation === "accept" && "bg-terminal hover:bg-terminal/90",
                recommendation.recommendation === "lean_accept" && "bg-lime-600 hover:bg-lime-700 text-white"
              )}
            >
              {getRecommendationLabel(recommendation.recommendation)}
            </Badge>

            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {recommendation.recommendationText}
            </p>
          </div>

          {/* Factor Scores */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Factor Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
