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
} from "./schemas";

// ============================================================================
// API Client Class
// ============================================================================

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private wsURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    this.wsURL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

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
    request: MonthlyDataGridRequest
  ): Promise<MonthlyDataGridResponse> {
    const { data } = await this.client.post<MonthlyDataGridResponse>(
      "/api/monthly-data-grid",
      request
    );
    return data;
  }

  // Opportunity Cost
  async calculateOpportunityCost(
    request: OpportunityCostRequest
  ): Promise<OpportunityCostResponse> {
    const { data } = await this.client.post<OpportunityCostResponse>(
      "/api/opportunity-cost",
      request
    );
    return data;
  }

  // Startup Scenario
  async calculateStartupScenario(
    request: StartupScenarioRequest
  ): Promise<StartupScenarioResponse> {
    const { data } = await this.client.post<StartupScenarioResponse>(
      "/api/startup-scenario",
      request
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
    request: SensitivityAnalysisRequest
  ): Promise<SensitivityAnalysisResponse> {
    const { data } = await this.client.post<SensitivityAnalysisResponse>(
      "/api/sensitivity-analysis",
      request
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
      } catch {
        setError("Failed to parse server message");
        setIsRunning(false);
        setIsConnected(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
      setIsRunning(false);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (isRunning && !result && !error) {
        setError("Connection closed unexpectedly");
        setIsRunning(false);
      }
    };
  }, [isRunning, result, error]);

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
