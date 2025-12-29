# Phase 5: Output Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive output generation including PDF reports, investment memos, negotiation toolkits, and multiple export formats (PDF, DOCX, CSV, JSON).

**Architecture:** Create a report generation engine that combines valuation results with formatting templates. Use server-side PDF generation with ReportLab for consistency.

**Tech Stack:** Python/ReportLab (PDF), python-docx (DOCX), FastAPI file responses, React for preview/download UI, TDD throughout.

**Prerequisites:** Phases 1-4 complete (valuation methods, Monte Carlo, benchmarks working). Phase 2 patterns: frozen dataclasses for all params/results, Pydantic for API validation. Phase 3 patterns: ParameterDistribution with DistributionType enum, MonteCarloResult for simulation outputs.

**Branch:** Create from `master` (after Phase 4 merge) as `feature/valuation-phase5`

---

## Overview

Phase 5 adds professional output generation:

1. **Valuation Report** - Comprehensive PDF with methodology, results, and assumptions
2. **Investment Memo** - Investor-ready summary with key metrics and charts
3. **Negotiation Toolkit** - Range analysis for term sheet discussions
4. **Export Formats** - PDF, DOCX, CSV, JSON for data portability

---

## Task 1: Report Data Models

**Files:**
- Create: `backend/src/worth_it/reports/__init__.py`
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
        )
        assert section.title == "Valuation Summary"
        assert len(section.metrics) == 1

    def test_full_report_data(self) -> None:
        """Test creating full report data."""
        report = ValuationReportData(
            title="Startup Valuation Report",
            company_name="TechCo Inc.",
            report_date="2024-01-15",
            prepared_by="Worth It Valuation Tool",
            valuation_method="First Chicago Method",
            sections=[
                ReportSection(
                    title="Executive Summary",
                    content="TechCo is valued at $10M using First Chicago Method.",
                    metrics=[],
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

    def test_report_format_enum(self) -> None:
        """Test report format enum values."""
        assert ReportFormat.PDF.value == "pdf"
        assert ReportFormat.DOCX.value == "docx"
        assert ReportFormat.CSV.value == "csv"
        assert ReportFormat.JSON.value == "json"
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_reports.py -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/reports/__init__.py
"""Report generation module for valuation outputs."""

from .models import (
    ValuationReportData,
    ReportSection,
    ReportMetric,
    ChartData,
    ReportFormat,
)

__all__ = [
    "ValuationReportData",
    "ReportSection",
    "ReportMetric",
    "ChartData",
    "ReportFormat",
]
```

```python
# In backend/src/worth_it/reports/models.py
"""Data models for valuation reports."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ReportFormat(Enum):
    """Supported report export formats."""

    PDF = "pdf"
    DOCX = "docx"
    CSV = "csv"
    JSON = "json"


@dataclass(frozen=True)
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


@dataclass(frozen=True)
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


@dataclass(frozen=True)
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


@dataclass(frozen=True)
class ValuationReportData:
    """Complete data for generating a valuation report.

    Attributes:
        title: Report title
        company_name: Name of company being valued
        report_date: Report generation date
        prepared_by: Tool or person generating report
        valuation_method: Valuation method used
        sections: Report sections with content
        assumptions: List of key assumptions
        disclaimers: Legal disclaimers
        industry: Optional industry for context
        monte_carlo_enabled: Whether MC simulation was used
    """

    title: str
    company_name: str
    report_date: str
    prepared_by: str
    valuation_method: str
    sections: list[ReportSection]
    assumptions: list[str] = field(default_factory=list)
    disclaimers: list[str] = field(default_factory=list)
    industry: str | None = None
    monte_carlo_enabled: bool = False
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_reports.py -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/reports/__init__.py backend/src/worth_it/reports/models.py backend/tests/test_reports.py
git commit -m "feat(reports): add report data models"
```

---

## Task 2: PDF Report Generator

**Files:**
- Create: `backend/src/worth_it/reports/pdf_generator.py`
- Test: `backend/tests/test_reports.py`

### Step 1: Write failing test for PDF generation

```python
# Add to backend/tests/test_reports.py
from worth_it.reports.pdf_generator import generate_pdf_report


class TestPDFGenerator:
    """Tests for PDF report generation."""

    def test_generate_simple_pdf(self) -> None:
        """Test generating a simple PDF report."""
        report_data = ValuationReportData(
            title="Valuation Report",
            company_name="TestCo",
            report_date="2024-01-15",
            prepared_by="Worth It",
            valuation_method="First Chicago",
            sections=[
                ReportSection(
                    title="Summary",
                    content="TestCo is valued at $10M.",
                    metrics=[
                        ReportMetric("Valuation", 10_000_000, "$10M", ""),
                    ],
                ),
            ],
            assumptions=["5-year exit"],
            disclaimers=["Not financial advice"],
        )

        pdf_bytes = generate_pdf_report(report_data)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # PDF files start with %PDF
        assert pdf_bytes[:4] == b"%PDF"

    def test_pdf_with_multiple_sections(self) -> None:
        """Test PDF with multiple sections and metrics."""
        report_data = ValuationReportData(
            title="Comprehensive Report",
            company_name="Acme Corp",
            report_date="2024-01-15",
            prepared_by="Worth It",
            valuation_method="First Chicago",
            sections=[
                ReportSection(
                    title="Executive Summary",
                    content="Summary of valuation.",
                    metrics=[
                        ReportMetric("Present Value", 7_500_000, "$7.5M", ""),
                        ReportMetric("Weighted Value", 10_000_000, "$10M", ""),
                    ],
                ),
                ReportSection(
                    title="Scenario Analysis",
                    content="Analysis of different scenarios.",
                    metrics=[
                        ReportMetric("Best Case", 15_000_000, "$15M", ""),
                        ReportMetric("Base Case", 10_000_000, "$10M", ""),
                        ReportMetric("Worst Case", 5_000_000, "$5M", ""),
                    ],
                ),
            ],
        )

        pdf_bytes = generate_pdf_report(report_data)
        assert len(pdf_bytes) > 100
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_reports.py::TestPDFGenerator -v`
Expected: FAIL with import error

### Step 3: Write PDF generator using ReportLab

```python
# In backend/src/worth_it/reports/pdf_generator.py
"""PDF report generation using ReportLab."""

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import ValuationReportData

# Brand colors matching frontend
BRAND_PRIMARY = colors.HexColor("#1A3D2E")
BRAND_SECONDARY = colors.HexColor("#2E5D4B")


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
    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Heading1"],
            fontSize=24,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=BRAND_PRIMARY,
        )
    )

    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontSize=16,
            spaceBefore=24,
            spaceAfter=12,
            textColor=BRAND_PRIMARY,
        )
    )

    styles.add(
        ParagraphStyle(
            name="BodyText",
            parent=styles["Normal"],
            fontSize=11,
            spaceAfter=12,
        )
    )

    styles.add(
        ParagraphStyle(
            name="DisclaimerText",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.grey,
        )
    )

    # Build content
    story = []

    # Title
    story.append(Paragraph(data.title, styles["ReportTitle"]))
    story.append(Spacer(1, 12))

    # Company info table
    info_data = [
        ["Company:", data.company_name],
        ["Date:", data.report_date],
        ["Method:", data.valuation_method],
        ["Prepared by:", data.prepared_by],
    ]
    if data.industry:
        info_data.append(["Industry:", data.industry])

    info_table = Table(info_data, colWidths=[1.5 * inch, 4 * inch])
    info_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 24))

    # Sections
    for section in data.sections:
        story.append(Paragraph(section.title, styles["SectionTitle"]))
        story.append(Paragraph(section.content, styles["BodyText"]))

        # Metrics table
        if section.metrics:
            metrics_data = [["Metric", "Value"]]
            for metric in section.metrics:
                metrics_data.append([metric.name, metric.formatted_value])

            metrics_table = Table(metrics_data, colWidths=[3 * inch, 2 * inch])
            metrics_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ]
                )
            )
            story.append(metrics_table)
            story.append(Spacer(1, 12))

    # Assumptions
    if data.assumptions:
        story.append(Paragraph("Key Assumptions", styles["SectionTitle"]))
        for assumption in data.assumptions:
            story.append(Paragraph(f"• {assumption}", styles["BodyText"]))

    # Disclaimers
    if data.disclaimers:
        story.append(Spacer(1, 24))
        story.append(Paragraph("Disclaimers", styles["SectionTitle"]))
        for disclaimer in data.disclaimers:
            story.append(Paragraph(disclaimer, styles["DisclaimerText"]))

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
git add backend/src/worth_it/reports/pdf_generator.py backend/pyproject.toml backend/uv.lock
git commit -m "feat(reports): implement PDF report generation with ReportLab"
```

---

## Task 3: Report Builder Service

**Files:**
- Create: `backend/src/worth_it/reports/builder.py`
- Test: `backend/tests/test_reports.py`

### Step 1: Write report builder tests

```python
# Add to backend/tests/test_reports.py
from worth_it.reports.builder import (
    build_first_chicago_report,
    build_pre_revenue_report,
    format_currency,
)


class TestReportBuilder:
    """Tests for report builder service."""

    def test_format_currency_millions(self) -> None:
        """Test formatting large values."""
        assert format_currency(7_500_000) == "$7.5M"
        assert format_currency(10_000_000) == "$10.0M"

    def test_format_currency_thousands(self) -> None:
        """Test formatting medium values."""
        assert format_currency(500_000) == "$500.0K"
        assert format_currency(1_000) == "$1.0K"

    def test_format_currency_small(self) -> None:
        """Test formatting small values."""
        assert format_currency(500) == "$500"

    def test_build_first_chicago_report(self) -> None:
        """Test building First Chicago report."""
        result = {
            "weighted_value": 10_000_000,
            "present_value": 7_500_000,
            "scenario_values": {
                "Best": 15_000_000,
                "Base": 10_000_000,
                "Worst": 5_000_000,
            },
            "scenario_present_values": {
                "Best": 11_000_000,
                "Base": 7_500_000,
                "Worst": 3_800_000,
            },
        }
        params = {"discount_rate": 0.25}

        report = build_first_chicago_report(
            company_name="TestCo",
            result=result,
            params=params,
        )

        assert report.company_name == "TestCo"
        assert report.valuation_method == "First Chicago Method"
        assert len(report.sections) >= 2
        assert any("Summary" in s.title for s in report.sections)
```

### Step 2: Write builder implementation

```python
# In backend/src/worth_it/reports/builder.py
"""Report builder service for creating report data from valuation results."""

from __future__ import annotations

from datetime import date

from .models import ReportMetric, ReportSection, ValuationReportData

DEFAULT_DISCLAIMERS = [
    "This valuation is provided for informational purposes only and does not constitute financial advice.",
    "Past performance does not guarantee future results.",
    "Consult with qualified professionals before making investment decisions.",
]


def format_currency(value: float) -> str:
    """Format value as currency.

    Args:
        value: Numeric value to format

    Returns:
        Formatted string (e.g., "$7.5M", "$500K", "$500")
    """
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif abs(value) >= 1_000:
        return f"${value / 1_000:.1f}K"
    else:
        return f"${value:,.0f}"


def format_percentage(value: float) -> str:
    """Format value as percentage.

    Args:
        value: Decimal value (e.g., 0.25 for 25%)

    Returns:
        Formatted string (e.g., "25%")
    """
    return f"{value * 100:.0f}%"


def build_first_chicago_report(
    company_name: str,
    result: dict,
    params: dict,
    industry: str | None = None,
    monte_carlo_result: dict | None = None,
) -> ValuationReportData:
    """Build a report for First Chicago Method valuation.

    Args:
        company_name: Name of the company
        result: FirstChicagoResult as dict
        params: Original parameters used
        industry: Optional industry name
        monte_carlo_result: Optional MC simulation results

    Returns:
        ValuationReportData ready for export
    """
    sections = []

    # Executive Summary
    sections.append(
        ReportSection(
            title="Executive Summary",
            content=f"Using the First Chicago Method, {company_name} is valued at "
            f"{format_currency(result['present_value'])} (present value). "
            f"This valuation considers {len(result['scenario_values'])} scenarios "
            f"with probability-weighted outcomes.",
            metrics=[
                ReportMetric(
                    name="Present Value",
                    value=result["present_value"],
                    formatted_value=format_currency(result["present_value"]),
                    description="Discounted probability-weighted value",
                ),
                ReportMetric(
                    name="Weighted Exit Value",
                    value=result["weighted_value"],
                    formatted_value=format_currency(result["weighted_value"]),
                    description="Expected exit value before discounting",
                ),
            ],
        )
    )

    # Scenario Analysis
    scenario_metrics = [
        ReportMetric(
            name=f"{name} Scenario",
            value=value,
            formatted_value=format_currency(value),
            description=f"PV: {format_currency(result['scenario_present_values'][name])}",
        )
        for name, value in result["scenario_values"].items()
    ]

    sections.append(
        ReportSection(
            title="Scenario Analysis",
            content="Each scenario represents a possible outcome weighted by its probability.",
            metrics=scenario_metrics,
        )
    )

    # Monte Carlo section if available
    if monte_carlo_result:
        mc_metrics = [
            ReportMetric(
                name="Expected Value (Mean)",
                value=monte_carlo_result.get("mean", 0),
                formatted_value=format_currency(monte_carlo_result.get("mean", 0)),
            ),
            ReportMetric(
                name="Median Value (P50)",
                value=monte_carlo_result.get("percentiles", {}).get("p50", 0),
                formatted_value=format_currency(
                    monte_carlo_result.get("percentiles", {}).get("p50", 0)
                ),
            ),
            ReportMetric(
                name="90% Confidence Range",
                value=0,
                formatted_value=f"{format_currency(monte_carlo_result.get('percentiles', {}).get('p5', 0))} - "
                f"{format_currency(monte_carlo_result.get('percentiles', {}).get('p95', 0))}",
            ),
        ]
        sections.append(
            ReportSection(
                title="Monte Carlo Simulation Results",
                content=f"Based on {monte_carlo_result.get('num_simulations', 10000):,} simulations "
                "with parameter uncertainty modeling.",
                metrics=mc_metrics,
            )
        )

    # Methodology
    sections.append(
        ReportSection(
            title="Methodology",
            content="""The First Chicago Method values a company by:
1. Defining multiple scenarios (typically Best, Base, Worst cases)
2. Assigning probability weights to each scenario
3. Calculating the present value for each scenario
4. Computing the probability-weighted present value

This method is particularly useful for early-stage companies
with high uncertainty about future outcomes.""",
            metrics=[],
        )
    )

    # Build assumptions
    discount_rate = params.get("discount_rate", 0.25)
    assumptions = [
        f"Discount Rate: {format_percentage(discount_rate)}",
        f"Number of Scenarios: {len(result['scenario_values'])}",
    ]

    return ValuationReportData(
        title=f"Valuation Report: {company_name}",
        company_name=company_name,
        report_date=date.today().strftime("%B %d, %Y"),
        prepared_by="Worth It Valuation Calculator",
        valuation_method="First Chicago Method",
        sections=sections,
        assumptions=assumptions,
        disclaimers=DEFAULT_DISCLAIMERS,
        industry=industry,
        monte_carlo_enabled=monte_carlo_result is not None,
    )


def build_pre_revenue_report(
    company_name: str,
    method_name: str,
    result: dict,
    params: dict,
    industry: str | None = None,
) -> ValuationReportData:
    """Build a report for pre-revenue valuation methods.

    Args:
        company_name: Name of the company
        method_name: Method name (Berkus, Scorecard, Risk Factor)
        result: Valuation result as dict
        params: Original parameters used
        industry: Optional industry name

    Returns:
        ValuationReportData ready for export
    """
    sections = []

    valuation = result.get("valuation", 0)

    # Executive Summary
    sections.append(
        ReportSection(
            title="Executive Summary",
            content=f"Using the {method_name}, {company_name} is valued at "
            f"{format_currency(valuation)}.",
            metrics=[
                ReportMetric(
                    name="Valuation",
                    value=valuation,
                    formatted_value=format_currency(valuation),
                    description=f"{method_name} valuation",
                ),
            ],
        )
    )

    # Factor breakdown if available
    if "factors" in result:
        factor_metrics = [
            ReportMetric(
                name=f["name"],
                value=f["value"],
                formatted_value=format_currency(f["value"]),
            )
            for f in result["factors"]
        ]
        sections.append(
            ReportSection(
                title="Factor Breakdown",
                content="Contribution from each evaluation factor.",
                metrics=factor_metrics,
            )
        )

    return ValuationReportData(
        title=f"Valuation Report: {company_name}",
        company_name=company_name,
        report_date=date.today().strftime("%B %d, %Y"),
        prepared_by="Worth It Valuation Calculator",
        valuation_method=method_name,
        sections=sections,
        assumptions=[],
        disclaimers=DEFAULT_DISCLAIMERS,
        industry=industry,
    )
```

### Step 3: Update __init__.py exports

```python
# Update backend/src/worth_it/reports/__init__.py
from .models import (
    ValuationReportData,
    ReportSection,
    ReportMetric,
    ChartData,
    ReportFormat,
)
from .pdf_generator import generate_pdf_report
from .builder import (
    build_first_chicago_report,
    build_pre_revenue_report,
    format_currency,
    format_percentage,
)

__all__ = [
    "ValuationReportData",
    "ReportSection",
    "ReportMetric",
    "ChartData",
    "ReportFormat",
    "generate_pdf_report",
    "build_first_chicago_report",
    "build_pre_revenue_report",
    "format_currency",
    "format_percentage",
]
```

### Step 4: Run tests and commit

```bash
cd backend && uv run pytest tests/test_reports.py -v
git add backend/src/worth_it/reports/builder.py backend/src/worth_it/reports/__init__.py backend/tests/test_reports.py
git commit -m "feat(reports): add report builder service"
```

---

## Task 4: Export API Endpoints

**Files:**
- Create: `backend/src/worth_it/api/routers/export.py`
- Modify: `backend/src/worth_it/api/__init__.py`
- Modify: `backend/src/worth_it/models.py`
- Test: `backend/tests/test_api.py`

### Step 1: Add Pydantic models for export

```python
# Add to backend/src/worth_it/models.py

class ExportRequest(BaseModel):
    """Base request for export operations."""

    company_name: str
    format: str = "pdf"
    industry: str | None = None


class FirstChicagoExportRequest(ExportRequest):
    """Request to export First Chicago valuation."""

    result: dict
    params: dict
    monte_carlo_result: dict | None = None


class PreRevenueExportRequest(ExportRequest):
    """Request to export pre-revenue valuation."""

    method_name: str
    result: dict
    params: dict
```

### Step 2: Create export router

```python
# In backend/src/worth_it/api/routers/export.py
"""Export endpoints for valuation reports."""

from __future__ import annotations

import csv
import json
from io import BytesIO, StringIO

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from worth_it.models import FirstChicagoExportRequest, PreRevenueExportRequest
from worth_it.reports import (
    build_first_chicago_report,
    build_pre_revenue_report,
    generate_pdf_report,
)

router = APIRouter(prefix="/api/export", tags=["export"])


def _create_file_response(
    content: bytes | str,
    filename: str,
    media_type: str,
) -> StreamingResponse:
    """Create a streaming file response."""
    if isinstance(content, str):
        content = content.encode("utf-8")
    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/first-chicago")
async def export_first_chicago(request: FirstChicagoExportRequest) -> StreamingResponse:
    """Export First Chicago valuation in various formats."""
    report_data = build_first_chicago_report(
        company_name=request.company_name,
        result=request.result,
        params=request.params,
        industry=request.industry,
        monte_carlo_result=request.monte_carlo_result,
    )

    safe_name = request.company_name.replace(" ", "_").replace("/", "-")

    if request.format == "pdf":
        pdf_bytes = generate_pdf_report(report_data)
        return _create_file_response(
            pdf_bytes,
            f"{safe_name}_valuation.pdf",
            "application/pdf",
        )

    elif request.format == "json":
        json_data = {
            "company_name": request.company_name,
            "method": "First Chicago",
            "valuation": request.result,
            "parameters": request.params,
            "monte_carlo": request.monte_carlo_result,
        }
        return _create_file_response(
            json.dumps(json_data, indent=2),
            f"{safe_name}_valuation.json",
            "application/json",
        )

    elif request.format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", request.company_name])
        writer.writerow(["Method", "First Chicago"])
        writer.writerow(["Present Value", request.result.get("present_value", 0)])
        writer.writerow(["Weighted Value", request.result.get("weighted_value", 0)])
        for name, value in request.result.get("scenario_values", {}).items():
            writer.writerow([f"{name} Exit Value", value])
        return _create_file_response(
            output.getvalue(),
            f"{safe_name}_valuation.csv",
            "text/csv",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")


@router.post("/pre-revenue")
async def export_pre_revenue(request: PreRevenueExportRequest) -> StreamingResponse:
    """Export pre-revenue valuation in various formats."""
    report_data = build_pre_revenue_report(
        company_name=request.company_name,
        method_name=request.method_name,
        result=request.result,
        params=request.params,
        industry=request.industry,
    )

    safe_name = request.company_name.replace(" ", "_").replace("/", "-")

    if request.format == "pdf":
        pdf_bytes = generate_pdf_report(report_data)
        return _create_file_response(
            pdf_bytes,
            f"{safe_name}_{request.method_name.lower().replace(' ', '_')}_valuation.pdf",
            "application/pdf",
        )

    elif request.format == "json":
        json_data = {
            "company_name": request.company_name,
            "method": request.method_name,
            "valuation": request.result,
            "parameters": request.params,
        }
        return _create_file_response(
            json.dumps(json_data, indent=2),
            f"{safe_name}_valuation.json",
            "application/json",
        )

    elif request.format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", request.company_name])
        writer.writerow(["Method", request.method_name])
        writer.writerow(["Valuation", request.result.get("valuation", 0)])
        return _create_file_response(
            output.getvalue(),
            f"{safe_name}_valuation.csv",
            "text/csv",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
```

### Step 3: Register router in API

```python
# Add to backend/src/worth_it/api/__init__.py
from .routers import export

app.include_router(export.router)
```

### Step 4: Write API tests

```python
# Add to backend/tests/test_api.py

class TestExportAPI:
    """Tests for export API endpoints."""

    def test_export_first_chicago_pdf(self, client: TestClient) -> None:
        """Test exporting First Chicago as PDF."""
        response = client.post(
            "/api/export/first-chicago",
            json={
                "company_name": "TestCo",
                "format": "pdf",
                "result": {
                    "weighted_value": 10_000_000,
                    "present_value": 7_500_000,
                    "scenario_values": {"Best": 15_000_000, "Base": 10_000_000},
                    "scenario_present_values": {"Best": 11_000_000, "Base": 7_500_000},
                },
                "params": {"discount_rate": 0.25},
            },
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content[:4] == b"%PDF"

    def test_export_first_chicago_json(self, client: TestClient) -> None:
        """Test exporting First Chicago as JSON."""
        response = client.post(
            "/api/export/first-chicago",
            json={
                "company_name": "TestCo",
                "format": "json",
                "result": {
                    "weighted_value": 10_000_000,
                    "present_value": 7_500_000,
                    "scenario_values": {},
                    "scenario_present_values": {},
                },
                "params": {},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "TestCo"

    def test_export_first_chicago_csv(self, client: TestClient) -> None:
        """Test exporting First Chicago as CSV."""
        response = client.post(
            "/api/export/first-chicago",
            json={
                "company_name": "TestCo",
                "format": "csv",
                "result": {
                    "weighted_value": 10_000_000,
                    "present_value": 7_500_000,
                    "scenario_values": {},
                    "scenario_present_values": {},
                },
                "params": {},
            },
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

    def test_export_unsupported_format(self, client: TestClient) -> None:
        """Test error for unsupported format."""
        response = client.post(
            "/api/export/first-chicago",
            json={
                "company_name": "TestCo",
                "format": "docx",
                "result": {},
                "params": {},
            },
        )
        assert response.status_code == 400
```

### Step 5: Run tests and commit

```bash
cd backend && uv run pytest tests/test_api.py::TestExportAPI -v
git add backend/src/worth_it/api/routers/export.py backend/src/worth_it/api/__init__.py backend/src/worth_it/models.py backend/tests/test_api.py
git commit -m "feat(api): add export endpoints for valuation reports"
```

---

## Task 5: Frontend - Zod Schemas and API Client

**Files:**
- Modify: `frontend/lib/schemas.ts`
- Modify: `frontend/lib/api-client.ts`

### Step 1: Add export types

```typescript
// Add to frontend/lib/schemas.ts

// ============================================================================
// Export Schemas (Phase 5)
// ============================================================================

export const ExportFormatSchema = z.enum(["pdf", "json", "csv"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
```

### Step 2: Add API client methods

```typescript
// Add to frontend/lib/api-client.ts

  /**
   * Export First Chicago valuation report.
   * Returns a blob for file download.
   */
  async exportFirstChicago(
    companyName: string,
    result: Record<string, unknown>,
    params: Record<string, unknown>,
    format: "pdf" | "json" | "csv" = "pdf",
    industry?: string,
    monteCarloResult?: Record<string, unknown>
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/export/first-chicago`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        result,
        params,
        format,
        industry,
        monte_carlo_result: monteCarloResult,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Export pre-revenue valuation report.
   */
  async exportPreRevenue(
    companyName: string,
    methodName: string,
    result: Record<string, unknown>,
    params: Record<string, unknown>,
    format: "pdf" | "json" | "csv" = "pdf",
    industry?: string
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/export/pre-revenue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        method_name: methodName,
        result,
        params,
        format,
        industry,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }
```

### Step 3: Commit

```bash
git add frontend/lib/schemas.ts frontend/lib/api-client.ts
git commit -m "feat(frontend): add export schemas and API client methods"
```

---

## Task 6: Frontend - Export Button Component

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
import { apiClient } from '@/lib/api-client';

interface ExportButtonProps {
  companyName: string;
  methodType: 'first-chicago' | 'pre-revenue';
  result: Record<string, unknown>;
  params: Record<string, unknown>;
  methodName?: string;
  industry?: string;
  monteCarloResult?: Record<string, unknown>;
  disabled?: boolean;
}

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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'pdf' | 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const safeName = companyName.replace(/\s+/g, '_').replace(/\//g, '-');
      const ext = format;

      let blob: Blob;
      if (methodType === 'first-chicago') {
        blob = await apiClient.exportFirstChicago(
          companyName,
          result,
          params,
          format,
          industry,
          monteCarloResult
        );
      } else {
        blob = await apiClient.exportPreRevenue(
          companyName,
          methodName || 'Valuation',
          result,
          params,
          format,
          industry
        );
      }

      downloadBlob(blob, `${safeName}_valuation.${ext}`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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

## Task 7: Negotiation Range Calculator

**Files:**
- Create: `backend/src/worth_it/reports/negotiation.py`
- Test: `backend/tests/test_reports.py`

### Step 1: Write negotiation range tests

```python
# Add to backend/tests/test_reports.py
from worth_it.reports.negotiation import (
    NegotiationRange,
    calculate_negotiation_range,
)


class TestNegotiationRange:
    """Tests for negotiation range calculator."""

    def test_range_from_valuation(self) -> None:
        """Test calculating range from base valuation."""
        result = calculate_negotiation_range(valuation=10_000_000)

        assert result.floor < result.conservative
        assert result.conservative < result.target
        assert result.target < result.aggressive
        assert result.aggressive < result.ceiling
        assert result.target == 10_000_000

    def test_range_with_monte_carlo(self) -> None:
        """Test range using Monte Carlo percentiles."""
        result = calculate_negotiation_range(
            valuation=10_000_000,
            monte_carlo_percentiles={
                "p10": 7_000_000,
                "p25": 8_500_000,
                "p50": 10_000_000,
                "p75": 12_000_000,
                "p90": 15_000_000,
            },
        )

        assert result.floor == 7_000_000
        assert result.conservative == 8_500_000
        assert result.target == 10_000_000
        assert result.aggressive == 12_000_000
        assert result.ceiling == 15_000_000
```

### Step 2: Implement negotiation range

```python
# In backend/src/worth_it/reports/negotiation.py
"""Negotiation toolkit for term sheet discussions."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
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
            floor=monte_carlo_percentiles.get("p10", valuation * 0.7),
            conservative=monte_carlo_percentiles.get("p25", valuation * 0.85),
            target=monte_carlo_percentiles.get("p50", valuation),
            aggressive=monte_carlo_percentiles.get("p75", valuation * 1.15),
            ceiling=monte_carlo_percentiles.get("p90", valuation * 1.3),
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

### Step 3: Export and commit

```bash
git add backend/src/worth_it/reports/negotiation.py backend/tests/test_reports.py
git commit -m "feat(reports): add negotiation range calculator"
```

---

## Task 8: Frontend - Negotiation Range Display

**Files:**
- Create: `frontend/components/valuation/negotiation-range.tsx`

### Step 1: Create negotiation range visualization

```typescript
// In frontend/components/valuation/negotiation-range.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format-utils';

interface NegotiationRangeProps {
  floor: number;
  conservative: number;
  target: number;
  aggressive: number;
  ceiling: number;
}

export function NegotiationRange({
  floor,
  conservative,
  target,
  aggressive,
  ceiling,
}: NegotiationRangeProps) {
  const ranges = [
    { label: 'Floor', value: floor, color: 'bg-red-500', description: 'Walk away below this' },
    { label: 'Conservative', value: conservative, color: 'bg-orange-500', description: 'Defensible lower bound' },
    { label: 'Target', value: target, color: 'bg-green-500', description: 'Ideal outcome' },
    { label: 'Aggressive', value: aggressive, color: 'bg-blue-500', description: 'Stretch goal' },
    { label: 'Ceiling', value: ceiling, color: 'bg-purple-500', description: 'Maximum ask' },
  ];

  const min = floor;
  const max = ceiling;
  const range = max - min;

  const getPosition = (value: number) => ((value - min) / range) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Negotiation Range
          <Badge variant="secondary">Term Sheet Strategy</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual range bar */}
        <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
          {ranges.map((r, i) => (
            <div
              key={r.label}
              className={`absolute top-0 h-full w-1 ${r.color}`}
              style={{ left: `${getPosition(r.value)}%` }}
            />
          ))}
          {/* Target highlight */}
          <div
            className="absolute top-0 h-full bg-green-500/20"
            style={{
              left: `${getPosition(conservative)}%`,
              width: `${getPosition(aggressive) - getPosition(conservative)}%`,
            }}
          />
        </div>

        {/* Legend */}
        <div className="grid gap-3">
          {ranges.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${r.color}`} />
                <div>
                  <span className="font-medium">{r.label}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {r.description}
                  </span>
                </div>
              </div>
              <span className="font-mono font-medium">
                {formatCurrency(r.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Strategy:</strong> Open at {formatCurrency(aggressive)},
            aim for {formatCurrency(target)}, and accept down to {formatCurrency(conservative)}.
            Walk away below {formatCurrency(floor)}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/negotiation-range.tsx
git commit -m "feat(frontend): add NegotiationRange visualization component"
```

---

## Task 9: Integration & E2E Tests

**Files:**
- Modify: `frontend/components/valuation/first-chicago-results.tsx`
- Modify: `playwright/tests/27-valuation-calculator.spec.ts`

### Step 1: Add export button to results component

Integrate the ExportButton into the First Chicago results display.

### Step 2: Add E2E tests

```typescript
// Add to playwright/tests/27-valuation-calculator.spec.ts

test.describe('Export Functionality', () => {
  test('should show export button after valuation', async ({ page }) => {
    await page.goto('/valuation');
    // Complete a valuation...
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });

  test('should show export format options', async ({ page }) => {
    await page.goto('/valuation');
    // Complete a valuation...
    await page.getByRole('button', { name: /export/i }).click();
    await expect(page.getByText(/pdf report/i)).toBeVisible();
    await expect(page.getByText(/csv data/i)).toBeVisible();
    await expect(page.getByText(/json data/i)).toBeVisible();
  });
});
```

### Step 3: Run tests and commit

```bash
cd playwright && npx playwright test tests/27-valuation-calculator.spec.ts
git add frontend/components/valuation/first-chicago-results.tsx playwright/tests/27-valuation-calculator.spec.ts
git commit -m "feat(valuation): integrate export functionality and add E2E tests"
```

---

## Final Verification

Run all tests and push:
```bash
cd backend && uv run pytest -v
cd frontend && npm run type-check && npm run lint
./scripts/run-e2e-tests.sh
git push origin feature/valuation-phase5
```

---

## Summary

Phase 5 adds comprehensive output generation:

| Output | Description | Formats |
|--------|-------------|---------|
| Valuation Report | Full methodology, results, assumptions | PDF, JSON, CSV |
| Negotiation Toolkit | Range analysis for term sheets | UI Component |
| Export Button | One-click download | PDF, JSON, CSV |

| API Endpoint | Method | Description |
|--------------|--------|-------------|
| `/api/export/first-chicago` | POST | Export First Chicago report |
| `/api/export/pre-revenue` | POST | Export pre-revenue report |

| Frontend Component | Purpose |
|--------------------|---------|
| `ExportButton` | Format selection and download trigger |
| `NegotiationRange` | Visual range display with strategy |
