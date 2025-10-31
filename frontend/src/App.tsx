import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calculateWorthIt, type CalculationRequest, type CalculationResponse } from '@/lib/api'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Target, Calculator, AlertCircle } from 'lucide-react'
import Plot from 'react-plotly.js'

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CalculationResponse | null>(null)

  // Form state
  const [exitYear, setExitYear] = useState(4)
  const [discountRate, setDiscountRate] = useState(10)

  // Current job
  const [currentSalary, setCurrentSalary] = useState(20000)
  const [salaryGrowth, setSalaryGrowth] = useState(5)
  const [investSurplus, setInvestSurplus] = useState(true)
  const [annualROI, setAnnualROI] = useState(8)

  // Startup offer
  const [startupSalary, setStartupSalary] = useState(15000)
  const [equityType, setEquityType] = useState<'RSU' | 'Stock Options'>('RSU')

  // RSU fields
  const [equityPercentage, setEquityPercentage] = useState(0.5)
  const [exitValuation, setExitValuation] = useState(1000000000)
  const [vestingYears, setVestingYears] = useState(4)
  const [cliffYears, setCliffYears] = useState(1)

  // Stock Options fields
  const [numOptions, setNumOptions] = useState(10000)
  const [strikePrice, setStrikePrice] = useState(1)
  const [exitPrice, setExitPrice] = useState(100)

  // Monte Carlo
  const [enableMonteCarlo, setEnableMonteCarlo] = useState(false)
  const [numSimulations, setNumSimulations] = useState(10000)
  const [failureProbability, setFailureProbability] = useState(0.7)

  const handleCalculate = async () => {
    setLoading(true)
    setError(null)

    try {
      const request: CalculationRequest = {
        exit_year: exitYear,
        discount_rate: discountRate,
        current_job: {
          monthly_salary: currentSalary,
          annual_growth_rate: salaryGrowth,
          invest_surplus: investSurplus,
          annual_roi: annualROI,
          investment_frequency: 'Monthly',
        },
        startup_offer: {
          monthly_salary: startupSalary,
          equity_type: equityType,
          ...(equityType === 'RSU'
            ? {
                rsu: {
                  equity_percentage: equityPercentage,
                  target_exit_valuation: exitValuation,
                  vesting_years: vestingYears,
                  cliff_years: cliffYears,
                  simulate_dilution: false,
                },
              }
            : {
                stock_options: {
                  num_options: numOptions,
                  strike_price: strikePrice,
                  target_exit_price: exitPrice,
                  vesting_years: vestingYears,
                  cliff_years: cliffYears,
                  exercise_strategy: 'At Exit',
                },
              }),
        },
        ...(enableMonteCarlo
          ? {
              monte_carlo: {
                enabled: true,
                num_simulations: numSimulations,
                failure_probability: failureProbability,
                valuation_volatility: 0.3,
                roi_volatility: 0.1,
                salary_growth_volatility: 0.05,
                simulate_exit_year: false,
              },
            }
          : {}),
      }

      const response = await calculateWorthIt(request)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isPositive = result && result.metrics.net_outcome > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">Worth It?</h1>
          <p className="text-lg text-slate-600">
            Is that startup offer really worth it? Let's find out.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Panel - Input Form */}
          <div className="space-y-6">
            {/* Global Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Settings</CardTitle>
                <CardDescription>Configure the timeframe and assumptions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="exit-year">Exit Year (Years from now)</Label>
                  <Input
                    id="exit-year"
                    type="number"
                    min="1"
                    max="20"
                    value={exitYear}
                    onChange={(e) => setExitYear(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="discount-rate">Discount Rate (%)</Label>
                  <Input
                    id="discount-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Job */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Current Job</CardTitle>
                <CardDescription>Details about your current position</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-salary">Monthly Salary (SAR)</Label>
                  <Input
                    id="current-salary"
                    type="number"
                    min="0"
                    value={currentSalary}
                    onChange={(e) => setCurrentSalary(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="salary-growth">Annual Salary Growth (%)</Label>
                  <Input
                    id="salary-growth"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={salaryGrowth}
                    onChange={(e) => setSalaryGrowth(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="invest-surplus"
                    checked={investSurplus}
                    onChange={(e) => setInvestSurplus(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="invest-surplus" className="font-normal">
                    Invest salary surplus
                  </Label>
                </div>
                {investSurplus && (
                  <div>
                    <Label htmlFor="annual-roi">Expected Annual ROI (%)</Label>
                    <Input
                      id="annual-roi"
                      type="number"
                      min="-100"
                      max="100"
                      step="0.1"
                      value={annualROI}
                      onChange={(e) => setAnnualROI(Number(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Startup Offer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Startup Offer</CardTitle>
                <CardDescription>Details about the new opportunity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="startup-salary">Monthly Salary (SAR)</Label>
                  <Input
                    id="startup-salary"
                    type="number"
                    min="0"
                    value={startupSalary}
                    onChange={(e) => setStartupSalary(Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="equity-type">Equity Type</Label>
                  <select
                    id="equity-type"
                    value={equityType}
                    onChange={(e) => setEquityType(e.target.value as 'RSU' | 'Stock Options')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RSU">RSU (Restricted Stock Units)</option>
                    <option value="Stock Options">Stock Options</option>
                  </select>
                </div>

                {equityType === 'RSU' ? (
                  <>
                    <div>
                      <Label htmlFor="equity-percentage">Equity Percentage (%)</Label>
                      <Input
                        id="equity-percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={equityPercentage}
                        onChange={(e) => setEquityPercentage(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exit-valuation">Target Exit Valuation (SAR)</Label>
                      <Input
                        id="exit-valuation"
                        type="number"
                        min="0"
                        value={exitValuation}
                        onChange={(e) => setExitValuation(Number(e.target.value))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="num-options">Number of Options</Label>
                      <Input
                        id="num-options"
                        type="number"
                        min="0"
                        value={numOptions}
                        onChange={(e) => setNumOptions(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="strike-price">Strike Price (SAR per share)</Label>
                      <Input
                        id="strike-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={strikePrice}
                        onChange={(e) => setStrikePrice(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exit-price">Target Exit Price (SAR per share)</Label>
                      <Input
                        id="exit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={exitPrice}
                        onChange={(e) => setExitPrice(Number(e.target.value))}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="vesting-years">Vesting Period (Years)</Label>
                  <Input
                    id="vesting-years"
                    type="number"
                    min="1"
                    max="10"
                    value={vestingYears}
                    onChange={(e) => setVestingYears(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="cliff-years">Cliff Period (Years)</Label>
                  <Input
                    id="cliff-years"
                    type="number"
                    min="0"
                    max="5"
                    value={cliffYears}
                    onChange={(e) => setCliffYears(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Monte Carlo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monte Carlo Simulation</CardTitle>
                <CardDescription>Optional probabilistic analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable-mc"
                    checked={enableMonteCarlo}
                    onChange={(e) => setEnableMonteCarlo(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="enable-mc" className="font-normal">
                    Enable Monte Carlo simulation
                  </Label>
                </div>

                {enableMonteCarlo && (
                  <>
                    <div>
                      <Label htmlFor="num-sims">Number of Simulations</Label>
                      <Input
                        id="num-sims"
                        type="number"
                        min="100"
                        max="100000"
                        value={numSimulations}
                        onChange={(e) => setNumSimulations(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="failure-prob">Startup Failure Probability</Label>
                      <Input
                        id="failure-prob"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={failureProbability}
                        onChange={(e) => setFailureProbability(Number(e.target.value))}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Button onClick={handleCalculate} disabled={loading} className="w-full" size="lg">
              {loading ? 'Calculating...' : 'Calculate Worth'}
              <Calculator className="ml-2 h-5 w-5" />
            </Button>

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Key Metrics */}
                <Card className={isPositive ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {isPositive ? (
                        <>
                          <TrendingUp className="h-6 w-6 text-green-600" />
                          <span className="text-green-900">Worth It! 🎉</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-6 w-6 text-red-600" />
                          <span className="text-red-900">Not Quite Worth It</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className={isPositive ? 'text-green-700' : 'text-red-700'}>
                      {isPositive
                        ? 'The startup offer has positive net value'
                        : 'You might be better off staying in your current job'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-slate-600">Net Outcome</div>
                        <div className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(result.metrics.net_outcome)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-600">Equity Payout</div>
                          <div className="text-xl font-semibold text-slate-900">
                            {formatCurrency(result.metrics.equity_payout)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-600">Opportunity Cost</div>
                          <div className="text-xl font-semibold text-slate-900">
                            {formatCurrency(result.metrics.opportunity_cost)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.metrics.npv !== null && (
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm font-medium">Net Present Value (NPV)</span>
                          <span className="text-sm font-semibold">{formatCurrency(result.metrics.npv)}</span>
                        </div>
                      )}
                      {result.metrics.irr !== null && (
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm font-medium">Internal Rate of Return (IRR)</span>
                          <span className="text-sm font-semibold">{formatPercent(result.metrics.irr)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-sm font-medium">Vested Equity</span>
                        <span className="text-sm font-semibold">{formatPercent(result.metrics.vested_percentage)}</span>
                      </div>
                      {result.metrics.diluted_equity_percentage !== null && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Post-Dilution Equity</span>
                          <span className="text-sm font-semibold">
                            {formatPercent(result.metrics.diluted_equity_percentage)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Breakeven Analysis */}
                {(result.breakeven.breakeven_valuation || result.breakeven.breakeven_price) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5" />
                        Breakeven Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.breakeven.breakeven_valuation && (
                          <div>
                            <div className="text-sm font-medium text-slate-600">Required Exit Valuation</div>
                            <div className="text-xl font-semibold text-slate-900">
                              {formatCurrency(result.breakeven.breakeven_valuation)}
                            </div>
                          </div>
                        )}
                        {result.breakeven.breakeven_price && (
                          <div>
                            <div className="text-sm font-medium text-slate-600">Required Exit Price per Share</div>
                            <div className="text-xl font-semibold text-slate-900">
                              {formatCurrency(result.breakeven.breakeven_price)}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Monte Carlo Results */}
                {result.monte_carlo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Monte Carlo Simulation Results</CardTitle>
                      <CardDescription>
                        Based on {formatNumber(result.monte_carlo.simulations.length)} simulations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium text-slate-600">Mean Outcome</div>
                            <div className="text-lg font-semibold">{formatCurrency(result.monte_carlo.mean_outcome)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-600">Median Outcome</div>
                            <div className="text-lg font-semibold">{formatCurrency(result.monte_carlo.median_outcome)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-600">Probability of Gain</div>
                            <div className="text-lg font-semibold">
                              {formatPercent(result.monte_carlo.probability_positive * 100)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-600">Standard Deviation</div>
                            <div className="text-lg font-semibold">{formatCurrency(result.monte_carlo.std_outcome)}</div>
                          </div>
                        </div>

                        {/* Histogram */}
                        <div className="mt-4">
                          <Plot
                            data={[
                              {
                                x: result.monte_carlo.simulations.map((s) => s.net_outcome),
                                type: 'histogram',
                                marker: { color: '#3b82f6' },
                                nbinsx: 50,
                              },
                            ]}
                            layout={{
                              title: 'Distribution of Outcomes',
                              xaxis: { title: 'Net Outcome (SAR)' },
                              yaxis: { title: 'Frequency' },
                              height: 300,
                              margin: { l: 50, r: 30, t: 50, b: 50 },
                            }}
                            config={{ responsive: true }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Yearly Breakdown Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Yearly Financial Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Plot
                      data={[
                        {
                          x: result.yearly_breakdown.map((y) => `Year ${y.year}`),
                          y: result.yearly_breakdown.map((y) => y.current_job_salary),
                          name: 'Current Job',
                          type: 'bar',
                          marker: { color: '#10b981' },
                        },
                        {
                          x: result.yearly_breakdown.map((y) => `Year ${y.year}`),
                          y: result.yearly_breakdown.map((y) => y.startup_salary),
                          name: 'Startup',
                          type: 'bar',
                          marker: { color: '#3b82f6' },
                        },
                      ]}
                      layout={{
                        title: 'Annual Salary Comparison',
                        xaxis: { title: 'Year' },
                        yaxis: { title: 'Annual Salary (SAR)' },
                        barmode: 'group',
                        height: 300,
                        margin: { l: 60, r: 30, t: 50, b: 50 },
                      }}
                      config={{ responsive: true }}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-full">
                <CardContent className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <DollarSign className="mx-auto mb-4 h-16 w-16 opacity-20" />
                    <p className="text-lg">Enter your details and click Calculate to see the results</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
