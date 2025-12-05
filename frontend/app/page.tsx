"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

import { UseFormReturn } from "react-hook-form";
import {
  CurrentJobForm,
  CurrentJobFormSchema,
  StartupOfferForm,
  StartupOfferFormSchema,
  GlobalSettingsForm,
  GlobalSettingsFormSchema,
  StartupScenarioResponse,
  GrowthSimulationResponse,
} from "@/lib/schemas";
import {
  useCalculateOpportunityCost,
  useCalculateStartupScenario,
  useCreateMonthlyDataGrid,
  useHealthCheck,
  useSimulateGrowth,
} from "@/lib/api-client";

import { CurrentJobFormComponent } from "@/components/forms/current-job-form";
import { StartupOfferFormComponent } from "@/components/forms/startup-offer-form";
import { GlobalSettingsFormComponent } from "@/components/forms/global-settings-form";
import { ScenarioResults } from "@/components/results/scenario-results";
import { GrowthParameters, GrowthFormValues } from "@/components/simulation/GrowthParameters";
import { RunwayChart } from "@/components/charts/RunwayChart";

// Type for simulation data items
type SimulationDataItem = GrowthSimulationResponse["data"][number];

// Type for the results state
interface CalculationResults {
  scenario: StartupScenarioResponse;
  global: GlobalSettingsForm;
  currentJob: CurrentJobForm;
  startup: StartupOfferForm;
}

export default function Dashboard() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<"simple" | "simulation">("simple");
  const [simulationData, setSimulationData] = useState<SimulationDataItem[]>([]);

  // Forms
  const globalSettingsForm = useForm<GlobalSettingsForm>({
    resolver: zodResolver(GlobalSettingsFormSchema),
    defaultValues: {
      exit_year: 4,
    },
  });

  const currentJobForm = useForm<CurrentJobForm>({
    resolver: zodResolver(CurrentJobFormSchema),
    defaultValues: {
      monthly_salary: 12000,
      annual_salary_growth_rate: 3,
      assumed_annual_roi: 7,
      investment_frequency: "Monthly",
    },
  });

  const startupOfferForm = useForm<StartupOfferForm>({
    resolver: zodResolver(StartupOfferFormSchema),
    defaultValues: {
      monthly_salary: 10000,
      equity_details: {
        equity_type: "RSU",
        monthly_salary: 10000, // Redundant but needed for union discrimination in some cases
        total_equity_grant_pct: 0.5,
        vesting_period: 4,
        cliff_period: 1,
        simulate_dilution: false,
        dilution_rounds: [],
        exit_valuation: 50000000,
      },
    },
  });

  // --- API Hooks ---
  const healthCheck = useHealthCheck();

  const createMonthlyDataGrid = useCreateMonthlyDataGrid();
  const calculateOpportunityCost = useCalculateOpportunityCost();
  const calculateStartupScenario = useCalculateStartupScenario();
  const simulateGrowth = useSimulateGrowth();

  // --- Derived State for Results ---
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Handlers ---

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    setResults(null);

    try {
      // 1. Validate all forms
      const globalValid = await globalSettingsForm.trigger();
      const currentJobValid = await currentJobForm.trigger();
      const startupValid = await startupOfferForm.trigger();

      if (!globalValid || !currentJobValid || !startupValid) {
        throw new Error("Please fix the errors in the forms before calculating.");
      }

      const globalValues = globalSettingsForm.getValues();
      const currentJobValues = currentJobForm.getValues();
      const startupValues = startupOfferForm.getValues();

      // 2. Create Monthly Data Grid
      const gridResponse = await createMonthlyDataGrid.mutateAsync({
        exit_year: globalValues.exit_year,
        current_job_monthly_salary: currentJobValues.monthly_salary,
        startup_monthly_salary: startupValues.monthly_salary,
        current_job_salary_growth_rate:
          currentJobValues.annual_salary_growth_rate / 100,
        dilution_rounds:
          startupValues.equity_details.equity_type === "RSU" &&
            startupValues.equity_details.simulate_dilution
            ? startupValues.equity_details.dilution_rounds
            : null,
      });

      // 3. Calculate Opportunity Cost
      const oppCostResponse = await calculateOpportunityCost.mutateAsync({
        monthly_data: gridResponse.data,
        annual_roi: currentJobValues.assumed_annual_roi / 100,
        investment_frequency: currentJobValues.investment_frequency,
        options_params:
          startupValues.equity_details.equity_type === "STOCK_OPTIONS"
            ? startupValues.equity_details
            : null,
        startup_params: {
          ...startupValues.equity_details,
          exit_year: globalValues.exit_year,
        }
      });

      // 4. Calculate Startup Scenario Results
      const scenarioResponse = await calculateStartupScenario.mutateAsync({
        opportunity_cost_data: oppCostResponse.data,
        startup_params: {
          ...startupValues.equity_details,
          exit_year: globalValues.exit_year,
          total_vesting_years: startupValues.equity_details.vesting_period,
          cliff_years: startupValues.equity_details.cliff_period,
          rsu_params:
            startupValues.equity_details.equity_type === "RSU"
              ? {
                equity_pct: startupValues.equity_details.total_equity_grant_pct / 100,
                target_exit_valuation: startupValues.equity_details.exit_valuation,
                simulate_dilution: startupValues.equity_details.simulate_dilution,
                dilution_rounds: startupValues.equity_details.dilution_rounds,
              }
              : null,
          options_params:
            startupValues.equity_details.equity_type === "STOCK_OPTIONS"
              ? {
                ...startupValues.equity_details,
                target_exit_price_per_share:
                  startupValues.equity_details.exit_price_per_share,
              }
              : null,
        },
      });

      setResults({
        scenario: scenarioResponse,
        global: globalValues,
        currentJob: currentJobValues,
        startup: startupValues,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGrowthSimulation = async (values: GrowthFormValues) => {
    try {
      const response = await simulateGrowth.mutateAsync({
        ...values,
        months: globalSettingsForm.getValues().exit_year * 12,
      });
      setSimulationData(response.data);

      // If in simulation mode, update the startup offer valuation based on the simulation
      if (activeTab === "simulation") {
        const finalValuation = response.data[response.data.length - 1].Valuation;
        if (startupOfferForm.getValues().equity_details.equity_type === "RSU") {
          startupOfferForm.setValue("equity_details.exit_valuation", finalValuation);
        }
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  // Note: Removed auto-simulation trigger to prevent infinite re-renders
  // User should manually click "Run Simulation" in GrowthParameters



  if (healthCheck.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (healthCheck.isError) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Service Unavailable</AlertTitle>
          <AlertDescription>
            Could not connect to the backend API. Please ensure the server is running.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Worth It?
        </h1>
        <p className="text-muted-foreground text-lg">
          Job Offer Financial Analyzer & Startup Simulator
        </p>
      </header>

      {/* API Status Indicator */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border text-xs text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${healthCheck.data?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>API Status: {healthCheck.data?.status || 'Offline'}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "simple" | "simulation")} className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="simple" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Simple Analysis
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Simulation Mode
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <GlobalSettingsFormInputs form={globalSettingsForm} />

            <TabsContent value="simulation" className="mt-0 space-y-6">
              <GrowthParameters onChange={handleGrowthSimulation} />
            </TabsContent>

            <CurrentJobFormComponent
              defaultValues={currentJobForm.getValues()}
              onChange={(data) => currentJobForm.reset(data)}
            />
            <StartupOfferFormComponent
              onRSUChange={(data) => {
                startupOfferForm.setValue("equity_details", data);
              }}
              onStockOptionsChange={(data) => {
                startupOfferForm.setValue("equity_details", data);
              }}
            />

            <Button
              size="lg"
              className="w-full"
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Run Analysis"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            <TabsContent value="simulation" className="mt-0">
              {simulationData.length > 0 && (
                <RunwayChart data={simulationData} />
              )}
            </TabsContent>

            {results && (
              <ScenarioResults
                results={results.scenario}
                globalSettings={results.global}
                currentJob={results.currentJob}
                equityDetails={results.startup.equity_details}
              />
            )}

            {!results && simulationData.length === 0 && (
              <Card className="glass-card flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Enter parameters and run analysis to see results</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

// Helper component to isolate Global Settings form render
function GlobalSettingsFormInputs({ form }: { form: UseFormReturn<GlobalSettingsForm> }) {
  return <GlobalSettingsFormComponent
    defaultValues={form.getValues()}
    onChange={(data) => form.reset(data)}
  />;
}
