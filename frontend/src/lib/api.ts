const API_BASE_URL = '/api';

export interface CalculationRequest {
  exit_year: number;
  discount_rate: number;
  current_job: {
    monthly_salary: number;
    annual_growth_rate: number;
    invest_surplus: boolean;
    annual_roi: number;
    investment_frequency: 'Monthly' | 'Annually';
  };
  startup_offer: {
    monthly_salary: number;
    equity_type: 'RSU' | 'Stock Options';
    rsu?: {
      equity_percentage: number;
      target_exit_valuation: number;
      vesting_years: number;
      cliff_years: number;
      simulate_dilution: boolean;
      dilution?: {
        round_a: DilutionRound;
        round_b: DilutionRound;
        round_c: DilutionRound;
        round_d: DilutionRound;
      };
    };
    stock_options?: {
      num_options: number;
      strike_price: number;
      target_exit_price: number;
      vesting_years: number;
      cliff_years: number;
      exercise_strategy: 'At Exit' | 'After Vesting';
    };
  };
  monte_carlo?: {
    enabled: boolean;
    num_simulations: number;
    failure_probability: number;
    valuation_volatility: number;
    roi_volatility: number;
    salary_growth_volatility: number;
    simulate_exit_year: boolean;
  };
}

export interface DilutionRound {
  enabled: boolean;
  valuation?: number;
  new_investment?: number;
}

export interface CalculationResponse {
  metrics: {
    equity_payout: number;
    opportunity_cost: number;
    net_outcome: number;
    npv: number | null;
    irr: number | null;
    vested_percentage: number;
    diluted_equity_percentage: number | null;
  };
  breakeven: {
    breakeven_valuation: number | null;
    breakeven_price: number | null;
  };
  yearly_breakdown: Array<{
    year: number;
    current_job_salary: number;
    startup_salary: number;
    salary_difference: number;
    cumulative_investment: number;
    vested_equity_percentage: number;
  }>;
  monte_carlo?: {
    simulations: Array<{
      net_outcome: number;
      equity_payout: number;
      opportunity_cost: number;
      exit_valuation?: number;
      exit_price?: number;
    }>;
    mean_outcome: number;
    median_outcome: number;
    std_outcome: number;
    probability_positive: number;
    percentile_5: number;
    percentile_25: number;
    percentile_75: number;
    percentile_95: number;
  };
  sensitivity?: Array<{
    parameter_name: string;
    values: number[];
    outcomes: number[];
  }>;
}

export async function calculateWorthIt(
  request: CalculationRequest
): Promise<CalculationResponse> {
  const response = await fetch(`${API_BASE_URL}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Calculation failed');
  }

  return response.json();
}
