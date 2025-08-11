import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Sparkles, 
  Rocket, 
  Building, 
  Briefcase, 
  TrendingUp, 
  Target, 
  Zap,
  Star,
  Users,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageContext';
import type { FormData } from '../types/types';

interface PresetTemplatesProps {
  onSelectTemplate: (data: FormData) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'startup' | 'corporate' | 'growth';
  badge: string;
  data: FormData;
  highlights: string[];
  gradient: string;
}

export function PresetTemplates({ onSelectTemplate }: PresetTemplatesProps) {
  const { t, isRTL } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customValues, setCustomValues] = useState<Partial<FormData>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const templates: Template[] = [
    {
      id: 'early-startup',
      name: 'Early Stage Startup',
      description: 'Seed to Series A startup with high risk/reward potential',
      icon: Rocket,
      category: 'startup',
      badge: 'High Risk',
      gradient: 'from-purple-600 to-pink-600',
      data: {
        simulationYears: 6,
        currentSalary: 120000,
        salaryGrowthRate: 4,
        roiRate: 8,
        investmentFrequency: 'monthly' as const,
        startupSalary: 90000,
        equityType: 'equity' as const,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPercentage: 1.5,
        exitValuation: 500000000,
        simulateDilution: true,
        fundraisingRounds: [
          {
            id: '1',
            year: 2,
            dilutionType: 'direct' as const,
            dilutionPercentage: 25
          },
          {
            id: '2',
            year: 4,
            dilutionType: 'direct' as const,
            dilutionPercentage: 30
          }
        ],
        stockOptions: 50000,
        strikePrice: 0.1,
        exitPrice: 10
      },
      highlights: [
        '1.5% equity stake',
        '$500M exit valuation',
        '25-30% dilution expected',
        '4-year vesting'
      ]
    },
    {
      id: 'growth-startup',
      name: 'Growth Stage Startup',
      description: 'Series B-C company with proven product-market fit',
      icon: TrendingUp,
      category: 'growth',
      badge: 'Medium Risk',
      gradient: 'from-blue-600 to-indigo-600',
      data: {
        simulationYears: 5,
        currentSalary: 140000,
        salaryGrowthRate: 3.5,
        roiRate: 8,
        investmentFrequency: 'monthly' as const,
        startupSalary: 130000,
        equityType: 'equity' as const,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPercentage: 0.8,
        exitValuation: 2000000000,
        simulateDilution: true,
        fundraisingRounds: [
          {
            id: '1',
            year: 3,
            dilutionType: 'direct' as const,
            dilutionPercentage: 15
          }
        ],
        stockOptions: 25000,
        strikePrice: 2,
        exitPrice: 20
      },
      highlights: [
        '0.8% equity stake',
        '$2B exit valuation',
        '15% dilution expected',
        'Competitive salary'
      ]
    },
    {
      id: 'late-startup',
      name: 'Late Stage Startup',
      description: 'Pre-IPO company with stable revenue and growth',
      icon: Building,
      category: 'growth',
      badge: 'Lower Risk',
      gradient: 'from-green-600 to-teal-600',
      data: {
        simulationYears: 4,
        currentSalary: 160000,
        salaryGrowthRate: 3,
        roiRate: 7,
        investmentFrequency: 'monthly' as const,
        startupSalary: 170000,
        equityType: 'options' as const,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPercentage: 0.3,
        exitValuation: 10000000000,
        simulateDilution: false,
        fundraisingRounds: [],
        stockOptions: 15000,
        strikePrice: 15,
        exitPrice: 50
      },
      highlights: [
        '15k stock options',
        '$15 strike price',
        'Salary increase',
        'IPO likely in 2-4 years'
      ]
    },
    {
      id: 'tech-giant',
      name: 'Big Tech Company',
      description: 'Established tech company with RSU compensation',
      icon: Globe,
      category: 'corporate',
      badge: 'Low Risk',
      gradient: 'from-gray-600 to-slate-600',
      data: {
        simulationYears: 4,
        currentSalary: 150000,
        salaryGrowthRate: 2.5,
        roiRate: 7,
        investmentFrequency: 'monthly' as const,
        startupSalary: 180000,
        equityType: 'equity' as const,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPercentage: 0.05,
        exitValuation: 1500000000000, // $1.5T
        simulateDilution: false,
        fundraisingRounds: [],
        stockOptions: 1000,
        strikePrice: 300,
        exitPrice: 400
      },
      highlights: [
        'RSU package',
        'Stable growth',
        'High base salary',
        'Predictable outcomes'
      ]
    },
    {
      id: 'fintech-startup',
      name: 'FinTech Startup',
      description: 'Financial technology startup with regulatory advantages',
      icon: Target,
      category: 'startup',
      badge: 'High Growth',
      gradient: 'from-orange-600 to-red-600',
      data: {
        simulationYears: 5,
        currentSalary: 135000,
        salaryGrowthRate: 4,
        roiRate: 8.5,
        investmentFrequency: 'monthly' as const,
        startupSalary: 115000,
        equityType: 'equity' as const,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPercentage: 1.2,
        exitValuation: 3000000000,
        simulateDilution: true,
        fundraisingRounds: [
          {
            id: '1',
            year: 2,
            dilutionType: 'direct' as const,
            dilutionPercentage: 20
          },
          {
            id: '2',
            year: 4,
            dilutionType: 'direct' as const,
            dilutionPercentage: 25
          }
        ],
        stockOptions: 40000,
        strikePrice: 0.5,
        exitPrice: 15
      },
      highlights: [
        '1.2% equity stake',
        '$3B exit potential',
        'FinTech premium',
        'Regulatory moat'
      ]
    },
    {
      id: 'ai-startup',
      name: 'AI/ML Startup',
      description: 'Artificial Intelligence startup with cutting-edge technology',
      icon: Zap,
      category: 'startup',
      badge: 'Hot Sector',
      gradient: 'from-violet-600 to-purple-600',
      data: {
        simulationYears: 6,
        currentSalary: 180000,
        salaryGrowthRate: 5,
        roiRate: 9,
        investmentFrequency: 'monthly' as const,
        startupSalary: 160000,
        equityType: 'equity' as const,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPercentage: 2.0,
        exitValuation: 1000000000,
        simulateDilution: true,
        fundraisingRounds: [
          {
            id: '1',
            year: 2,
            dilutionType: 'direct' as const,
            dilutionPercentage: 30
          },
          {
            id: '2',
            year: 4,
            dilutionType: 'direct' as const,
            dilutionPercentage: 35
          }
        ],
        stockOptions: 60000,
        strikePrice: 0.05,
        exitPrice: 8
      },
      highlights: [
        '2% equity stake',
        'AI/ML premium',
        'High talent demand',
        'Significant dilution risk'
      ]
    }
  ];

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCustomValues(template.data);
    setIsDialogOpen(true);
  };

  const applyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate({ ...selectedTemplate.data, ...customValues });
      setIsDialogOpen(false);
      setSelectedTemplate(null);
      setCustomValues({});
    }
  };

  const updateCustomValue = (key: keyof FormData, value: any) => {
    setCustomValues(prev => ({ ...prev, [key]: value }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'startup': return <Rocket className="w-4 h-4" />;
      case 'growth': return <TrendingUp className="w-4 h-4" />;
      case 'corporate': return <Building className="w-4 h-4" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'startup': return 'bg-purple-100 text-purple-800';
      case 'growth': return 'bg-blue-100 text-blue-800';
      case 'corporate': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Start Templates</h2>
        <p className="text-gray-600">Choose from pre-configured scenarios based on common job offer types</p>
      </motion.div>

      {/* Template Categories */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Rocket className="w-3 h-3 mr-1" />
            Startups
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            Growth Stage
          </Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Building className="w-3 h-3 mr-1" />
            Corporate
          </Badge>
        </div>
      </motion.div>

      {/* Templates Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${template.gradient}`}>
                    <template.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {getCategoryIcon(template.category)}
                      <span className="ml-1 capitalize">{template.category}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.badge}
                    </Badge>
                  </div>
                </div>
                
                <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {template.description}
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3 mb-4">
                  {template.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      <span className="text-gray-700">{highlight}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full bg-gradient-to-r ${template.gradient} hover:opacity-90 transition-opacity`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use This Template
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Customization Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedTemplate.gradient}`}>
                    <selectedTemplate.icon className="w-5 h-5 text-white" />
                  </div>
                  Customize {selectedTemplate.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-6 pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentSalary">Current Salary</Label>
                  <Input
                    id="currentSalary"
                    type="number"
                    value={customValues.currentSalary || selectedTemplate.data.currentSalary}
                    onChange={(e) => updateCustomValue('currentSalary', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="startupSalary">Startup Salary</Label>
                  <Input
                    id="startupSalary"
                    type="number"
                    value={customValues.startupSalary || selectedTemplate.data.startupSalary}
                    onChange={(e) => updateCustomValue('startupSalary', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="equityPercentage">Equity Percentage (%)</Label>
                  <Input
                    id="equityPercentage"
                    type="number"
                    step="0.1"
                    value={customValues.equityPercentage || selectedTemplate.data.equityPercentage}
                    onChange={(e) => updateCustomValue('equityPercentage', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="exitValuation">Exit Valuation</Label>
                  <Input
                    id="exitValuation"
                    type="number"
                    value={customValues.exitValuation || selectedTemplate.data.exitValuation}
                    onChange={(e) => updateCustomValue('exitValuation', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="simulationYears">Simulation Years</Label>
                  <Input
                    id="simulationYears"
                    type="number"
                    min="1"
                    max="20"
                    value={customValues.simulationYears || selectedTemplate.data.simulationYears}
                    onChange={(e) => updateCustomValue('simulationYears', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="vestingPeriod">Vesting Period (years)</Label>
                  <Input
                    id="vestingPeriod"
                    type="number"
                    min="1"
                    max="10"
                    value={customValues.vestingPeriod || selectedTemplate.data.vestingPeriod}
                    onChange={(e) => updateCustomValue('vestingPeriod', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-6">
                <Button 
                  onClick={applyTemplate}
                  className={`flex-1 bg-gradient-to-r ${selectedTemplate.gradient} hover:opacity-90`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Template
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}