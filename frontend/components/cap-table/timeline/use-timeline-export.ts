/**
 * Timeline Export Hook (#228)
 *
 * Provides export functionality for timeline data.
 */

import { useCallback, type RefObject } from "react";
import { format } from "date-fns";
import type { TimelineEvent } from "./types";
import { EVENT_TYPE_LABELS } from "./types";

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Download a file with the given content
 */
function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType?: string
) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType || "text/plain" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV value per RFC 4180
 */
function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export timeline events to CSV format
 */
export function exportToCSV(events: TimelineEvent[]): void {
  const headers = ["Date", "Type", "Title", "Description", "Ownership Summary"];

  const rows = events.map((event) => {
    const date = format(new Date(event.timestamp), "yyyy-MM-dd");
    const type = EVENT_TYPE_LABELS[event.type];
    const ownershipSummary = event.ownershipSnapshot
      .map((o) => `${o.name}: ${o.percentage.toFixed(1)}%`)
      .join("; ");

    return [
      escapeCSV(date),
      escapeCSV(type),
      escapeCSV(event.title),
      escapeCSV(event.description),
      escapeCSV(ownershipSummary),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  downloadFile(csv, "equity-timeline.csv", "text/csv");
}

/**
 * Export timeline events to JSON format
 */
export function exportToJSON(events: TimelineEvent[]): void {
  const exportData = {
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    events: events.map((event) => ({
      date: format(new Date(event.timestamp), "yyyy-MM-dd"),
      timestamp: event.timestamp,
      type: event.type,
      typeLabel: EVENT_TYPE_LABELS[event.type],
      title: event.title,
      description: event.description,
      metadata: event.metadata,
      ownership: event.ownershipSnapshot.map((o) => ({
        name: o.name,
        percentage: o.percentage,
        category: o.category,
      })),
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, "equity-timeline.json", "application/json");
}

/**
 * Export timeline container as PNG image
 */
export async function exportToPNG(
  containerRef: RefObject<HTMLDivElement | null>
): Promise<void> {
  if (!containerRef.current) {
    console.error("Container ref is not available");
    return;
  }

  try {
    // Dynamic import to avoid SSR issues
    const { toPng } = await import("html-to-image");

    const dataUrl = await toPng(containerRef.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2, // Higher quality
      filter: (_node: HTMLElement) => {
        // Exclude certain elements if needed
        return true;
      },
    });

    // Create download link
    const link = document.createElement("a");
    link.download = `equity-timeline-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Failed to export timeline as PNG:", error);
    throw error;
  }
}

// ============================================================================
// Hook
// ============================================================================

interface UseTimelineExportOptions {
  events: TimelineEvent[];
  containerRef: RefObject<HTMLDivElement | null>;
}

interface UseTimelineExportReturn {
  exportPNG: () => Promise<void>;
  exportCSV: () => void;
  exportJSON: () => void;
  exportPDF: () => void;
  isExporting: boolean;
}

export function useTimelineExport({
  events,
  containerRef,
}: UseTimelineExportOptions): UseTimelineExportReturn {
  const handleExportPNG = useCallback(async () => {
    await exportToPNG(containerRef);
  }, [containerRef]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(events);
  }, [events]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(events);
  }, [events]);

  const handleExportPDF = useCallback(() => {
    // For now, trigger print dialog which allows saving as PDF
    // Future: Integrate with existing PDF export in export-utils.ts
    window.print();
  }, []);

  return {
    exportPNG: handleExportPNG,
    exportCSV: handleExportCSV,
    exportJSON: handleExportJSON,
    exportPDF: handleExportPDF,
    isExporting: false, // Could add loading state for async exports
  };
}
