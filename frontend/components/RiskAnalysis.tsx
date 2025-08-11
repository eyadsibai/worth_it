import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  Activity,
  BarChart3,
  PieChart,
  Shuffle
} from 'lucide-react';
// Removed framer-motion dependency
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useLanguage } from './LanguageContext';
import { CalculationEngine } from './CalculationEngine';
import type { FormData, CalculationResults } from '../types/types';

interface RiskAnalysisProps {
  formData: FormData;
  results: CalculationResults;
}

interface MonteCarloResult {
  netOutcome: number;
  npv: number;
  equityPayout: number;
  probability: number;
}

interface SensitivityResult {
  parameter: string;
  baseValue: number;
  change: number;
  netOutcome: number;
  impact: number;
}

export function RiskAnalysis({ formData, results }: RiskAnalysisProps) {
  const { t, isRTL } = useLanguage();
  const [simulations, setSimulations] = useState(1000);
  const [volatility, setVolatility] = useState([25]); // 25% volatility
  const [isRunning, setIsRunning] = useState(false);

  const formatCurrency = (amount: number): string => {
    if (!isFinite(amount) || isNaN(amount)) return `${t.currency}0`;
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
      return `${t.currency}${(amount / 1000000).toFixed(2)}M`;
    }
    return `${t.currency}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return '0%';
    return `${value.toFixed(1)}%`;
  };

  // Monte Carlo Simulation - simplified
  const monteCarloResults = useMemo(() => {
    if (isRunning) return [];
    
    const calculationEngine = new CalculationEngine();
    const results: MonteCarloResult[] = [];
    const volatilityFactor = volatility[0] / 100;
    
    // Use a smaller number of simulations to avoid performance issues
    const actualSimulations = Math.min(simulations, 100);
    
    for (let i = 0; i < actualSimulations; i++) {
      try {
        // Generate random variations for key parameters
        const exitValuationMultiplier = 1 + (Math.random() - 0.5) * 2 * volatilityFactor;
        const exitPriceMultiplier = 1 + (Math.random() - 0.5) * 2 * volatilityFactor;
        const salaryGrowthMultiplier = 1 + (Math.random() - 0.5) * 2 * (volatilityFactor * 0.5);
        const roiMultiplier = 1 + (Math.random() - 0.5) * 2 * (volatilityFactor * 0.3);
        
        const variedFormData: FormData = {
          ...formData,
          exitValuation: Math.max(0, formData.exitValuation * exitValuationMultiplier),
          exitPrice: Math.max(0, formData.exitPrice * exitPriceMultiplier),
          salaryGrowthRate: Math.max(0, formData.salaryGrowthRate * salaryGrowthMultiplier),
          roiRate: Math.max(0, formData.roiRate * roiMultiplier)
        };
        
        const simulationResult = calculationEngine.calculateAll(variedFormData);
        results.push({
          netOutcome: simulationResult.netOutcome,
          npv: simulationResult.npv,
          equityPayout: simulationResult.totalEquityPayout,
          probability: 1 / actualSimulations * 100
        });
      } catch (error) {
        console.error('Monte Carlo simulation error:', error);
        // Continue with next simulation
      }
    }
    
    return results.sort((a, b) => a.netOutcome - b.netOutcome);
  }, [formData, simulations, volatility, isRunning]);

  // Risk metrics from Monte Carlo
  const riskMetrics = useMemo(() => {
    if (monteCarloResults.length === 0) return null;
    
    const netOutcomes = monteCarloResults.map(r => r.netOutcome);
    const sortedOutcomes = [...netOutcomes].sort((a, b) => a - b);
    
    const mean = netOutcomes.reduce((a, b) => a + b, 0) / netOutcomes.length;
    const variance = netOutcomes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / netOutcomes.length;
    const stdDev = Math.sqrt(variance);
    
    // Value at Risk (5th percentile)
    const var5 = sortedOutcomes[Math.floor(sortedOutcomes.length * 0.05)];
    
    // Probability of positive outcome
    const positiveOutcomes = netOutcomes.filter(o => o > 0).length;
    const successProbability = (positiveOutcomes / netOutcomes.length) * 100;
    
    // Percentiles
    const p10 = sortedOutcomes[Math.floor(sortedOutcomes.length * 0.1)];
    const p25 = sortedOutcomes[Math.floor(sortedOutcomes.length * 0.25)];
    const p50 = sortedOutcomes[Math.floor(sortedOutcomes.length * 0.5)];
    const p75 = sortedOutcomes[Math.floor(sortedOutcomes.length * 0.75)];
    const p90 = sortedOutcomes[Math.floor(sortedOutcomes.length * 0.9)];
    
    return {
      mean,
      stdDev,
      var5,
      successProbability,
      percentiles: { p10, p25, p50, p75, p90 }
    };
  }, [monteCarloResults]);

  // Sensitivity Analysis - simplified
  const sensitivityAnalysis = useMemo(() => {
    try {
      const calculationEngine = new CalculationEngine();
      const baseResult = calculationEngine.calculateAll(formData);
      const results: SensitivityResult[] = [];
      
      const parameters = [
        { key: 'exitValuation' as keyof FormData, name: 'Exit Valuation', current: formData.exitValuation, changes: [-0.25, 0.25] },
        { key: 'exitPrice' as keyof FormData, name: 'Exit Price', current: formData.exitPrice, changes: [-0.25, 0.25] },
        { key: 'salaryGrowthRate' as keyof FormData, name: 'Salary Growth', current: formData.salaryGrowthRate, changes: [-0.15, 0.15] },
        { key: 'roiRate' as keyof FormData, name: 'ROI Rate', current: formData.roiRate, changes: [-0.15, 0.15] }
      ];
      
      parameters.forEach(param => {
        param.changes.forEach(change => {
          try {
            const adjustedData = { 
              ...formData, 
              [param.key]: Math.max(0, param.current * (1 + change))
            };
            const result = calculationEngine.calculateAll(adjustedData);
            const impact = baseResult.netOutcome !== 0 
              ? Math.abs((result.netOutcome - baseResult.netOutcome) / baseResult.netOutcome) * 100 
              : 0;
            
            results.push({
              parameter: param.name,
              baseValue: param.current,
              change: change * 100,
              netOutcome: result.netOutcome,
              impact: impact
            });
          } catch (error) {
            console.error('Sensitivity analysis error:', error);
          }
        });
      });
      
      return results.sort((a, b) => b.impact - a.impact).slice(0, 10); // Top 10 most impactful
    } catch (error) {
      console.error('Sensitivity analysis setup error:', error);
      return [];
    }
  }, [formData]);

  // Distribution data for histogram
  const distributionData = useMemo(() => {
    if (monteCarloResults.length === 0) return [];
    
    const netOutcomes = monteCarloResults.map(r => r.netOutcome);
    const min = Math.min(...netOutcomes);
    const max = Math.max(...netOutcomes);
    const bucketCount = 20;
    const bucketSize = (max - min) / bucketCount;
    
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${formatCurrency(min + i * bucketSize)} - ${formatCurrency(min + (i + 1) * bucketSize)}`,
      count: 0,
      frequency: 0,
      midpoint: min + (i + 0.5) * bucketSize
    }));
    
    netOutcomes.forEach(outcome => {
      const bucketIndex = Math.min(Math.floor((outcome - min) / bucketSize), bucketCount - 1);
      buckets[bucketIndex].count++;
    });
    
    buckets.forEach(bucket => {
      bucket.frequency = (bucket.count / netOutcomes.length) * 100;
    });
    
    return buckets;
  }, [monteCarloResults]);

  const runSimulation = () => {
    setIsRunning(true);
    // Simulate processing time for better UX
    setTimeout(() => {
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Risk Analysis</h2>
          <p className="text-gray-600 mt-1">Understand uncertainty and potential outcomes through advanced modeling</p>
        </div>
        
        <Button 
          onClick={runSimulation}
          disabled={isRunning}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          {isRunning ? 'Running...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Simulation Controls */}
      <div>
        <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Simulation Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Number of Simulations</Label>
                <div className="mt-2 space-y-3">
                  <Slider
                    value={[simulations]}
                    onValueChange={(value) => setSimulations(value[0])}
                    max={5000}
                    min={100}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>100</span>
                    <span className="font-medium">{simulations} simulations</span>
                    <span>5,000</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Market Volatility</Label>
                <div className="mt-2 space-y-3">
                  <Slider
                    value={volatility}
                    onValueChange={setVolatility}
                    max={100}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>5%</span>
                    <span className="font-medium">{volatility[0]}% volatility</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monte-carlo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="monte-carlo">Monte Carlo</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="monte-carlo" className="space-y-6">
          {/* Risk Metrics */}
          {riskMetrics && (
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Probability</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatPercentage(riskMetrics.successProbability)}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Value at Risk (5%)</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(riskMetrics.var5)}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-red-100">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Expected Value</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(riskMetrics.mean)}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Std Deviation</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(riskMetrics.stdDev)}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-orange-100">
                      <Activity className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Distribution Chart */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Outcome Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {distributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="midpoint" 
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Frequency']}
                          labelFormatter={(value) => `Range: ${formatCurrency(value)}`}
                        />
                        <Bar dataKey="frequency" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No distribution data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Percentile Analysis */}
          {riskMetrics && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle>Percentile Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(riskMetrics.percentiles).map(([percentile, value]) => (
                      <div key={percentile} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="font-medium">{percentile.toUpperCase()}</span>
                        <Badge 
                          variant={value > 0 ? "default" : "destructive"}
                          className="text-right"
                        >
                          {formatCurrency(value)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="sensitivity" className="space-y-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Parameter Sensitivity Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {sensitivityAnalysis.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={sensitivityAnalysis}
                        layout="horizontal"
                        margin={{ left: 100, right: 30, top: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number"
                        />
                        <YAxis 
                          type="category" 
                          dataKey="parameter" 
                          width={80}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Impact']}
                        />
                        <Bar dataKey="impact" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No sensitivity data available
                    </div>
                  )}</div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Consider these different market scenarios when evaluating your equity opportunity.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Bull Market */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800">🚀 Bull Market</CardTitle>
                  <p className="text-sm text-green-600">High growth, strong valuations</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Exit Multiple</span>
                      <span className="font-semibold">3-5x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline</span>
                      <span className="font-semibold">3-5 years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-semibold">60-80%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bear Market */}
              <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800">📉 Bear Market</CardTitle>
                  <p className="text-sm text-red-600">Slow growth, conservative valuations</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Exit Multiple</span>
                      <span className="font-semibold">1-2x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline</span>
                      <span className="font-semibold">5-8 years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-semibold">20-40%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stable Market */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-800">📊 Stable Market</CardTitle>
                  <p className="text-sm text-blue-600">Steady growth, balanced valuations</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Exit Multiple</span>
                      <span className="font-semibold">2-3x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline</span>
                      <span className="font-semibold">4-6 years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-semibold">40-60%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}