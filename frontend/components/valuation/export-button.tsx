"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson, Loader2 } from "lucide-react";
import { useExportFirstChicago, useExportPreRevenue } from "@/lib/api-client";
import type { ExportFormat } from "@/lib/schemas";

interface ExportButtonProps {
  companyName: string;
  methodType: "first-chicago" | "pre-revenue";
  result: Record<string, unknown>;
  params: Record<string, unknown>;
  methodName?: string;
  industry?: string | null;
  monteCarloResult?: Record<string, unknown> | null;
  disabled?: boolean;
}

/**
 * Export button component with format selection dropdown.
 * Supports PDF, JSON, and CSV export formats for valuation reports.
 */
export function ExportButton({
  companyName,
  methodType,
  result,
  params,
  methodName,
  industry,
  monteCarloResult,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportFirstChicago = useExportFirstChicago();
  const exportPreRevenue = useExportPreRevenue();

  /**
   * Download a blob as a file using a temporary anchor element.
   */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Handle export with the specified format.
   */
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const safeName = companyName.replace(/\s+/g, "_").replace(/\//g, "-");
      const ext = format;

      let blob: Blob;
      if (methodType === "first-chicago") {
        blob = await exportFirstChicago.mutateAsync({
          company_name: companyName,
          format,
          result,
          params,
          industry: industry ?? undefined,
          monte_carlo_result: monteCarloResult ?? undefined,
        });
      } else {
        blob = await exportPreRevenue.mutateAsync({
          company_name: companyName,
          format,
          method_name: methodName || "Valuation",
          result,
          params,
          industry: industry ?? undefined,
        });
      }

      downloadBlob(blob, `${safeName}_valuation.${ext}`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = isExporting || exportFirstChicago.isPending || exportPreRevenue.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="mr-2 h-4 w-4" />
          JSON Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV Spreadsheet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
