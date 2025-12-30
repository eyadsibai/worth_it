"""Tests for report generation module."""

from __future__ import annotations

from worth_it.reports.models import (
    ChartData,
    ReportFormat,
    ReportMetric,
    ReportSection,
    ValuationReportData,
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
        assert metric.formatted_value == "$7.5M"
        assert metric.description == "Discounted value of expected outcomes"

    def test_report_metric_without_description(self) -> None:
        """Test creating a metric without description."""
        metric = ReportMetric(
            name="Value",
            value=1_000_000,
            formatted_value="$1M",
        )
        assert metric.description == ""

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
        assert section.content == "This section summarizes the valuation results."
        assert len(section.metrics) == 1
        assert section.metrics[0].name == "Valuation"

    def test_report_section_with_chart(self) -> None:
        """Test creating a section with chart data."""
        chart = ChartData(
            chart_type="bar",
            title="Scenario Comparison",
            data=[
                {"name": "Best", "value": 15_000_000},
                {"name": "Base", "value": 10_000_000},
            ],
            config={"color": "#1A3D2E"},
        )
        section = ReportSection(
            title="Scenario Analysis",
            content="Analysis of different scenarios.",
            charts=[chart],
        )
        assert len(section.charts) == 1
        assert section.charts[0].chart_type == "bar"

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
        assert report.title == "Startup Valuation Report"
        assert report.company_name == "TechCo Inc."
        assert report.report_date == "2024-01-15"
        assert report.valuation_method == "First Chicago Method"
        assert len(report.sections) == 1
        assert len(report.assumptions) == 2
        assert len(report.disclaimers) == 1

    def test_report_with_industry_and_monte_carlo(self) -> None:
        """Test report with optional fields."""
        report = ValuationReportData(
            title="Full Report",
            company_name="Acme Corp",
            report_date="2024-01-15",
            prepared_by="Worth It",
            valuation_method="DCF",
            sections=[],
            industry="SaaS",
            monte_carlo_enabled=True,
        )
        assert report.industry == "SaaS"
        assert report.monte_carlo_enabled is True

    def test_report_format_enum(self) -> None:
        """Test report format enum values."""
        assert ReportFormat.PDF.value == "pdf"
        assert ReportFormat.DOCX.value == "docx"
        assert ReportFormat.CSV.value == "csv"
        assert ReportFormat.JSON.value == "json"

    def test_chart_data_creation(self) -> None:
        """Test creating chart data."""
        chart = ChartData(
            chart_type="pie",
            title="Scenario Weights",
            data=[
                {"name": "Best", "value": 30},
                {"name": "Base", "value": 50},
                {"name": "Worst", "value": 20},
            ],
        )
        assert chart.chart_type == "pie"
        assert chart.title == "Scenario Weights"
        assert len(chart.data) == 3
        assert chart.config == {}  # Default empty dict
