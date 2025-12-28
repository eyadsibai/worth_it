"use client";

import * as React from "react";
import type { MonteCarloResultData } from "@/components/valuation/monte-carlo-results";
import type { DistributionValue } from "@/components/valuation/distribution-input";

interface ValuationMonteCarloConfig {
  method: string;
  distributions: Array<{
    name: string;
    distribution_type: string;
    params: Record<string, number>;
  }>;
  n_simulations: number;
  batch_size?: number;
}

interface UseValuationMonteCarloOptions {
  onComplete?: (result: MonteCarloResultData) => void;
  onError?: (error: string) => void;
}

interface UseValuationMonteCarloReturn {
  isRunning: boolean;
  progress: number;
  result: MonteCarloResultData | null;
  error: string | null;
  runSimulation: (config: ValuationMonteCarloConfig) => void;
  reset: () => void;
}

/**
 * Hook for running valuation Monte Carlo simulations via WebSocket.
 *
 * Connects to the `/ws/valuation-monte-carlo` endpoint and streams
 * progress updates as the simulation runs.
 *
 * @example
 * ```tsx
 * const { isRunning, progress, result, runSimulation } = useValuationMonteCarlo();
 *
 * const handleRun = () => {
 *   runSimulation({
 *     method: "first_chicago",
 *     distributions: [...],
 *     n_simulations: 10000,
 *   });
 * };
 * ```
 */
export function useValuationMonteCarlo(
  options: UseValuationMonteCarloOptions = {}
): UseValuationMonteCarloReturn {
  const { onComplete, onError } = options;

  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<MonteCarloResultData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);
  // Use ref to track running state to avoid stale closure in onclose
  const isRunningRef = React.useRef(false);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const reset = React.useCallback(() => {
    setIsRunning(false);
    setProgress(0);
    setResult(null);
    setError(null);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const runSimulation = React.useCallback(
    (config: ValuationMonteCarloConfig) => {
      // Reset state
      setIsRunning(true);
      isRunningRef.current = true;
      setProgress(0);
      setResult(null);
      setError(null);

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create WebSocket connection
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws/valuation-monte-carlo";

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send configuration
        ws.send(
          JSON.stringify({
            method: config.method,
            distributions: config.distributions,
            n_simulations: config.n_simulations,
            batch_size: config.batch_size || 1000,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "progress") {
            setProgress(data.progress);
          } else if (data.type === "complete") {
            setResult(data.result);
            setIsRunning(false);
            isRunningRef.current = false;
            setProgress(1);
            onComplete?.(data.result);
          } else if (data.type === "error") {
            const errorMessage = data.message || "Simulation failed";
            setError(errorMessage);
            setIsRunning(false);
            isRunningRef.current = false;
            onError?.(errorMessage);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error");
        setIsRunning(false);
        isRunningRef.current = false;
        onError?.("Connection error");
      };

      ws.onclose = () => {
        // Use ref to check running state to avoid stale closure
        if (isRunningRef.current) {
          // Unexpected close while running
          setIsRunning(false);
          isRunningRef.current = false;
        }
        wsRef.current = null;
      };
    },
    [onComplete, onError]
  );

  return {
    isRunning,
    progress,
    result,
    error,
    runSimulation,
    reset,
  };
}

/**
 * Convert frontend distribution values to API format.
 */
export function distributionsToApiFormat(
  distributions: Record<string, DistributionValue>
): Array<{ name: string; distribution_type: string; params: Record<string, number> }> {
  return Object.entries(distributions).map(([name, value]) => ({
    name,
    distribution_type: value.type,
    params: value.params,
  }));
}
