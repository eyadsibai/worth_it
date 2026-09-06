import { toDilutionRoundWires } from "@/lib/hooks/use-scenario-calculation";
import {
  buildSimParamConfigs,
  deriveExitPriceSeed,
  scenarioExitPriceOf,
  type MonteCarloForm,
} from "@/components/forms/monte-carlo-form";
import type {
  GlobalSettingsForm,
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
  TypedBaseParams,
  MonteCarloRequest,
} from "@/lib/schemas";

/** Percentage-to-fraction divisor for the job's growth rate and ROI inputs, matching the backend's fraction scale. */
const PCT_DIVISOR = 100;
/**
 * Held fixed for every on-demand run: the landing has no UI for the
 * startup's own failure odds, so this mirrors the default the sidebar
 * Monte Carlo form's caller has always used
 * (`components/dashboard/employee-dashboard.tsx`).
 */
const DEFAULT_FAILURE_PROBABILITY = 0.6;
/** Numpy draws seeds from a 32-bit space (2**32 - 1); matches the backend's own `MAX_SEED` in `worth_it/models.py`. */
const SEED_MAX = 4_294_967_295;

/**
 * Assembles the typed `base_params` payload shared by the Monte Carlo and
 * sensitivity endpoints from the landing's own offer/job state.
 *
 * This is the SAME shape `EmployeeDashboard` has always built inline for its
 * sidebar Monte Carlo form; it now lives here so both callers share one
 * definition instead of drifting apart.
 */
export function buildTypedBaseParams(
  globalSettings: GlobalSettingsForm,
  currentJob: CurrentJobForm,
  equityDetails: RSUForm | StockOptionsForm
): TypedBaseParams {
  return {
    exit_year: globalSettings.exit_year,
    current_job_monthly_salary: currentJob.monthly_salary,
    startup_monthly_salary: equityDetails.monthly_salary,
    current_job_salary_growth_rate: currentJob.annual_salary_growth_rate / PCT_DIVISOR,
    annual_roi: currentJob.assumed_annual_roi / PCT_DIVISOR,
    investment_frequency: currentJob.investment_frequency,
    failure_probability: DEFAULT_FAILURE_PROBABILITY,
    startup_params:
      equityDetails.equity_type === "RSU"
        ? {
            equity_type: "RSU",
            monthly_salary: equityDetails.monthly_salary,
            total_equity_grant_pct: equityDetails.total_equity_grant_pct,
            vesting_period: equityDetails.vesting_period,
            cliff_period: equityDetails.cliff_period,
            exit_valuation: equityDetails.exit_valuation,
            simulate_dilution: equityDetails.simulate_dilution,
            dilution_rounds: equityDetails.simulate_dilution
              ? toDilutionRoundWires(equityDetails.dilution_rounds)
              : null,
          }
        : {
            equity_type: "STOCK_OPTIONS",
            monthly_salary: equityDetails.monthly_salary,
            num_options: equityDetails.num_options,
            strike_price: equityDetails.strike_price,
            vesting_period: equityDetails.vesting_period,
            cliff_period: equityDetails.cliff_period,
            exit_price_per_share: equityDetails.exit_price_per_share,
            exercise_strategy: equityDetails.exercise_strategy ?? "AT_EXIT",
            exercise_year: equityDetails.exercise_year ?? null,
          },
  };
}

export interface BuildMonteCarloRequestInput {
  globalSettings: GlobalSettingsForm;
  currentJob: CurrentJobForm;
  equityDetails: RSUForm | StockOptionsForm;
  numSimulations: number;
  /** Omitted (or `null`) lets the backend generate one, matching the sidebar form's own default. */
  seed?: number | null;
}

/**
 * Assembles a full on-demand Monte Carlo request from the landing's own
 * offer/job state, without the detailed distribution sliders the sidebar
 * form exposes. Every variable besides the exit price stays fixed — matching
 * `MonteCarloFormComponent`'s own defaults, where `growth_rate_enabled` and
 * friends all start `false` — while the exit price (or valuation) is
 * centered on the offer's own assumption via the SAME `deriveExitPriceSeed`
 * the sidebar form seeds its sliders from, then handed to the SAME
 * `buildSimParamConfigs` that turns it into the wire format. Both are
 * reused, not re-implemented, so the two request builders can't drift.
 */
export function buildMonteCarloRequest(input: BuildMonteCarloRequestInput): MonteCarloRequest {
  const { globalSettings, currentJob, equityDetails, numSimulations, seed } = input;
  const base_params = buildTypedBaseParams(globalSettings, currentJob, equityDetails);
  const exitPriceSeed = deriveExitPriceSeed(
    equityDetails.equity_type,
    scenarioExitPriceOf(base_params.startup_params)
  );

  // Only the exit price/valuation varies; every other distribution stays
  // disabled, so its numeric fields are inert placeholders never read by
  // `buildSimParamConfigs` (see that function's `if (data.*_enabled)` guards).
  const formValues: MonteCarloForm = {
    // Also inert here: `buildSimParamConfigs` never reads `num_simulations`
    // at all — the real count goes out on the returned request below.
    num_simulations: numSimulations,
    ...exitPriceSeed,
    growth_rate_enabled: false,
    growth_rate_min: 0,
    growth_rate_mode: 0,
    growth_rate_max: 0,
    roi_enabled: false,
    roi_mean: 0,
    roi_std: 0,
    exit_year_enabled: false,
    exit_year_min: 0,
    exit_year_mode: 0,
    exit_year_max: 0,
    dilution_enabled: false,
    dilution_min: 0,
    dilution_mode: 0,
    dilution_max: 0,
  };
  const sim_param_configs = buildSimParamConfigs(equityDetails.equity_type, formValues);

  return {
    num_simulations: numSimulations,
    base_params,
    sim_param_configs,
    ...(seed !== null && seed !== undefined ? { seed } : {}),
  };
}

/** Draws a fresh seed for the "re-roll" action, in the same 32-bit space the backend accepts. */
export function rollSeed(): number {
  return Math.floor(Math.random() * (SEED_MAX + 1));
}
