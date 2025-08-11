export interface FundraisingRound {
  id: string;
  year: number;
  dilutionType: 'direct' | 'valuation';
  dilutionPercentage?: number;
  premoneyValuation?: number;
  amountRaised?: number;
}

export interface FormData {
  // Global
  simulationYears: number;
  
  // Current Job
  currentSalary: number;
  salaryGrowthRate: number;
  roiRate: number;
  investmentFrequency: 'monthly' | 'annually';
  
  // Startup Offer
  startupSalary: number;
  equityType: 'equity' | 'options';
  vestingPeriod: number;
  cliffPeriod: number;
  
  // Equity (RSUs)
  equityPercentage: number;
  exitValuation: number;
  simulateDilution: boolean;
  fundraisingRounds: FundraisingRound[];
  
  // Stock Options
  stockOptions: number;
  strikePrice: number;
  exitPrice: number;
  
  // Optional name for scenarios
  name?: string;
}

export interface YearlyData {
  year: number;
  currentJobSalary: number;
  startupSalary: number;
  principalForgone: number;
  salaryGain: number;
  investmentValue: number;
  cumulativeOpportunityCost: number;
  vestedEquityPercentage: number;
  equityAfterDilution: number;
  breakevenValuation?: number;
  breakevenPrice?: number;
}

export interface DilutionEvent {
  year: number;
  dilutionPercentage: number;
  cumulativeOwnership: number;
}

export interface CalculationResults {
  // Summary metrics
  totalEquityPayout: number;
  totalOpportunityCost: number;
  netOutcome: number;
  npv: number;
  irr: number | null;
  
  // Dilution info (for RSUs)
  initialEquityPercentage: number;
  totalDilutionPercentage: number;
  finalEquityPercentage: number;
  dilutionEvents: DilutionEvent[];
  
  // Clear win detection
  isClearWin: boolean;
  
  // Yearly breakdown
  yearlyData: YearlyData[];
  
  // Chart data
  opportunityCostBreakdown: Array<{
    year: number;
    principal: number;
    returns: number;
    total: number;
  }>;
  
  breakevenAnalysis: Array<{
    year: number;
    value: number;
    label: string;
  }>;
}

export interface ChartDataPoint {
  year: number;
  [key: string]: number;
}