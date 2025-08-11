import { FormData } from '../types/types';

export const initialFormData: FormData = {
  simulation_end_year: 5,
  current_job_monthly_salary: 5000,
  startup_monthly_salary: 4500,
  current_job_salary_growth_rate: 0.03,
  annual_roi: 0.07,
  investment_frequency: 'annually',
  equity_type: 'rsu',
  total_vesting_years: 4,
  cliff_years: 1,
  rsu: {
    rsu_grant_value: 100000,
    rsu_strike_price: 10,
  },
  options: {
    option_grant_shares: 20000,
    option_strike_price: 1,
    exit_share_price: 25,
  },
};
