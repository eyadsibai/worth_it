"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportCapTableAsCSV,
  exportFundingHistoryAsCSV,
  exportExitScenariosAsCSV,
  exportCapTableAsPDF,
} from "@/lib/export-utils";
import type { CapTable, FundingInstrument, WaterfallDistribution } from "@/lib/schemas";

interface ExportMenuProps {
  capTable: CapTable;
  instruments: FundingInstrument[];
  waterfall?: WaterfallDistribution;
  exitValuations?: number[];
  disabled?: boolean;
}

export function ExportMenu({
  capTable,
  instruments,
  waterfall,
  exitValuations,
  disabled = false,
}: ExportMenuProps) {
  const timestamp = new Date().toISOString().split("T")[0];

  const handleExportCapTableCSV = () => {
    try {
      exportCapTableAsCSV(capTable, `cap-table-${timestamp}`);
      toast.success("Export complete", { description: "Cap table CSV downloaded." });
    } catch {
      toast.error("Export failed", { description: "Could not generate CSV file." });
    }
  };

  const handleExportFundingCSV = () => {
    try {
      exportFundingHistoryAsCSV(instruments, `funding-history-${timestamp}`);
      toast.success("Export complete", { description: "Funding history CSV downloaded." });
    } catch {
      toast.error("Export failed", { description: "Could not generate CSV file." });
    }
  };

  const handleExportExitScenariosCSV = () => {
    if (exitValuations && exitValuations.length > 0) {
      try {
        exportExitScenariosAsCSV(capTable, exitValuations, `exit-scenarios-${timestamp}`);
        toast.success("Export complete", { description: "Exit scenarios CSV downloaded." });
      } catch {
        toast.error("Export failed", { description: "Could not generate CSV file." });
      }
    }
  };

  const handleExportPDF = () => {
    try {
      exportCapTableAsPDF(capTable, instruments, waterfall);
      toast.success("Export complete", { description: "PDF report downloaded." });
    } catch {
      toast.error("Export failed", { description: "Could not generate PDF file." });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportCapTableCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Cap Table (CSV)
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportFundingCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Funding History (CSV)
        </DropdownMenuItem>

        {exitValuations && exitValuations.length > 0 && (
          <DropdownMenuItem onClick={handleExportExitScenariosCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exit Scenarios (CSV)
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Full Report (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
