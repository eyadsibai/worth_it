"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCompact } from "@/lib/format-utils";

interface NegotiationRangeProps {
  floor: number;
  conservative: number;
  target: number;
  aggressive: number;
  ceiling: number;
}

/**
 * Negotiation range visualization for term sheet discussions.
 * Shows five valuation levels from floor (walk-away point) to ceiling (maximum ask),
 * with a highlighted zone between conservative and aggressive as the ideal range.
 */
export function NegotiationRange({
  floor,
  conservative,
  target,
  aggressive,
  ceiling,
}: NegotiationRangeProps) {
  const ranges = [
    { label: "Floor", value: floor, color: "bg-red-500", description: "Walk away below this" },
    {
      label: "Conservative",
      value: conservative,
      color: "bg-orange-500",
      description: "Defensible lower bound",
    },
    { label: "Target", value: target, color: "bg-green-500", description: "Ideal outcome" },
    { label: "Aggressive", value: aggressive, color: "bg-blue-500", description: "Stretch goal" },
    { label: "Ceiling", value: ceiling, color: "bg-purple-500", description: "Maximum ask" },
  ];

  const min = floor;
  const max = ceiling;
  const range = max - min;

  // Calculate position on the bar (0-100%)
  const getPosition = (value: number) => {
    if (range === 0) return 0;
    return ((value - min) / range) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Negotiation Range
          <Badge variant="secondary">Term Sheet Strategy</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual range bar */}
        <div className="bg-muted relative h-8 overflow-hidden rounded-lg">
          {ranges.map((r) => (
            <div
              key={r.label}
              className={`absolute top-0 h-full w-1 ${r.color}`}
              style={{ left: `${getPosition(r.value)}%` }}
            />
          ))}
          {/* Target zone highlight (conservative to aggressive) */}
          <div
            className="absolute top-0 h-full bg-green-500/20"
            style={{
              left: `${getPosition(conservative)}%`,
              width: `${getPosition(aggressive) - getPosition(conservative)}%`,
            }}
          />
        </div>

        {/* Legend */}
        <div className="grid gap-3">
          {ranges.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${r.color}`} />
                <div>
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground ml-2 text-sm">{r.description}</span>
                </div>
              </div>
              <span className="font-mono font-medium">{formatCurrencyCompact(r.value)}</span>
            </div>
          ))}
        </div>

        {/* Key insight / strategy recommendation */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            <strong>Strategy:</strong> Open at {formatCurrencyCompact(aggressive)}, aim for{" "}
            {formatCurrencyCompact(target)}, and accept down to{" "}
            {formatCurrencyCompact(conservative)}. Walk away below {formatCurrencyCompact(floor)}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
