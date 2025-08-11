import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Plus, 
  Copy, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  BarChart3,
  Edit3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { useLanguage } from './LanguageContext';
import type { FormData, CalculationResults } from '../types/types';

interface ScenarioComparisonProps {
  currentScenario: FormData;
  scenarios: FormData[];
  setScenarios: (scenarios: FormData[]) => void;
  results: CalculationResults;
  scenarioResults: CalculationResults[];
}

export function ScenarioComparison({ 
  currentScenario, 
  scenarios, 
  setScenarios, 
  results, 
  scenarioResults 
}: ScenarioComparisonProps) {
  const { t, isRTL } = useLanguage();
  const [editingScenario, setEditingScenario] = useState<FormData | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    return `${value.toFixed(2)}%`;
  };

  const addScenario = (data: FormData, name: string) => {
    const newScenario: FormData = { 
      ...data, 
      name: name || `Scenario ${scenarios.length + 1}` 
    };
    setScenarios([...scenarios, newScenario]);
    setIsDialogOpen(false);
    setScenarioName('');
  };

  const removeScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
  };

  const duplicateScenario = (scenario: FormData, index: number) => {
    const duplicated: FormData = { 
      ...scenario, 
      name: `${scenario.name || `Scenario ${index + 1}`} (Copy)` 
    };
    setScenarios([...scenarios, duplicated]);
  };

  // Prepare comparison data for charts
  const comparisonData = [
    {
      name: 'Current',
      netOutcome: results.netOutcome,
      equityPayout: results.totalEquityPayout,
      opportunityCost: results.totalOpportunityCost,
      npv: results.npv
    },
    ...scenarioResults.map((result, index) => ({
      name: scenarios[index].name || `Scenario ${index + 1}`,
      netOutcome: result.netOutcome,
      equityPayout: result.totalEquityPayout,
      opportunityCost: result.totalOpportunityCost,
      npv: result.npv
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header with Add Scenario Button */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scenario Comparison</h2>
          <p className="text-gray-600 mt-1">Compare multiple job offers and equity scenarios side-by-side</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-4 h-4" />
              Add Scenario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="scenarioName">Scenario Name</Label>
                <Input
                  id="scenarioName"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g., Tech Startup, Series A Company..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => addScenario(currentScenario, scenarioName)}
                  className="flex-1"
                  disabled={!scenarioName.trim()}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Current
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Scenarios Overview */}
      {scenarios.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Scenarios Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {/* Current Scenario Card */}
                <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-blue-900">Current Scenario</h3>
                      <p className="text-sm text-blue-700">Base calculation</p>
                    </div>
                    <Badge variant="default" className="bg-blue-600">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600 font-medium">Net Outcome</p>
                      <p className={`font-bold ${results.netOutcome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.netOutcome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Equity Payout</p>
                      <p className="font-bold text-gray-900">{formatCurrency(results.totalEquityPayout)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">NPV</p>
                      <p className={`font-bold ${results.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.npv)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">IRR</p>
                      <p className="font-bold text-gray-900">
                        {results.irr !== null ? formatPercentage(results.irr) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Other Scenarios */}
                {scenarios.map((scenario, index) => {
                  const result = scenarioResults[index];
                  return (
                    <motion.div
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * (index + 1) }}
                      className="p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {scenario.name || `Scenario ${index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {scenario.equityType === 'equity' ? 'Equity Grant' : 'Stock Options'} • 
                            {scenario.simulationYears} years
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateScenario(scenario, index)}
                            className="p-2"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScenario(index)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium">Net Outcome</p>
                          <p className={`font-bold ${result.netOutcome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(result.netOutcome)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Equity Payout</p>
                          <p className="font-bold text-gray-900">{formatCurrency(result.totalEquityPayout)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">NPV</p>
                          <p className={`font-bold ${result.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(result.npv)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">IRR</p>
                          <p className="font-bold text-gray-900">
                            {result.irr !== null ? formatPercentage(result.irr) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Comparison Charts */}
      {scenarios.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Net Outcome Comparison */}
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Net Outcome Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Net Outcome']}
                      />
                      <Bar dataKey="netOutcome" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data to compare
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NPV Comparison */}
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                NPV Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'NPV']}
                      />
                      <Bar dataKey="npv" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data to compare
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Multi-metric Comparison */}
          <Card className="md:col-span-2 bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                Multi-Metric Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="netOutcome" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Net Outcome"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="equityPayout" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name="Equity Payout"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="npv" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        name="NPV"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data to compare
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {scenarios.length === 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center py-12"
        >
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="pt-12 pb-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No scenarios to compare yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Add multiple job offer scenarios to compare them side-by-side with advanced analytics and visualizations.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Scenario
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}