/**
 * API Client for Worth It backend
 * Provides type-safe API calls using axios and TanStack Query hooks
 */

import axios, { AxiosInstance } from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MonthlyDataGridRequest,
  MonthlyDataGridResponse,
  OpportunityCostRequest,
  OpportunityCostResponse,
  StartupScenarioRequest,
  StartupScenarioResponse,
  IRRRequest,
  IRRResponse,
  NPVRequest,
  NPVResponse,
  MonteCarloRequest,
  MonteCarloResponse,
  SensitivityAnalysisRequest,
  SensitivityAnalysisResponse,
  DilutionFromValuationRequest,
  DilutionFromValuationResponse,
  HealthCheckResponse,
  WSMessage,
  CapTableConversionRequest,
  CapTableConversionResponse,
  WaterfallRequest,
  WaterfallResponse,
  DilutionPreviewRequest,
  DilutionPreviewResponse,
  ScenarioComparisonRequest,
  ScenarioComparisonResponse,
  RevenueMultipleRequest,
  DCFRequest,
  VCMethodRequest,
  ValuationResult,
  ValuationCompareRequest,
  ValuationCompareResponse,
} from "./schemas";

// ============================================================================
// WebSocket URL Helper
// ============================================================================

/**
 * Generates the appropriate WebSocket URL based on the current protocol.
 * - Uses wss:// for HTTPS pages (secure WebSocket)
 * - Uses ws:// for HTTP pages (insecure WebSocket)
 * - Falls back to ws://localhost:8000 during SSR or when window is unavailable
 *
 * Note: Port override only applies to "localhost" hostname, not 127.0.0.1 or IPv6.
 * For other local addresses, use the NEXT_PUBLIC_WS_URL environment variable.
 *
 * @param protocol - The page protocol (e.g., "https:", "http:")
 * @param host - The page host (e.g., "localhost:3000", "example.com")
 * @param backendPort - Optional port override for localhost development (e.g., 8000)
 * @returns The WebSocket URL with appropriate protocol
 */
export function getWebSocketURL(
  protocol: string,
  host: string,
  backendPort?: number
): string {
  // Environment variable takes precedence
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // SSR fallback - no window available
  if (!protocol || !host) {
    return "ws://localhost:8000";
  }

  // Determine WebSocket protocol based on page protocol
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

  // For local development, allow overriding the port (frontend on :3000, backend on :8000)
  // Use precise check to avoid matching hosts like "mylocalhost.com"
  if (backendPort && (host === "localhost" || host.startsWith("localhost:"))) {
    return `${wsProtocol}//localhost:${backendPort}`;
  }

  return `${wsProtocol}//${host}`;
}

// ============================================================================
// API Client Class
// ============================================================================

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private wsURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Detect protocol for WebSocket URL
    // In browser: use window.location to determine http/https
    // In SSR: fall back to localhost
    if (typeof window !== "undefined") {
      this.wsURL = getWebSocketURL(
        window.location.protocol,
        window.location.host,
        8000 // Backend port for local development
      );
    } else {
      this.wsURL = getWebSocketURL("", "");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          throw new Error(error.response.data?.detail || error.message);
        } else if (error.request) {
          // Request made but no response
          throw new Error("No response from server. Please check your connection.");
        } else {
          // Error in request setup
          throw new Error(error.message);
        }
      }
    );
  }

  // Health Check
  async healthCheck(): Promise<HealthCheckResponse> {
    const { data } = await this.client.get<HealthCheckResponse>("/health");
    return data;
  }

  // Monthly Data Grid
  async createMonthlyDataGrid(
    request: MonthlyDataGridRequest,
    signal?: AbortSignal
  ): Promise<MonthlyDataGridResponse> {
    const { data } = await this.client.post<MonthlyDataGridResponse>(
      "/api/monthly-data-grid",
      request,
      { signal }
    );
    return data;
  }

  // Opportunity Cost
  async calculateOpportunityCost(
    request: OpportunityCostRequest,
    signal?: AbortSignal
  ): Promise<OpportunityCostResponse> {
    const { data } = await this.client.post<OpportunityCostResponse>(
      "/api/opportunity-cost",
      request,
      { signal }
    );
    return data;
  }

  // Startup Scenario
  async calculateStartupScenario(
    request: StartupScenarioRequest,
    signal?: AbortSignal
  ): Promise<StartupScenarioResponse> {
    const { data } = await this.client.post<StartupScenarioResponse>(
      "/api/startup-scenario",
      request,
      { signal }
    );
    return data;
  }

  // IRR
  async calculateIRR(request: IRRRequest): Promise<IRRResponse> {
    const { data } = await this.client.post<IRRResponse>("/api/irr", request);
    return data;
  }

  // NPV
  async calculateNPV(request: NPVRequest): Promise<NPVResponse> {
    const { data } = await this.client.post<NPVResponse>("/api/npv", request);
    return data;
  }

  // Monte Carlo (REST)
  async runMonteCarlo(request: MonteCarloRequest): Promise<MonteCarloResponse> {
    const { data } = await this.client.post<MonteCarloResponse>(
      "/api/monte-carlo",
      request
    );
    return data;
  }

  // Sensitivity Analysis
  async runSensitivityAnalysis(
    request: SensitivityAnalysisRequest,
    signal?: AbortSignal
  ): Promise<SensitivityAnalysisResponse> {
    const { data } = await this.client.post<SensitivityAnalysisResponse>(
      "/api/sensitivity-analysis",
      request,
      { signal }
    );
    return data;
  }

  // Dilution Calculation
  async calculateDilution(
    request: DilutionFromValuationRequest
  ): Promise<DilutionFromValuationResponse> {
    const { data } = await this.client.post<DilutionFromValuationResponse>(
      "/api/dilution",
      request
    );
    return data;
  }

  // Cap Table Conversion (SAFE/Convertible Note → Equity)
  async convertInstruments(
    request: CapTableConversionRequest
  ): Promise<CapTableConversionResponse> {
    const { data } = await this.client.post<CapTableConversionResponse>(
      "/api/cap-table/convert",
      request
    );
    return data;
  }

  // Waterfall Analysis (Exit Proceeds Distribution)
  async calculateWaterfall(
    request: WaterfallRequest
  ): Promise<WaterfallResponse> {
    const { data } = await this.client.post<WaterfallResponse>(
      "/api/waterfall",
      request
    );
    return data;
  }

  // Dilution Preview (Funding Round Impact)
  async getDilutionPreview(
    request: DilutionPreviewRequest
  ): Promise<DilutionPreviewResponse> {
    const { data } = await this.client.post<DilutionPreviewResponse>(
      "/api/dilution/preview",
      request
    );
    return data;
  }

  // Scenario Comparison
  async compareScenarios(
    request: ScenarioComparisonRequest,
    signal?: AbortSignal
  ): Promise<ScenarioComparisonResponse> {
    const { data } = await this.client.post<ScenarioComparisonResponse>(
      "/api/scenarios/compare",
      request,
      { signal }
    );
    return data;
  }

  // ============================================================================
  // Valuation Calculator Methods
  // ============================================================================

  // Revenue Multiple Valuation
  async calculateRevenueMultiple(
    request: RevenueMultipleRequest
  ): Promise<ValuationResult> {
    const { data } = await this.client.post<ValuationResult>(
      "/api/valuation/revenue-multiple",
      request
    );
    return data;
  }

  // DCF (Discounted Cash Flow) Valuation
  async calculateDCF(request: DCFRequest): Promise<ValuationResult> {
    const { data } = await this.client.post<ValuationResult>(
      "/api/valuation/dcf",
      request
    );
    return data;
  }

  // VC Method Valuation
  async calculateVCMethod(request: VCMethodRequest): Promise<ValuationResult> {
    const { data } = await this.client.post<ValuationResult>(
      "/api/valuation/vc-method",
      request
    );
    return data;
  }

  // Compare Multiple Valuation Methods
  async compareValuations(
    request: ValuationCompareRequest
  ): Promise<ValuationCompareResponse> {
    const { data } = await this.client.post<ValuationCompareResponse>(
      "/api/valuation/compare",
      request
    );
    return data;
  }

  // WebSocket URL for Monte Carlo
  getMonteCarloWebSocketURL(): string {
    return `${this.wsURL}/ws/monte-carlo`;
  }
}

// Singleton instance
export const apiClient = new APIClient();

// ============================================================================
// React Query Hooks
// ============================================================================

// Health Check
export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.healthCheck(),
    staleTime: 60000, // 1 minute
  });
}

// Monthly Data Grid
export function useCreateMonthlyDataGrid() {
  return useMutation({
    mutationFn: (request: MonthlyDataGridRequest) =>
      apiClient.createMonthlyDataGrid(request),
  });
}

// Opportunity Cost
export function useCalculateOpportunityCost() {
  return useMutation({
    mutationFn: (request: OpportunityCostRequest) =>
      apiClient.calculateOpportunityCost(request),
  });
}

// Startup Scenario
export function useCalculateStartupScenario() {
  return useMutation({
    mutationFn: (request: StartupScenarioRequest) =>
      apiClient.calculateStartupScenario(request),
  });
}

// IRR
export function useCalculateIRR() {
  return useMutation({
    mutationFn: (request: IRRRequest) => apiClient.calculateIRR(request),
  });
}

// NPV
export function useCalculateNPV() {
  return useMutation({
    mutationFn: (request: NPVRequest) => apiClient.calculateNPV(request),
  });
}

// Monte Carlo (REST)
export function useRunMonteCarlo() {
  return useMutation({
    mutationFn: (request: MonteCarloRequest) => apiClient.runMonteCarlo(request),
  });
}

// Sensitivity Analysis
export function useRunSensitivityAnalysis() {
  return useMutation({
    mutationFn: (request: SensitivityAnalysisRequest) =>
      apiClient.runSensitivityAnalysis(request),
  });
}

// Dilution Calculation
export function useCalculateDilution() {
  return useMutation({
    mutationFn: (request: DilutionFromValuationRequest) =>
      apiClient.calculateDilution(request),
  });
}

// Cap Table Conversion (SAFE/Convertible Note → Equity)
export function useConvertInstruments() {
  return useMutation({
    mutationFn: (request: CapTableConversionRequest) =>
      apiClient.convertInstruments(request),
  });
}

// Waterfall Analysis (Exit Proceeds Distribution)
export function useCalculateWaterfall() {
  return useMutation({
    mutationFn: (request: WaterfallRequest) =>
      apiClient.calculateWaterfall(request),
  });
}

// Dilution Preview (Funding Round Impact)
export function useGetDilutionPreview() {
  return useMutation({
    mutationFn: (request: DilutionPreviewRequest) =>
      apiClient.getDilutionPreview(request),
  });
}

// Scenario Comparison
export function useCompareScenarios() {
  return useMutation({
    mutationFn: (request: ScenarioComparisonRequest) =>
      apiClient.compareScenarios(request),
  });
}

// ============================================================================
// Valuation Calculator Hooks
// ============================================================================

// Revenue Multiple Valuation
export function useCalculateRevenueMultiple() {
  return useMutation({
    mutationFn: (request: RevenueMultipleRequest) =>
      apiClient.calculateRevenueMultiple(request),
  });
}

// DCF (Discounted Cash Flow) Valuation
export function useCalculateDCF() {
  return useMutation({
    mutationFn: (request: DCFRequest) => apiClient.calculateDCF(request),
  });
}

// VC Method Valuation
export function useCalculateVCMethod() {
  return useMutation({
    mutationFn: (request: VCMethodRequest) =>
      apiClient.calculateVCMethod(request),
  });
}

// Compare Multiple Valuation Methods
export function useCompareValuations() {
  return useMutation({
    mutationFn: (request: ValuationCompareRequest) =>
      apiClient.compareValuations(request),
  });
}

// ============================================================================
// WebSocket Hook for Monte Carlo with Progress
// ============================================================================

export interface MonteCarloProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface MonteCarloWSResult {
  isConnected: boolean;
  isRunning: boolean;
  progress: MonteCarloProgress | null;
  result: MonteCarloResponse | null;
  error: string | null;
  runSimulation: (request: MonteCarloRequest) => void;
  cancel: () => void;
}

export function useMonteCarloWebSocket(): MonteCarloWSResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MonteCarloProgress | null>(null);
  const [result, setResult] = useState<MonteCarloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Refs to track current state values for use in WebSocket event handlers
  // This prevents stale closure issues where handlers capture outdated state
  const isRunningRef = useRef(isRunning);
  const resultRef = useRef(result);
  const errorRef = useRef(error);

  // Keep refs in sync with state
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const cancel = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsRunning(false);
    setProgress(null);
    setError(null);
  }, []);

  const runSimulation = useCallback((request: MonteCarloRequest) => {
    // Reset state
    setProgress(null);
    setResult(null);
    setError(null);
    setIsRunning(true);

    // Create WebSocket connection
    const ws = new WebSocket(apiClient.getMonteCarloWebSocketURL());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send request
      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case "progress":
            setProgress({
              current: message.current,
              total: message.total,
              percentage: message.percentage,
            });
            break;

          case "complete":
            setResult({
              net_outcomes: message.net_outcomes,
              simulated_valuations: message.simulated_valuations,
            });
            setIsRunning(false);
            setIsConnected(false);
            ws.close();
            break;

          case "error":
            setError(message.message);
            setIsRunning(false);
            setIsConnected(false);
            ws.close();
            break;
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.error("Invalid JSON from server:", event.data);
          setError("Server sent invalid response format");
        } else {
          console.error("Error processing message:", e);
          setError("Failed to process server message");
        }
        // Don't close connection on parse error - server may recover
        // Only mark as not running to allow retry
        setIsRunning(false);
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("Connection error - please try again");
      setIsRunning(false);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Use refs to access current state values, avoiding stale closure issues
      if (isRunningRef.current && !resultRef.current && !errorRef.current) {
        setError("Connection closed unexpectedly");
        setIsRunning(false);
      }
    };
  }, []); // Empty deps - callback is now stable since we use refs for state access

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    isRunning,
    progress,
    result,
    error,
    runSimulation,
    cancel,
  };
}

// ============================================================================
// Cancellable Mutation Hooks (Race Condition Safe)
// ============================================================================
// These hooks automatically cancel previous in-flight requests when a new
// mutation is triggered, preventing stale responses from overwriting newer ones.

import { useCancellableMutation, isAbortError } from "./hooks/use-cancellable-mutation";
export { isAbortError };

/**
 * Cancellable version of useCreateMonthlyDataGrid
 * Automatically cancels previous requests when form inputs change rapidly
 */
export function useCancellableMonthlyDataGrid() {
  return useCancellableMutation({
    mutationFn: (request: MonthlyDataGridRequest, signal: AbortSignal) =>
      apiClient.createMonthlyDataGrid(request, signal),
  });
}

/**
 * Cancellable version of useCalculateOpportunityCost
 * Automatically cancels previous requests when form inputs change rapidly
 */
export function useCancellableOpportunityCost() {
  return useCancellableMutation({
    mutationFn: (request: OpportunityCostRequest, signal: AbortSignal) =>
      apiClient.calculateOpportunityCost(request, signal),
  });
}

/**
 * Cancellable version of useCalculateStartupScenario
 * Automatically cancels previous requests when form inputs change rapidly
 */
export function useCancellableStartupScenario() {
  return useCancellableMutation({
    mutationFn: (request: StartupScenarioRequest, signal: AbortSignal) =>
      apiClient.calculateStartupScenario(request, signal),
  });
}

/**
 * Cancellable version of useRunSensitivityAnalysis
 * Automatically cancels previous requests when parameters change rapidly
 */
export function useCancellableSensitivityAnalysis() {
  return useCancellableMutation({
    mutationFn: (request: SensitivityAnalysisRequest, signal: AbortSignal) =>
      apiClient.runSensitivityAnalysis(request, signal),
  });
}

/**
 * Cancellable version of useCompareScenarios
 * Automatically cancels previous requests when comparison parameters change
 */
export function useCancellableCompareScenarios() {
  return useCancellableMutation({
    mutationFn: (request: ScenarioComparisonRequest, signal: AbortSignal) =>
      apiClient.compareScenarios(request, signal),
  });
}
