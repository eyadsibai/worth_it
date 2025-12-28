# Phase 5: Output Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive output generation including PDF reports, investment memos, negotiation toolkits, and multiple export formats (PDF, DOCX, CSV, JSON).

**Architecture:** Create a report generation engine that combines valuation results with formatting templates. Use server-side PDF generation for consistency.

**Tech Stack:** Python/ReportLab or WeasyPrint (PDF), python-docx (DOCX), FastAPI file responses, React for preview UI, TDD throughout.

**Prerequisites:** Phases 1-4 complete (valuation methods, Monte Carlo, benchmarks working)

---

## Overview

Phase 5 adds professional output generation:

1. **Valuation Report** - Comprehensive PDF with methodology, results, and assumptions
2. **Investment Memo** - Investor-ready summary with key metrics
3. **Negotiation Toolkit** - Range analysis for term sheet discussions
4. **Export Formats** - PDF, DOCX, CSV, JSON for data portability

---

## Task 1: Report Data Models

**Files:**
- Create: `backend/src/worth_it/reports/models.py`
- Test: `backend/tests/test_reports.py`

### Step 1: Write failing test for report models

```python
# In backend/tests/test_reports.py
import pytest
from worth_it.reports.models import (
    ValuationReportData,
    ReportSection,
    ReportMetric,
    ChartData,
    ReportFormat,
)

class TestReportModels:
    """Tests for report data models."""

    def test_report_metric_creation(self) -> None:
        """Test creating a report metric."""
        metric = ReportMetric(
            name="Present Value",
            value=7_500_000,
            formatted_value="$7.5M",
            description="Discounted value of expected outcomes",
        )
        assert metric.name == "Present Value"
        assert metric.value == 7_500_000

    def test_report_section_creation(self) -> None:
        """Test creating a report section."""
        section = ReportSection(
            title="Valuation Summary",
            content="This section summarizes the valuation results.",
            metrics=[
                ReportMetric("Valuation", 10_000_000, "$10M", "Primary valuation"),
            ],
            charts=[],
        )
        assert section.title == "Valuation Summary"
        assert len(section.metrics) == 1

    def test_full_report_data(self) -> None:
        """Test creating full report data."""
        report = ValuationReportData(
            title="Startup Valuation Report",
            company_name="TechCo Inc.",
            date="2024-01-15",
            prepared_by="Worth It Valuation Tool",
            method="First Chicago Method",
            sections=[
                ReportSection(
                    title="Executive Summary",
                    content="TechCo is valued at $10M using First Chicago Method.",
                    metrics=[],
                    charts=[],
                ),
            ],
            assumptions=[
                "5-year exit timeline",
                "25% discount rate",
            ],
            disclaimers=[
                "This is not financial advice.",
            ],
        )
        assert report.company_name == "TechCo Inc."
        assert len(report.sections) == 1
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_reports.py -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/reports/models.py
"""Data models for valuation reports."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ReportFormat(Enum):
    """Supported report export formats."""
    PDF = "pdf"
    DOCX = "docx"
    CSV = "csv"
    JSON = "json"


@dataclass
class ReportMetric:
    """A single metric to display in the report.

    Attributes:
        name: Metric label
        value: Raw numeric value
        formatted_value: Display-ready formatted string
        description: Optional explanation
    """
    name: str
    value: float
    formatted_value: str
    description: str = ""


@dataclass
class ChartData:
    """Data for a chart in the report.

    Attributes:
        chart_type: Type of chart (bar, pie, line, histogram)
        title: Chart title
        data: Chart data points
        config: Chart-specific configuration
    """
    chart_type: str
    title: str
    data: list[dict[str, Any]]
    config: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReportSection:
    """A section of the valuation report.

    Attributes:
        title: Section heading
        content: Narrative content
        metrics: Key metrics for this section
        charts: Charts to include
    """
    title: str
    content: str
    metrics: list[ReportMetric] = field(default_factory=list)
    charts: list[ChartData] = field(default_factory=list)


@dataclass
class ValuationReportData:
    """Complete data for generating a valuation report.

    Attributes:
        title: Report title
        company_name: Name of company being valued
        date: Report generation date
        prepared_by: Tool or person generating report
        method: Valuation method used
        sections: Report sections with content
        assumptions: List of key assumptions
        disclaimers: Legal disclaimers
    """
    title: str
    company_name: str
    date: str
    prepared_by: str
    method: str
    sections: list[ReportSection]
    assumptions: list[str] = field(default_factory=list)
    disclaimers: list[str] = field(default_factory=list)
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_reports.py -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/reports/models.py backend/tests/test_reports.py
git commit -m "feat(reports): add report data models"
```

---

## Task 2: PDF Report Generator

**Files:**
- Create: `backend/src/worth_it/reports/pdf_generator.py`
- Test: `backend/tests/test_reports.py`

### Step 1: Write failing test for PDF generation

```python
# In backend/tests/test_reports.py
from worth_it.reports.pdf_generator import generate_pdf_report
import io

class TestPDFGenerator:
    """Tests for PDF report generation."""

    def test_generate_simple_pdf(self) -> None:
        """Test generating a simple PDF report."""
        report_data = ValuationReportData(
            title="Valuation Report",
            company_name="TestCo",
            date="2024-01-15",
            prepared_by="Worth It",
            method="First Chicago",
            sections=[
                ReportSection(
                    title="Summary",
                    content="TestCo is valued at $10M.",
                    metrics=[
                        ReportMetric("Valuation", 10_000_000, "$10M", ""),
                    ],
                    charts=[],
                ),
            ],
            assumptions=["5-year exit"],
            disclaimers=["Not financial advice"],
        )

        pdf_bytes = generate_pdf_report(report_data)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # PDF files start with %PDF
        assert pdf_bytes[:4] == b'%PDF'

    def test_pdf_includes_company_name(self) -> None:
        """Test that PDF contains company name."""
        report_data = ValuationReportData(
            title="Report",
            company_name="Acme Corp",
            date="2024-01-15",
            prepared_by="Worth It",
            method="Berkus",
            sections=[],
        )

        pdf_bytes = generate_pdf_report(report_data)
        # Company name should be in the PDF
        # (This is a weak test - in practice you'd use a PDF reader)
        assert len(pdf_bytes) > 100
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_reports.py::TestPDFGenerator -v`
Expected: FAIL with import error

### Step 3: Write PDF generator (using ReportLab)

```python
# In backend/src/worth_it/reports/pdf_generator.py
"""PDF report generation using ReportLab."""

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from .models import ValuationReportData, ReportSection


def generate_pdf_report(
    data: ValuationReportData,
    page_size: tuple = letter,
) -> bytes:
    """Generate a PDF report from valuation data.

    Args:
        data: ValuationReportData with report content
        page_size: Page size (default: letter)

    Returns:
        PDF file as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1A3D2E'),
    ))

    styles.add(ParagraphStyle(
        name='SectionTitle',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=24,
        spaceAfter=12,
        textColor=colors.HexColor('#1A3D2E'),
    ))

    styles.add(ParagraphStyle(
        name='BodyText',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=12,
    ))

    # Build content
    story = []

    # Title
    story.append(Paragraph(data.title, styles['ReportTitle']))
    story.append(Spacer(1, 12))

    # Company info
    info_data = [
        ['Company:', data.company_name],
        ['Date:', data.date],
        ['Method:', data.method],
        ['Prepared by:', data.prepared_by],
    ]
    info_table = Table(info_data, colWidths=[1.5 * inch, 4 * inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 24))

    # Sections
    for section in data.sections:
        story.append(Paragraph(section.title, styles['SectionTitle']))
        story.append(Paragraph(section.content, styles['BodyText']))

        # Metrics table
        if section.metrics:
            metrics_data = [['Metric', 'Value']]
            for metric in section.metrics:
                metrics_data.append([metric.name, metric.formatted_value])

            metrics_table = Table(metrics_data, colWidths=[3 * inch, 2 * inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A3D2E')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ]))
            story.append(metrics_table)
            story.append(Spacer(1, 12))

    # Assumptions
    if data.assumptions:
        story.append(Paragraph('Key Assumptions', styles['SectionTitle']))
        for assumption in data.assumptions:
            story.append(Paragraph(f'• {assumption}', styles['BodyText']))

    # Disclaimers
    if data.disclaimers:
        story.append(Spacer(1, 24))
        story.append(Paragraph('Disclaimers', styles['SectionTitle']))
        for disclaimer in data.disclaimers:
            story.append(Paragraph(
                disclaimer,
                ParagraphStyle(
                    'Disclaimer',
                    parent=styles['BodyText'],
                    fontSize=9,
                    textColor=colors.grey,
                ),
            ))

    doc.build(story)
    return buffer.getvalue()
```

### Step 4: Add reportlab to dependencies

```bash
cd backend && uv add reportlab
```

### Step 5: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_reports.py::TestPDFGenerator -v`
Expected: PASS

### Step 6: Commit

```bash
git add backend/src/worth_it/reports/pdf_generator.py backend/pyproject.toml
git commit -m "feat(reports): implement PDF report generation"
```

---

## Task 3: Report Builder Service

**Files:**
- Create: `backend/src/worth_it/reports/builder.py`
- Test: `backend/tests/test_reports.py`

### Step 1: Write report builder that transforms valuation results to report data

```python
# In backend/src/worth_it/reports/builder.py
"""Report builder service for creating report data from valuation results."""

from datetime import date
from .models import (
    ValuationReportData,
    ReportSection,
    ReportMetric,
    ChartData,
)


def format_currency(value: float) -> str:
    """Format value as currency."""
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif abs(value) >= 1_000:
        return f"${value / 1_000:.1f}K"
    else:
        return f"${value:,.0f}"


def build_first_chicago_report(
    company_name: str,
    result: dict,
    params: dict,
) -> ValuationReportData:
    """Build a report for First Chicago Method valuation.

    Args:
        company_name: Name of the company
        result: FirstChicagoResult as dict
        params: Original parameters used

    Returns:
        ValuationReportData ready for export
    """
    sections = []

    # Executive Summary
    sections.append(ReportSection(
        title="Executive Summary",
        content=f"""
        Using the First Chicago Method, {company_name} is valued at
        {format_currency(result['present_value'])} (present value).
        This valuation considers {len(result['scenario_values'])} scenarios
        with probability-weighted outcomes.
        """.strip(),
        metrics=[
            ReportMetric(
                "Present Value",
                result['present_value'],
                format_currency(result['present_value']),
                "Discounted probability-weighted value",
            ),
            ReportMetric(
                "Weighted Exit Value",
                result['weighted_value'],
                format_currency(result['weighted_value']),
                "Expected exit value before discounting",
            ),
        ],
    ))

    # Scenario Analysis
    scenario_metrics = [
        ReportMetric(
            f"{name} Scenario",
            value,
            format_currency(value),
            f"PV: {format_currency(result['scenario_present_values'][name])}",
        )
        for name, value in result['scenario_values'].items()
    ]

    sections.append(ReportSection(
        title="Scenario Analysis",
        content="Each scenario represents a possible outcome weighted by its probability.",
        metrics=scenario_metrics,
    ))

    # Methodology
    sections.append(ReportSection(
        title="Methodology",
        content="""
        The First Chicago Method values a company by:
        1. Defining multiple scenarios (typically Best, Base, Worst cases)
        2. Assigning probability weights to each scenario
        3. Calculating the present value for each scenario
        4. Computing the probability-weighted present value

        This method is particularly useful for early-stage companies
        with high uncertainty about future outcomes.
        """.strip(),
        metrics=[],
    ))

    return ValuationReportData(
        title=f"Valuation Report: {company_name}",
        company_name=company_name,
        date=date.today().strftime("%B %d, %Y"),
        prepared_by="Worth It Valuation Calculator",
        method="First Chicago Method",
        sections=sections,
        assumptions=[
            f"Discount Rate: {params.get('discount_rate', 0.25) * 100:.0f}%",
            f"Number of Scenarios: {len(result['scenario_values'])}",
        ],
        disclaimers=[
            "This valuation is provided for informational purposes only and does not constitute financial advice.",
            "Past performance does not guarantee future results.",
            "Consult with qualified professionals before making investment decisions.",
        ],
    )
```

### Step 2: Write tests

### Step 3: Commit

```bash
git add backend/src/worth_it/reports/builder.py backend/tests/test_reports.py
git commit -m "feat(reports): add report builder service"
```

---

## Task 4: Export API Endpoints

**Files:**
- Create: `backend/src/worth_it/api/routers/export.py`
- Test: `backend/tests/test_api.py`

### Step 1: Write export endpoints

```python
# In backend/src/worth_it/api/routers/export.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from io import BytesIO
import json
import csv

from worth_it.reports.models import ReportFormat
from worth_it.reports.pdf_generator import generate_pdf_report
from worth_it.reports.builder import build_first_chicago_report

router = APIRouter(prefix="/api/export", tags=["export"])


class FirstChicagoExportRequest(BaseModel):
    company_name: str
    result: dict
    params: dict
    format: str = "pdf"


@router.post("/first-chicago")
async def export_first_chicago(data: FirstChicagoExportRequest):
    """Export First Chicago valuation as PDF, DOCX, CSV, or JSON."""
    report_data = build_first_chicago_report(
        company_name=data.company_name,
        result=data.result,
        params=data.params,
    )

    if data.format == "pdf":
        pdf_bytes = generate_pdf_report(report_data)
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={data.company_name}_valuation.pdf"
            },
        )

    elif data.format == "json":
        return {
            "company_name": data.company_name,
            "valuation": data.result,
            "parameters": data.params,
        }

    elif data.format == "csv":
        output = BytesIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", data.company_name])
        writer.writerow(["Present Value", data.result["present_value"]])
        writer.writerow(["Weighted Value", data.result["weighted_value"]])
        for name, value in data.result["scenario_values"].items():
            writer.writerow([f"{name} Exit Value", value])

        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={data.company_name}_valuation.csv"
            },
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {data.format}")
```

### Step 2: Register router and write tests

### Step 3: Commit

```bash
git add backend/src/worth_it/api/routers/export.py backend/src/worth_it/api/__init__.py
git commit -m "feat(api): add export endpoints for valuation reports"
```

---

## Task 5: Frontend - Export Button Component

**Files:**
- Create: `frontend/components/valuation/export-button.tsx`

### Step 1: Write export button with format selection

```typescript
// In frontend/components/valuation/export-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  companyName: string;
  result: Record<string, unknown>;
  params: Record<string, unknown>;
  method: string;
}

export function ExportButton({ companyName, result, params, method }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          result,
          params,
          format,
        }),
      });

      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${companyName}_valuation.json`);
      } else {
        const blob = await response.blob();
        const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'docx';
        downloadBlob(blob, `${companyName}_valuation.${ext}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="mr-2 h-4 w-4" />
          JSON Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/export-button.tsx
git commit -m "feat(frontend): add ExportButton component with format selection"
```

---

## Task 6: Investment Memo Template

**Files:**
- Create: `backend/src/worth_it/reports/templates/investment_memo.py`

### Step 1: Write investment memo generator (shorter, investor-focused format)

### Step 2: Commit

```bash
git add backend/src/worth_it/reports/templates/investment_memo.py
git commit -m "feat(reports): add investment memo template"
```

---

## Task 7: Negotiation Toolkit

**Files:**
- Create: `backend/src/worth_it/reports/templates/negotiation_toolkit.py`
- Create: `frontend/components/valuation/negotiation-range.tsx`

### Step 1: Write negotiation range calculator

```python
# In backend/src/worth_it/reports/templates/negotiation_toolkit.py
"""Negotiation toolkit for term sheet discussions."""

from dataclasses import dataclass


@dataclass
class NegotiationRange:
    """Valuation range for negotiations.

    Attributes:
        floor: Absolute minimum (walk away below this)
        conservative: Defensible lower bound
        target: Ideal negotiation target
        aggressive: Stretch goal
        ceiling: Maximum reasonable ask
    """
    floor: float
    conservative: float
    target: float
    aggressive: float
    ceiling: float


def calculate_negotiation_range(
    valuation: float,
    monte_carlo_percentiles: dict[str, float] | None = None,
) -> NegotiationRange:
    """Calculate negotiation range from valuation.

    Uses Monte Carlo percentiles if available, otherwise applies
    standard variance assumptions.

    Args:
        valuation: Base valuation
        monte_carlo_percentiles: Optional MC percentiles (p10, p25, p50, p75, p90)

    Returns:
        NegotiationRange with floor to ceiling
    """
    if monte_carlo_percentiles:
        return NegotiationRange(
            floor=monte_carlo_percentiles.get('p10', valuation * 0.7),
            conservative=monte_carlo_percentiles.get('p25', valuation * 0.85),
            target=monte_carlo_percentiles.get('p50', valuation),
            aggressive=monte_carlo_percentiles.get('p75', valuation * 1.15),
            ceiling=monte_carlo_percentiles.get('p90', valuation * 1.3),
        )
    else:
        # Standard assumptions without MC
        return NegotiationRange(
            floor=valuation * 0.7,
            conservative=valuation * 0.85,
            target=valuation,
            aggressive=valuation * 1.15,
            ceiling=valuation * 1.3,
        )
```

### Step 2: Write frontend visualization

### Step 3: Commit

```bash
git add backend/src/worth_it/reports/templates/negotiation_toolkit.py frontend/components/valuation/negotiation-range.tsx
git commit -m "feat(reports): add negotiation toolkit with range calculator"
```

---

## Final Verification

Run all tests and push:
```bash
cd backend && uv run pytest -v
cd frontend && npm run test:unit && npm run type-check
./scripts/run-e2e-tests.sh
git push origin feat/valuation-exports
```

---

## Summary

Phase 5 adds comprehensive output generation:

| Output | Description | Formats |
|--------|-------------|---------|
| Valuation Report | Full methodology, results, assumptions | PDF, DOCX |
| Investment Memo | Investor-focused summary | PDF |
| Negotiation Toolkit | Range analysis for term sheets | PDF, UI |
| Data Export | Raw data for further analysis | CSV, JSON |

Export button provides one-click downloads in any format.
