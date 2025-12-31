"""Tests for report generation module."""

from __future__ import annotations

import pytest

from worth_it.reports.builder import (
    build_first_chicago_report,
    build_pre_revenue_report,
    format_currency,
    format_percentage,
)
from worth_it.reports.models import (
    ChartData,
    ReportFormat,
    ReportMetric,
    ReportSection,
    ValuationReportData,
)
from worth_it.reports.pdf_generator import generate_pdf_report


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

    def test_format_percentage(self) -> None:
        """Test percentage formatting."""
        assert format_percentage(0.25) == "25%"
        assert format_percentage(0.10) == "10%"
        assert format_percentage(0.075) == "8%"  # Rounds to nearest

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

    def test_first_chicago_with_monte_carlo(self) -> None:
        """Test First Chicago with Monte Carlo results."""
        result = {
            "weighted_value": 10_000_000,
            "present_value": 7_500_000,
            "scenario_values": {"Base": 10_000_000},
            "scenario_present_values": {"Base": 7_500_000},
        }
        monte_carlo = {
            "mean": 8_000_000,
            "num_simulations": 10000,
            "percentiles": {"p5": 4_000_000, "p50": 7_800_000, "p95": 14_000_000},
        }

        report = build_first_chicago_report(
            company_name="MCCo",
            result=result,
            params={},
            monte_carlo_result=monte_carlo,
        )

        assert report.monte_carlo_enabled is True
        assert any("Monte Carlo" in s.title for s in report.sections)

    def test_build_pre_revenue_report(self) -> None:
        """Test building pre-revenue valuation report."""
        result = {
            "valuation": 2_500_000,
            "factors": [
                {"name": "Sound Idea", "value": 500_000},
                {"name": "Prototype", "value": 500_000},
                {"name": "Team", "value": 500_000},
                {"name": "Strategic Relationships", "value": 500_000},
                {"name": "Product Rollout", "value": 500_000},
            ],
        }

        report = build_pre_revenue_report(
            company_name="StartupCo",
            method_name="Berkus Method",
            result=result,
            params={},
            industry="SaaS",
        )

        assert report.company_name == "StartupCo"
        assert report.valuation_method == "Berkus Method"
        assert report.industry == "SaaS"
        assert len(report.sections) >= 1


class TestPDFGenerator:
    """Tests for PDF report generation."""

    def test_generate_simple_pdf(self) -> None:
        """Test generating a simple PDF report."""
        report_data = ValuationReportData(
            title="Test Valuation Report",
            company_name="Test Company",
            report_date="2024-01-15",
            prepared_by="Worth It",
            valuation_method="First Chicago",
            sections=[
                ReportSection(
                    title="Summary",
                    content="This is a test summary.",
                    metrics=[
                        ReportMetric("Valuation", 10_000_000, "$10M", "Primary value"),
                    ],
                ),
            ],
        )
        pdf_bytes = generate_pdf_report(report_data)
        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 100  # Should have substantial content

    def test_pdf_with_multiple_sections(self) -> None:
        """Test PDF with multiple sections and metrics."""
        report_data = ValuationReportData(
            title="Full Valuation Report",
            company_name="Acme Corp",
            report_date="2024-01-20",
            prepared_by="Worth It Valuation Tool",
            valuation_method="DCF Analysis",
            sections=[
                ReportSection(
                    title="Executive Summary",
                    content="Acme Corp is valued at $15M.",
                    metrics=[
                        ReportMetric("Present Value", 15_000_000, "$15M", "NPV"),
                    ],
                ),
                ReportSection(
                    title="Scenario Analysis",
                    content="Three scenarios were analyzed.",
                    metrics=[
                        ReportMetric("Best Case", 25_000_000, "$25M", "Optimistic"),
                        ReportMetric("Base Case", 15_000_000, "$15M", "Expected"),
                        ReportMetric("Worst Case", 5_000_000, "$5M", "Conservative"),
                    ],
                ),
            ],
            assumptions=["5-year timeline", "25% discount rate"],
            disclaimers=["This is not financial advice."],
        )
        pdf_bytes = generate_pdf_report(report_data)
        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 500  # Multi-section should be larger

    def test_pdf_with_industry_and_monte_carlo(self) -> None:
        """Test PDF includes optional fields."""
        report_data = ValuationReportData(
            title="SaaS Valuation",
            company_name="CloudCo",
            report_date="2024-02-01",
            prepared_by="Worth It",
            valuation_method="Revenue Multiple",
            sections=[],
            industry="SaaS",
            monte_carlo_enabled=True,
        )
        pdf_bytes = generate_pdf_report(report_data)
        assert pdf_bytes.startswith(b"%PDF")


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


class TestNegotiationRange:
    """Tests for negotiation range calculator."""

    def test_range_from_valuation(self) -> None:
        """Test calculating negotiation range from base valuation."""
        from worth_it.reports.negotiation import (
            NegotiationRange,
            calculate_negotiation_range,
        )

        result = calculate_negotiation_range(valuation=10_000_000)

        # Verify range ordering
        assert result.floor < result.conservative
        assert result.conservative < result.target
        assert result.target < result.aggressive
        assert result.aggressive < result.ceiling

        # Target should equal the base valuation
        assert result.target == 10_000_000

        # Verify it's a NegotiationRange
        assert isinstance(result, NegotiationRange)

    def test_range_with_monte_carlo(self) -> None:
        """Test using Monte Carlo percentiles for more accurate range."""
        from worth_it.reports.negotiation import calculate_negotiation_range

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

        # When Monte Carlo is available, use those percentiles
        assert result.floor == 7_000_000  # p10
        assert result.conservative == 8_500_000  # p25
        assert result.target == 10_000_000  # p50 or base valuation
        assert result.aggressive == 12_000_000  # p75
        assert result.ceiling == 15_000_000  # p90

    def test_range_without_monte_carlo_uses_variance(self) -> None:
        """Test fallback to variance multipliers without Monte Carlo."""
        from worth_it.reports.negotiation import calculate_negotiation_range

        result = calculate_negotiation_range(valuation=10_000_000)

        # Without Monte Carlo, use standard variance multipliers
        assert result.floor == 7_000_000  # 0.7x
        assert result.conservative == 8_500_000  # 0.85x
        assert result.target == 10_000_000  # 1.0x
        assert result.aggressive == 12_000_000  # 1.2x
        assert result.ceiling == 15_000_000  # 1.5x

    def test_range_with_incomplete_monte_carlo_falls_back(self) -> None:
        """Test fallback when Monte Carlo percentiles are incomplete."""
        from worth_it.reports.negotiation import calculate_negotiation_range

        # Missing p90 key - should fall back to variance multipliers
        result = calculate_negotiation_range(
            valuation=10_000_000,
            monte_carlo_percentiles={
                "p10": 7_000_000,
                "p25": 8_500_000,
                "p50": 10_000_000,
                "p75": 12_000_000,
                # missing p90
            },
        )

        # Should use standard variance multipliers, not crash
        assert result.floor == 7_000_000  # 0.7x
        assert result.conservative == 8_500_000  # 0.85x
        assert result.target == 10_000_000  # 1.0x
        assert result.aggressive == 12_000_000  # 1.2x
        assert result.ceiling == 15_000_000  # 1.5x

    def test_range_immutability(self) -> None:
        """Test that NegotiationRange is immutable (frozen dataclass)."""
        import dataclasses

        from worth_it.reports.negotiation import calculate_negotiation_range

        result = calculate_negotiation_range(valuation=10_000_000)

        # Verify it's frozen
        assert dataclasses.is_dataclass(result)

        # Attempting to modify should raise FrozenInstanceError
        with pytest.raises(dataclasses.FrozenInstanceError):
            result.target = 5_000_000  # type: ignore

    def test_range_with_zero_valuation(self) -> None:
        """Test edge case with zero valuation."""
        from worth_it.reports.negotiation import calculate_negotiation_range

        result = calculate_negotiation_range(valuation=0)

        assert result.floor == 0
        assert result.conservative == 0
        assert result.target == 0
        assert result.aggressive == 0
        assert result.ceiling == 0

    def test_range_with_small_valuation(self) -> None:
        """Test with a small valuation to ensure proper rounding."""
        from worth_it.reports.negotiation import calculate_negotiation_range

        result = calculate_negotiation_range(valuation=100_000)

        assert result.floor == 70_000  # 0.7x
        assert result.conservative == 85_000  # 0.85x
        assert result.target == 100_000  # 1.0x
        assert result.aggressive == 120_000  # 1.2x
        assert result.ceiling == 150_000  # 1.5x
