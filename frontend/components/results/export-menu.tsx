"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, FileJson } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  exportScenarioAsPDF,
  exportScenarioAsCSV,
  exportScenarioAsJSON,
  type ScenarioData,
  type MonteCarloExportStats,
} from "@/lib/export-utils";

interface ExportMenuProps {
  scenario: ScenarioData;
  monteCarloStats?: MonteCarloExportStats;
  disabled?: boolean;
}

export function ExportMenu({ scenario, monteCarloStats, disabled }: ExportMenuProps) {
  const handleExportPDF = () => {
    try {
      exportScenarioAsPDF(scenario, monteCarloStats);
      toast.success("PDF exported", {
        description: "Your analysis report has been downloaded.",
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Export failed", {
        description: "Could not generate PDF report. Please try again.",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      exportScenarioAsCSV(scenario);
      toast.success("CSV exported", {
        description: "Your data has been downloaded as CSV.",
      });
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error("Export failed", {
        description: "Could not generate CSV file. Please try again.",
      });
    }
  };

  const handleExportJSON = () => {
    try {
      exportScenarioAsJSON(scenario, monteCarloStats);
      toast.success("JSON exported", {
        description: "Your scenario backup has been downloaded.",
      });
    } catch (error) {
      console.error("JSON export failed:", error);
      toast.error("Export failed", {
        description: "Could not generate JSON file. Please try again.",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          <span className="text-sm">PDF Report</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span className="text-sm">CSV Data</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer">
          <FileJson className="mr-2 h-4 w-4" />
          <span className="text-sm">JSON Backup</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
