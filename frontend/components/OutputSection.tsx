import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Progress } from './ui/progress';
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
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Trophy,
  AlertTriangle,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Activity
} from 'lucide-react';
// Removed framer-motion dependency
import { useLanguage } from './LanguageContext';
import type { CalculationResults, FormData } from '../types/types';

interface OutputSectionProps {
  results: CalculationResults;
  formData: FormData;
}

export function OutputSection({ results, formData }: OutputSectionProps) {
  const { t, isRTL } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (amount: number): string => {
    if (!isFinite(amount) || isNaN(amount)) {
      return `${t.currency}0`;
    }
    
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
      return `${t.currency}${(amount / 1000000).toFixed(2)}${t.million}`;
    }
    
    try {
      return `${t.currency}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } catch (e) {
      return `${t.currency}${Math.round(amount).toString()}`;
    }
  };

  const formatPercentage = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) {
      return `0${t.percentage}`;
    }
    return `${value.toFixed(2)}${t.percentage}`;
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    subtitle,
    gradient,
    delay = 0
  }: { 
    title: string; 
    value: string; 
    icon: React.ComponentType<any>; 
    trend?: 'positive' | 'negative' | 'neutral';
    subtitle?: string;
    gradient?: string;
    delay?: number;
  }) => (
    <div>
      <Card className={`bg-white/70 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 ${gradient ? `bg-gradient-to-br ${gradient}` : ''}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className={`text-3xl font-bold ${
                trend === 'positive' ? 'text-green-600' : 
                trend === 'negative' ? 'text-red-600' : 
                'text-gray-900'
              }`}>
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
              )}
            </div>
            <div className={`p-4 rounded-xl shadow-lg ${
              trend === 'positive' ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 
              trend === 'negative' ? 'bg-gradient-to-br from-red-400 to-rose-500' : 
              'bg-gradient-to-br from-blue-400 to-indigo-500'
            }`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const successProbability = results.netOutcome > 0 ? 85 : 35; // Mock probability for demo
  const riskLevel = results.netOutcome > results.totalOpportunityCost ? 'Low' : 
                   results.netOutcome > 0 ? 'Medium' : 'High';

  return (
    <div className="space-y-6">
      {/* Clear Win Alert */}
      {results.isClearWin && (
        <div>
          <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
            <Trophy className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              <strong>🎉 Excellent Opportunity!</strong> {t.clearWinMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Risk Warning */}
      {results.netOutcome < 0 && (
        <div>
          <Alert className="border-red-200 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">
              <strong>⚠️ High Risk Detected:</strong> Current projections show negative returns. Consider adjusting assumptions or seeking better terms.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Summary Metrics */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">{t.summaryMetrics}</h3>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Live Analysis
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title={t.equityPayout}
            value={formatCurrency(results.totalEquityPayout)}
            icon={DollarSign}
            trend="positive"
            subtitle="Total equity value at exit"
            delay={0.1}
          />
          
          <MetricCard
            title={t.opportunityCost}
            value={formatCurrency(results.totalOpportunityCost)}
            icon={TrendingDown}
            trend="negative"
            subtitle="Opportunity cost of joining"
            delay={0.2}
          />
          
          <MetricCard
            title={t.netOutcome}
            value={formatCurrency(results.netOutcome)}
            icon={results.netOutcome >= 0 ? Trophy : AlertTriangle}
            trend={results.netOutcome >= 0 ? 'positive' : 'negative'}
            subtitle={results.netOutcome >= 0 ? "Positive return expected" : "Consider risks carefully"}
            delay={0.3}
          />
          
          <MetricCard
            title={t.npv}
            value={formatCurrency(results.npv)}
            icon={Target}
            trend={results.npv >= 0 ? 'positive' : 'negative'}
            subtitle="Net present value"
            delay={0.4}
          />
        </div>

        {/* Risk Assessment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-600">Success Probability</p>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-2xl font-bold text-blue-600">{successProbability}%</span>
                  <Badge variant={successProbability > 70 ? "default" : successProbability > 40 ? "secondary" : "destructive"}>
                    {successProbability > 70 ? "High" : successProbability > 40 ? "Medium" : "Low"}
                  </Badge>
                </div>
                <Progress value={successProbability} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-600">Risk Level</p>
                <AlertCircle className={`w-5 h-5 ${riskLevel === 'Low' ? 'text-green-600' : riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div className="space-y-2">
                <Badge 
                  variant={riskLevel === 'Low' ? "default" : riskLevel === 'Medium' ? "secondary" : "destructive"}
                  className="text-lg px-3 py-1"
                >
                  {riskLevel} Risk
                </Badge>
                <p className="text-xs text-gray-500">
                  {riskLevel === 'Low' ? 'Conservative projection' : 
                   riskLevel === 'Medium' ? 'Moderate risk/reward' : 
                   'High uncertainty'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-600">Time to Breakeven</p>
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-2">
                <span className="text-2xl font-bold text-purple-600">
                  {results.yearlyData.find(y => y.cumulativeOpportunityCost >= results.totalEquityPayout)?.year || 'N/A'} years
                </span>
                <p className="text-xs text-gray-500">Estimated breakeven point</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.irr !== null && (
            <MetricCard
              title={t.irr}
              value={formatPercentage(results.irr)}
              icon={TrendingUp}
              trend={results.irr > formData.roiRate ? 'positive' : 'negative'}
              subtitle={`vs ${formData.roiRate}% market rate`}
              delay={0.7}
            />
          )}
          
          {formData.equityType === 'equity' && formData.simulateDilution && (
            <>
              <MetricCard
                title={t.initialGrant}
                value={formatPercentage(results.initialEquityPercentage)}
                icon={Target}
                trend="neutral"
                subtitle="Original equity grant"
                delay={0.8}
              />
              
              <MetricCard
                title={t.finalEquity}
                value={formatPercentage(results.finalEquityPercentage)}
                icon={Target}
                trend="neutral"
                subtitle={`${t.totalDilution}: ${formatPercentage(results.totalDilutionPercentage)}`}
                delay={0.9}
              />
            </>
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div>
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-between bg-white/70 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                <span>{t.detailedBreakdown}</span>
              </div>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-6 mt-6">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Data Table
              </TabsTrigger>
              <TabsTrigger value="opportunity" className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Opportunity Cost
              </TabsTrigger>
              <TabsTrigger value="breakeven" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Breakeven Analysis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="table" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Year-by-Year Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.year}</TableHead>
                          <TableHead className="text-right">
                            {results.yearlyData.length > 0 && (results.yearlyData[0].principalForgone || 0) >= 0 ? t.principalForgone : t.salaryGain}
                          </TableHead>
                          <TableHead className="text-right">{t.cumulativeOpportunityCost}</TableHead>
                          <TableHead className="text-right">{t.vestedEquity}</TableHead>
                          <TableHead className="text-right">{t.breakeven}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.yearlyData.length > 0 ? results.yearlyData.map((data) => (
                          <TableRow key={data.year}>
                            <TableCell>{data.year}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Math.abs(data.principalForgone || data.salaryGain || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(data.cumulativeOpportunityCost || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(data.vestedEquityPercentage || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formData.equityType === 'equity' 
                                ? formatCurrency(data.breakevenValuation || 0)
                                : `${t.currency}${(data.breakevenPrice || 0).toFixed(2)} ${t.perShare}`
                              }
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500">
                              No data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="opportunity" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    {t.opportunityCostGrowth}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    {results.opportunityCostBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={results.opportunityCostBreakdown}>
                          <defs>
                            <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="returnsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="year" />
                          <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value)]}
                            labelFormatter={(label) => `${t.year} ${label}`}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '8px', 
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="principal"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="url(#principalGradient)"
                            name={t.principal}
                          />
                          <Area
                            type="monotone"
                            dataKey="returns"
                            stackId="1"
                            stroke="#10b981"
                            fill="url(#returnsGradient)"
                            name={t.returns}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="breakeven" className="space-y-4">
              <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    {t.breakevenAnalysis}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {results.breakevenAnalysis.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={results.breakevenAnalysis}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis 
                            tickFormatter={(value: number) => 
                              formData.equityType === 'equity' 
                                ? `${t.currency}${value}${t.million}`
                                : `${t.currency}${value}`
                            }
                          />
                          <Tooltip 
                            formatter={(value: number) => [
                              formData.equityType === 'equity' 
                                ? `${formatCurrency(value * 1000000)}`
                                : `${t.currency}${(value || 0).toFixed(2)} ${t.perShare}`,
                              formData.equityType === 'equity' ? t.breakevenValue : t.breakevenPrice
                            ]}
                            labelFormatter={(label) => `${t.year} ${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#f59e0b" 
                            strokeWidth={3}
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
      </div>
    </div>
  );
}