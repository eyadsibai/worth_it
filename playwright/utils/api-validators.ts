/**
 * API Response Validators
 *
 * Helper utilities for validating API responses in E2E tests.
 * These validators ensure API responses match expected schemas
 * and contain valid data.
 */

/**
 * Validates a health check response
 */
export function validateHealthResponse(data: unknown): asserts data is { status: string; timestamp: string } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Health response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (typeof response.status !== 'string') {
    throw new Error('Health response must have a string status field');
  }

  if (typeof response.timestamp !== 'string') {
    throw new Error('Health response must have a string timestamp field');
  }
}

/**
 * Validates a monthly data grid response
 */
export function validateMonthlyDataGridResponse(
  data: unknown
): asserts data is { data: Array<Record<string, unknown>> } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Monthly data grid response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.data)) {
    throw new Error('Monthly data grid response must have a data array');
  }

  if (response.data.length === 0) {
    throw new Error('Monthly data grid response data array must not be empty');
  }

  // Validate first row has expected columns
  const firstRow = response.data[0] as Record<string, unknown>;
  const requiredColumns = ['Month', 'Current Job Salary', 'Startup Salary'];

  for (const col of requiredColumns) {
    if (!(col in firstRow)) {
      throw new Error(`Monthly data grid response missing required column: ${col}`);
    }
  }
}

/**
 * Validates a startup scenario response
 */
export function validateStartupScenarioResponse(
  data: unknown
): asserts data is {
  results_df: Array<Record<string, unknown>>;
  final_payout_value: number;
  final_opportunity_cost: number;
  payout_label: string;
  breakeven_label: string;
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Startup scenario response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.results_df)) {
    throw new Error('Startup scenario response must have a results_df array');
  }

  if (typeof response.final_payout_value !== 'number') {
    throw new Error('Startup scenario response must have a numeric final_payout_value');
  }

  if (typeof response.final_opportunity_cost !== 'number') {
    throw new Error('Startup scenario response must have a numeric final_opportunity_cost');
  }

  if (typeof response.payout_label !== 'string') {
    throw new Error('Startup scenario response must have a string payout_label');
  }

  if (typeof response.breakeven_label !== 'string') {
    throw new Error('Startup scenario response must have a string breakeven_label');
  }
}

/**
 * Validates an IRR response
 */
export function validateIRRResponse(
  data: unknown
): asserts data is { monthly_irr: number; annual_irr: number } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('IRR response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (typeof response.monthly_irr !== 'number') {
    throw new Error('IRR response must have a numeric monthly_irr');
  }

  if (typeof response.annual_irr !== 'number') {
    throw new Error('IRR response must have a numeric annual_irr');
  }
}

/**
 * Validates an NPV response
 */
export function validateNPVResponse(data: unknown): asserts data is { npv: number } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('NPV response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (typeof response.npv !== 'number') {
    throw new Error('NPV response must have a numeric npv');
  }
}

/**
 * Validates a dilution response
 */
export function validateDilutionResponse(
  data: unknown
): asserts data is { dilution: number; post_money_valuation: number } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Dilution response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (typeof response.dilution !== 'number') {
    throw new Error('Dilution response must have a numeric dilution');
  }

  if (typeof response.post_money_valuation !== 'number') {
    throw new Error('Dilution response must have a numeric post_money_valuation');
  }
}

/**
 * Validates a waterfall response
 */
export function validateWaterfallResponse(
  data: unknown
): asserts data is {
  payouts: Array<{ name: string; total_payout: number }>;
  steps: Array<{ step: number; description: string }>;
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Waterfall response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.payouts)) {
    throw new Error('Waterfall response must have a payouts array');
  }

  if (!Array.isArray(response.steps)) {
    throw new Error('Waterfall response must have a steps array');
  }
}

/**
 * Validates a Monte Carlo response (REST endpoint)
 */
export function validateMonteCarloResponse(
  data: unknown
): asserts data is { net_outcomes: number[]; simulated_valuations: number[] } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Monte Carlo response must be an object');
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.net_outcomes)) {
    throw new Error('Monte Carlo response must have a net_outcomes array');
  }

  if (!Array.isArray(response.simulated_valuations)) {
    throw new Error('Monte Carlo response must have a simulated_valuations array');
  }
}

/**
 * Validates a WebSocket Monte Carlo message
 */
export function validateWebSocketMessage(
  data: unknown
): asserts data is
  | { type: 'progress'; current: number; total: number; percentage: number }
  | { type: 'complete'; net_outcomes: number[]; simulated_valuations: number[] }
  | { type: 'error'; message: string } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('WebSocket message must be an object');
  }

  const message = data as Record<string, unknown>;

  if (typeof message.type !== 'string') {
    throw new Error('WebSocket message must have a string type');
  }

  switch (message.type) {
    case 'progress':
      if (typeof message.current !== 'number' || typeof message.total !== 'number') {
        throw new Error('Progress message must have numeric current and total');
      }
      break;
    case 'complete':
      if (!Array.isArray(message.net_outcomes) || !Array.isArray(message.simulated_valuations)) {
        throw new Error('Complete message must have net_outcomes and simulated_valuations arrays');
      }
      break;
    case 'error':
      if (typeof message.message !== 'string') {
        throw new Error('Error message must have a string message');
      }
      break;
    default:
      throw new Error(`Unknown WebSocket message type: ${message.type}`);
  }
}
