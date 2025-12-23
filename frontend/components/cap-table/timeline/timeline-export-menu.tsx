"use client";

/**
 * Timeline Export Menu Component (#228)
 *
 * Dropdown menu for exporting timeline data in various formats.
 */

import { useState } from "react";
import { Download, ImageIcon, FileText, FileSpreadsheet, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { TimelineExportFormat } from "./types";

// ============================================================================
// Component
// ============================================================================

interface TimelineExportMenuProps {
  onExport: (format: TimelineExportFormat) => void | Promise<void>;
  disabled?: boolean;
}

export function TimelineExportMenu({ onExport, disabled = false }: TimelineExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: TimelineExportFormat) => {
    setIsExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className="h-8 gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Export Timeline
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleExport("png")}
          disabled={isExporting}
          className="cursor-pointer gap-2"
        >
          <ImageIcon className="text-muted-foreground h-4 w-4" />
          <div>
            <p className="font-medium">PNG Image</p>
            <p className="text-muted-foreground text-xs">Screenshot for sharing</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={isExporting}
          className="cursor-pointer gap-2"
        >
          <FileText className="text-muted-foreground h-4 w-4" />
          <div>
            <p className="font-medium">PDF Report</p>
            <p className="text-muted-foreground text-xs">Print-ready document</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={isExporting}
          className="cursor-pointer gap-2"
        >
          <FileSpreadsheet className="text-muted-foreground h-4 w-4" />
          <div>
            <p className="font-medium">CSV Data</p>
            <p className="text-muted-foreground text-xs">Open in Excel</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("json")}
          disabled={isExporting}
          className="cursor-pointer gap-2"
        >
          <FileJson className="text-muted-foreground h-4 w-4" />
          <div>
            <p className="font-medium">JSON Data</p>
            <p className="text-muted-foreground text-xs">For developers</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
