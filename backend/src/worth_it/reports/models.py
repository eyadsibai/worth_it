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
