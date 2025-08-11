import type { FormData, CalculationResults, YearlyData, DilutionEvent } from '../types/types';

export class CalculationEngine {
  calculateAll(formData: FormData): CalculationResults {
    // Validate input data
    const validatedFormData = this.validateFormData(formData);
    
    const yearlyData = this.calculateYearlyData(validatedFormData);
    const dilutionEvents = this.calculateDilution(validatedFormData);
    const equityPayout = this.calculateEquityPayout(validatedFormData, dilutionEvents);
    const totalOpportunityCost = yearlyData[yearlyData.length - 1]?.cumulativeOpportunityCost || 0;
    const netOutcome = equityPayout - totalOpportunityCost;
    const npv = this.calculateNPV(validatedFormData, netOutcome);
    const irr = this.calculateIRR(validatedFormData, yearlyData, equityPayout);
    const isClearWin = this.detectClearWin(validatedFormData);
    
    return {
      totalEquityPayout: equityPayout,
      totalOpportunityCost,
      netOutcome,
      npv,
      irr,
      initialEquityPercentage: validatedFormData.equityPercentage,
      totalDilutionPercentage: this.calculateTotalDilution(dilutionEvents),
      finalEquityPercentage: this.getFinalEquity(validatedFormData, dilutionEvents),
      dilutionEvents,
      isClearWin,
      yearlyData,
      opportunityCostBreakdown: this.calculateOpportunityCostBreakdown(yearlyData),
      breakevenAnalysis: this.calculateBreakevenAnalysis(validatedFormData, yearlyData)
    };
  }

  private calculateYearlyData(formData: FormData): YearlyData[] {
    const data: YearlyData[] = [];
    const dilutionEvents = this.calculateDilution(formData);
    
    for (let year = 1; year <= formData.simulationYears; year++) {
      const currentJobSalary = formData.currentSalary * Math.pow(1 + formData.salaryGrowthRate / 100, year - 1);
      const startupSalary = formData.startupSalary;
      const principalForgone = Math.max(0, (currentJobSalary - startupSalary) * 12);
      const salaryGain = Math.max(0, (startupSalary - currentJobSalary) * 12);
      
      // Calculate investment value
      let investmentValue = 0;
      const previousData = data[year - 2];
      const previousInvestment = previousData?.investmentValue || 0;
      const monthlyInvestment = principalForgone / 12;
      
      if (formData.investmentFrequency === 'monthly' && monthlyInvestment > 0) {
        // Monthly compounding formula
        const monthlyRate = formData.roiRate / 100 / 12;
        if (monthlyRate === 0) {
          investmentValue = previousInvestment + (monthlyInvestment * 12);
        } else {
          investmentValue = previousInvestment * Math.pow(1 + monthlyRate, 12) + 
            monthlyInvestment * (Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate;
        }
      } else if (formData.investmentFrequency === 'annually' && principalForgone > 0) {
        investmentValue = (previousInvestment + principalForgone) * (1 + formData.roiRate / 100);
      } else {
        investmentValue = previousInvestment * (1 + formData.roiRate / 100);
      }
      
      // Ensure the value is finite
      if (!isFinite(investmentValue)) {
        investmentValue = previousInvestment;
      }
      
      const cumulativeOpportunityCost = investmentValue;
      
      // Calculate vesting
      const vestedEquityPercentage = this.calculateVesting(year, formData.vestingPeriod, formData.cliffPeriod);
      
      // Apply dilution
      const equityAfterDilution = this.applyDilution(
        formData.equityPercentage, 
        dilutionEvents, 
        year
      );
      
      // Calculate breakeven
      let breakevenValuation: number | undefined;
      let breakevenPrice: number | undefined;
      
      if (formData.equityType === 'equity') {
        const equityFraction = (equityAfterDilution / 100) * (vestedEquityPercentage / 100);
        breakevenValuation = equityFraction > 0 ? cumulativeOpportunityCost / equityFraction : 0;
      } else {
        const vestedOptions = formData.stockOptions * (vestedEquityPercentage / 100);
        const netOptionsValue = vestedOptions > 0 ? cumulativeOpportunityCost / vestedOptions : 0;
        breakevenPrice = netOptionsValue + formData.strikePrice;
      }
      
      data.push({
        year,
        currentJobSalary: currentJobSalary * 12,
        startupSalary: startupSalary * 12,
        principalForgone,
        salaryGain,
        investmentValue,
        cumulativeOpportunityCost,
        vestedEquityPercentage,
        equityAfterDilution,
        breakevenValuation,
        breakevenPrice
      });
    }
    
    return data;
  }

  private calculateDilution(formData: FormData): DilutionEvent[] {
    if (!formData.simulateDilution || formData.equityType !== 'equity') {
      return [];
    }
    
    const events: DilutionEvent[] = [];
    let currentOwnership = formData.equityPercentage;
    
    // Sort rounds by year
    const sortedRounds = [...formData.fundraisingRounds].sort((a, b) => a.year - b.year);
    
    for (const round of sortedRounds) {
      let dilutionPercentage: number;
      
      if (round.dilutionType === 'direct') {
        dilutionPercentage = round.dilutionPercentage || 0;
      } else {
        // Calculate dilution from pre-money valuation and amount raised
        const premoneyVal = round.premoneyValuation || 0;
        const amountRaised = round.amountRaised || 0;
        const postmoneyValuation = premoneyVal + amountRaised;
        dilutionPercentage = postmoneyValuation > 0 ? (amountRaised / postmoneyValuation) * 100 : 0;
      }
      
      // Apply dilution
      currentOwnership = currentOwnership * (1 - dilutionPercentage / 100);
      
      events.push({
        year: round.year,
        dilutionPercentage,
        cumulativeOwnership: currentOwnership
      });
    }
    
    return events;
  }

  private calculateEquityPayout(formData: FormData, dilutionEvents: DilutionEvent[]): number {
    const vestedEquityPercentage = this.calculateVesting(
      formData.simulationYears, 
      formData.vestingPeriod, 
      formData.cliffPeriod
    );
    
    if (formData.equityType === 'equity') {
      const finalEquity = this.applyDilution(formData.equityPercentage, dilutionEvents, formData.simulationYears);
      return (formData.exitValuation * finalEquity / 100 * vestedEquityPercentage / 100);
    } else {
      const netGainPerOption = Math.max(0, formData.exitPrice - formData.strikePrice);
      return formData.stockOptions * netGainPerOption * vestedEquityPercentage / 100;
    }
  }

  private calculateVesting(currentYear: number, vestingPeriod: number, cliffPeriod: number): number {
    if (currentYear < cliffPeriod) return 0;
    if (currentYear >= vestingPeriod) return 100;
    return Math.min(100, (currentYear / vestingPeriod) * 100);
  }

  private applyDilution(initialEquity: number, dilutionEvents: DilutionEvent[], year: number): number {
    let currentEquity = initialEquity;
    
    for (const event of dilutionEvents) {
      if (event.year <= year) {
        currentEquity = event.cumulativeOwnership;
      }
    }
    
    return currentEquity;
  }

  private calculateNPV(formData: FormData, netOutcome: number): number {
    return netOutcome / Math.pow(1 + formData.roiRate / 100, formData.simulationYears);
  }

  private calculateIRR(formData: FormData, yearlyData: YearlyData[], equityPayout: number): number | null {
    // Simplified IRR calculation using Newton-Raphson method
    if (equityPayout <= 0) return null;
    
    let rate = 0.1; // Initial guess
    const tolerance = 1e-6;
    const maxIterations = 100;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = -equityPayout / Math.pow(1 + rate, formData.simulationYears);
      let derivative = equityPayout * formData.simulationYears / Math.pow(1 + rate, formData.simulationYears + 1);
      
      // Add cash flows for each year
      for (let year = 1; year <= formData.simulationYears; year++) {
        const yearData = yearlyData[year - 1];
        if (yearData && yearData.principalForgone > 0) {
          npv += yearData.principalForgone / Math.pow(1 + rate, year);
          derivative -= yearData.principalForgone * year / Math.pow(1 + rate, year + 1);
        }
      }
      
      if (Math.abs(npv) < tolerance) {
        return rate * 100;
      }
      
      if (Math.abs(derivative) < tolerance) {
        break;
      }
      
      rate = rate - npv / derivative;
      
      if (rate < -0.99 || rate > 10) { // Reasonable bounds
        break;
      }
    }
    
    return null;
  }

  private detectClearWin(formData: FormData): boolean {
    const totalCurrentJobSalary = this.calculateTotalSalary(
      formData.currentSalary, 
      formData.salaryGrowthRate, 
      formData.simulationYears
    );
    const totalStartupSalary = formData.startupSalary * 12 * formData.simulationYears;
    
    return totalStartupSalary > totalCurrentJobSalary;
  }

  private calculateTotalSalary(monthlySalary: number, growthRate: number, years: number): number {
    let total = 0;
    for (let year = 1; year <= years; year++) {
      const yearSalary = monthlySalary * 12 * Math.pow(1 + growthRate / 100, year - 1);
      total += yearSalary;
    }
    return total;
  }

  private calculateTotalDilution(dilutionEvents: DilutionEvent[]): number {
    if (dilutionEvents.length === 0) return 0;
    
    const finalOwnership = dilutionEvents[dilutionEvents.length - 1].cumulativeOwnership;
    const initialOwnership = dilutionEvents.length > 0 ? dilutionEvents[0].cumulativeOwnership : 100;
    return initialOwnership > 0 ? 100 - (finalOwnership / initialOwnership) * 100 : 0;
  }

  private getFinalEquity(formData: FormData, dilutionEvents: DilutionEvent[]): number {
    if (dilutionEvents.length === 0) return formData.equityPercentage;
    return dilutionEvents[dilutionEvents.length - 1].cumulativeOwnership;
  }

  private calculateOpportunityCostBreakdown(yearlyData: YearlyData[]) {
    let cumulativePrincipal = 0;
    
    return yearlyData.map(data => {
      const yearlyPrincipal = Math.abs(data.principalForgone || data.salaryGain || 0);
      cumulativePrincipal += yearlyPrincipal;
      const returns = Math.max(0, data.cumulativeOpportunityCost - cumulativePrincipal);
      
      return {
        year: data.year,
        principal: cumulativePrincipal,
        returns: returns,
        total: data.cumulativeOpportunityCost
      };
    });
  }

  private calculateBreakevenAnalysis(formData: FormData, yearlyData: YearlyData[]) {
    return yearlyData.map(data => ({
      year: data.year,
      value: formData.equityType === 'equity' 
        ? (data.breakevenValuation || 0) / 1000000 // Convert to millions
        : data.breakevenPrice || 0,
      label: formData.equityType === 'equity' ? 'Valuation (M)' : 'Share Price'
    }));
  }

  private validateFormData(formData: FormData): FormData {
    return {
      ...formData,
      simulationYears: Math.max(1, Math.min(20, formData.simulationYears || 5)),
      currentSalary: Math.max(0, formData.currentSalary || 0),
      startupSalary: Math.max(0, formData.startupSalary || 0),
      salaryGrowthRate: Math.max(0, formData.salaryGrowthRate || 0),
      roiRate: Math.max(0, formData.roiRate || 0),
      vestingPeriod: Math.max(1, formData.vestingPeriod || 4),
      cliffPeriod: Math.max(0, Math.min(formData.vestingPeriod || 4, formData.cliffPeriod || 0)),
      equityPercentage: Math.max(0, Math.min(100, formData.equityPercentage || 0)),
      exitValuation: Math.max(0, formData.exitValuation || 0),
      stockOptions: Math.max(0, formData.stockOptions || 0),
      strikePrice: Math.max(0, formData.strikePrice || 0),
      exitPrice: Math.max(0, formData.exitPrice || 0)
    };
  }
}