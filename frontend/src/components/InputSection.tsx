import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Plus, Trash2, Settings, TrendingUp, Briefcase, Zap, DollarSign, Clock, Percent, Building2, Users, Target } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import type { FormData, FundraisingRound } from '../types/types';

interface InputSectionProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
}

export function InputSection({ formData, setFormData }: InputSectionProps) {
  const { t, isRTL } = useLanguage();

  const updateFormData = (key: keyof FormData, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const addFundraisingRound = () => {
    const newRound: FundraisingRound = {
      id: Math.random().toString(36).substring(2, 11),
      year: Math.min(formData.simulationYears, 3),
      dilutionType: 'direct',
      dilutionPercentage: 10
    };
    updateFormData('fundraisingRounds', [...formData.fundraisingRounds, newRound]);
  };

  const updateFundraisingRound = (id: string, updates: Partial<FundraisingRound>) => {
    const rounds = formData.fundraisingRounds.map(round =>
      round.id === id ? { ...round, ...updates } : round
    );
    updateFormData('fundraisingRounds', rounds);
  };

  const removeFundraisingRound = (id: string) => {
    const rounds = formData.fundraisingRounds.filter(round => round.id !== id);
    updateFormData('fundraisingRounds', rounds);
  };

  return (
    <div className="space-y-6">
      {/* Global Controls */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-blue-100">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            {t.simulationPeriod}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="simulationYears" className="text-sm font-medium text-gray-700">
              {t.simulationPeriod}
            </Label>
            <div className="mt-3">
              <Slider
                value={[formData.simulationYears]}
                onValueChange={(value) => updateFormData('simulationYears', value[0])}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>1 {t.years}</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {formData.simulationYears} {t.years}
                </Badge>
                <span>20 {t.years}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Job Scenario */}
      <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-green-100">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            {t.currentJob}
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
              Current
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentSalary" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="w-4 h-4" />
              {t.currentSalary}
            </Label>
            <Input
              id="currentSalary"
              type="number"
              value={formData.currentSalary}
              onChange={(e) => updateFormData('currentSalary', Number(e.target.value))}
              className="mt-2 bg-white/70"
              placeholder="e.g., 120000"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salaryGrowthRate" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <TrendingUp className="w-4 h-4" />
                {t.salaryGrowthRate}
              </Label>
              <div className="relative mt-2">
                <Input
                  id="salaryGrowthRate"
                  type="number"
                  step="0.1"
                  value={formData.salaryGrowthRate}
                  onChange={(e) => updateFormData('salaryGrowthRate', Number(e.target.value))}
                  className="pr-8 bg-white/70"
                />
                <Percent className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="roiRate" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <TrendingUp className="w-4 h-4" />
                {t.roiRate}
              </Label>
              <div className="relative mt-2">
                <Input
                  id="roiRate"
                  type="number"
                  step="0.1"
                  value={formData.roiRate}
                  onChange={(e) => updateFormData('roiRate', Number(e.target.value))}
                  className="pr-8 bg-white/70"
                />
                <Percent className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="investmentFrequency" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4" />
              {t.investmentFrequency}
            </Label>
            <Select
              value={formData.investmentFrequency}
              onValueChange={(value) => updateFormData('investmentFrequency', value)}
            >
              <SelectTrigger className="mt-2 bg-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t.monthly}</SelectItem>
                <SelectItem value="annually">{t.annually}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Startup Offer Scenario */}
      <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-purple-100">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            {t.startupOffer}
            <Badge variant="outline" className="ml-auto bg-purple-50 text-purple-700 border-purple-200">
              New Offer
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="startupSalary" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="w-4 h-4" />
              {t.startupSalary}
            </Label>
            <Input
              id="startupSalary"
              type="number"
              value={formData.startupSalary}
              onChange={(e) => updateFormData('startupSalary', Number(e.target.value))}
              className="mt-2 bg-white/70"
              placeholder="e.g., 90000"
            />
          </div>
          
          <div>
            <Label htmlFor="equityType" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building2 className="w-4 h-4" />
              {t.equityType}
            </Label>
            <Select
              value={formData.equityType}
              onValueChange={(value) => updateFormData('equityType', value)}
            >
              <SelectTrigger className="mt-2 bg-white/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equity">{t.equity}</SelectItem>
                <SelectItem value="options">{t.stockOptions}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vestingPeriod" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4" />
                {t.vestingPeriod}
              </Label>
              <div className="relative mt-2">
                <Input
                  id="vestingPeriod"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.vestingPeriod}
                  onChange={(e) => updateFormData('vestingPeriod', Number(e.target.value))}
                  className="pr-12 bg-white/70"
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  years
                </span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="cliffPeriod" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4" />
                {t.cliffPeriod}
              </Label>
              <div className="relative mt-2">
                <Input
                  id="cliffPeriod"
                  type="number"
                  min="0"
                  max={formData.vestingPeriod}
                  value={formData.cliffPeriod}
                  onChange={(e) => updateFormData('cliffPeriod', Math.min(Number(e.target.value), formData.vestingPeriod))}
                  className="pr-12 bg-white/70"
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  years
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Inputs */}
      {formData.equityType === 'equity' ? (
        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-amber-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-amber-100">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              {t.equity}
              <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 border-amber-200">
                RSUs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equityPercentage" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Percent className="w-4 h-4" />
                  {t.equityPercentage}
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="equityPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.equityPercentage}
                    onChange={(e) => updateFormData('equityPercentage', Number(e.target.value))}
                    className="pr-8 bg-white/70"
                    placeholder="e.g., 1.5"
                  />
                  <Percent className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="exitValuation" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <DollarSign className="w-4 h-4" />
                  {t.exitValuation}
                </Label>
                <Input
                  id="exitValuation"
                  type="number"
                  value={formData.exitValuation}
                  onChange={(e) => updateFormData('exitValuation', Number(e.target.value))}
                  className="mt-2 bg-white/70"
                  placeholder="e.g., 1000000000"
                />
              </div>
            </div>
          
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simulateDilution">{t.simulateDilution}</Label>
                <p className="text-sm text-gray-500 mt-1">
                  {t.addRound}
                </p>
              </div>
              <Switch
                id="simulateDilution"
                checked={formData.simulateDilution}
                onCheckedChange={(checked) => updateFormData('simulateDilution', checked)}
              />
            </div>
            
            {formData.simulateDilution && (
              <div className="space-y-4">
                <Separator />
                
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t.fundraisingRounds}</h4>
                  <Button
                    onClick={addFundraisingRound}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t.addRound}
                  </Button>
                </div>
                
                {formData.fundraisingRounds.map((round, index) => (
                  <Card key={round.id} className="p-4 bg-white/50 border-amber-200">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        <Users className="w-3 h-3 mr-1" />
                        Round {index + 1}
                      </Badge>
                      <Button
                        onClick={() => removeFundraisingRound(round.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t.roundYear}</Label>
                        <Input
                          type="number"
                          min="1"
                          max={formData.simulationYears}
                          value={round.year}
                          onChange={(e) => updateFundraisingRound(round.id, { year: Number(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label>{t.dilutionType}</Label>
                        <Select
                          value={round.dilutionType}
                          onValueChange={(value) => updateFundraisingRound(round.id, { dilutionType: value as 'direct' | 'valuation' })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">{t.directPercentage}</SelectItem>
                            <SelectItem value="valuation">{t.valuationBased}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {round.dilutionType === 'direct' ? (
                      <div className="mt-4">
                        <Label>{t.dilutionPercentage}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={round.dilutionPercentage || 0}
                          onChange={(e) => updateFundraisingRound(round.id, { dilutionPercentage: Number(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label>{t.premoneyValuation}</Label>
                          <Input
                            type="number"
                            value={round.premoneyValuation || 0}
                            onChange={(e) => updateFundraisingRound(round.id, { premoneyValuation: Number(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label>{t.amountRaised}</Label>
                          <Input
                            type="number"
                            value={round.amountRaised || 0}
                            onChange={(e) => updateFundraisingRound(round.id, { amountRaised: Number(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-teal-50/50 to-cyan-50/50 border-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-teal-100">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              {t.stockOptions}
              <Badge variant="outline" className="ml-auto bg-teal-50 text-teal-700 border-teal-200">
                Options
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stockOptions" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building2 className="w-4 h-4" />
                {t.totalOptions}
              </Label>
              <Input
                id="stockOptions"
                type="number"
                min="0"
                value={formData.stockOptions}
                onChange={(e) => updateFormData('stockOptions', Number(e.target.value))}
                className="mt-2 bg-white/70"
                placeholder="e.g., 10000"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strikePrice" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <DollarSign className="w-4 h-4" />
                  {t.strikePrice}
                </Label>
                <Input
                  id="strikePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.strikePrice}
                  onChange={(e) => updateFormData('strikePrice', Number(e.target.value))}
                  className="mt-2 bg-white/70"
                  placeholder="e.g., 1.00"
                />
              </div>
              
              <div>
                <Label htmlFor="exitPrice" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Target className="w-4 h-4" />
                  {t.exitPrice}
                </Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.exitPrice}
                  onChange={(e) => updateFormData('exitPrice', Number(e.target.value))}
                  className="mt-2 bg-white/70"
                  placeholder="e.g., 10.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}