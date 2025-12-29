"""Tests for industry benchmark data and validation.

Phase 4: Industry Benchmarks Implementation
"""

from worth_it.calculations.benchmarks import (
    BenchmarkMetric,
    IndustryBenchmark,
    get_all_industries,
    get_benchmark,
    validate_against_benchmark,
)


class TestBenchmarkStructure:
    """Tests for benchmark data structure."""

    def test_benchmark_metric_creation(self) -> None:
        """Test creating a benchmark metric."""
        metric = BenchmarkMetric(
            name="revenue_multiple",
            min_value=2.0,
            typical_low=4.0,
            median=6.0,
            typical_high=10.0,
            max_value=20.0,
            unit="x",
        )
        assert metric.median == 6.0
        assert metric.unit == "x"

    def test_industry_benchmark_creation(self) -> None:
        """Test creating an industry benchmark."""
        benchmark = IndustryBenchmark(
            code="saas",
            name="SaaS / Software",
            description="Software-as-a-Service companies",
            metrics={
                "revenue_multiple": BenchmarkMetric(
                    name="revenue_multiple",
                    min_value=2.0,
                    typical_low=4.0,
                    median=6.0,
                    typical_high=10.0,
                    max_value=20.0,
                    unit="x",
                ),
            },
        )
        assert benchmark.code == "saas"
        assert "revenue_multiple" in benchmark.metrics


class TestBenchmarkLookup:
    """Tests for benchmark lookup functions."""

    def test_get_benchmark_by_industry(self) -> None:
        """Test retrieving benchmark by industry code."""
        benchmark = get_benchmark("saas")
        assert benchmark is not None
        assert benchmark.name == "SaaS / Software"

    def test_get_all_industries(self) -> None:
        """Test getting list of all industries."""
        industries = get_all_industries()
        assert len(industries) >= 15
        assert any(i.code == "saas" for i in industries)
        assert any(i.code == "fintech" for i in industries)

    def test_unknown_industry_returns_none(self) -> None:
        """Test that unknown industry returns None."""
        benchmark = get_benchmark("unknown_industry_xyz")
        assert benchmark is None


class TestBenchmarkValidation:
    """Tests for validating inputs against benchmarks."""

    def test_value_within_typical_range(self) -> None:
        """Test value within typical range passes."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=6.0,
        )
        assert result.is_valid
        assert result.severity == "ok"

    def test_value_outside_typical_but_within_range(self) -> None:
        """Test value outside typical range but within min/max."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=15.0,
        )
        assert result.is_valid
        assert result.severity == "warning"
        assert "above typical" in result.message.lower()

    def test_value_below_typical_range(self) -> None:
        """Test value below typical range triggers warning."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=2.5,
        )
        assert result.is_valid
        assert result.severity == "warning"
        assert "below typical" in result.message.lower()

    def test_value_outside_range(self) -> None:
        """Test value completely outside range."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=30.0,
        )
        assert not result.is_valid
        assert result.severity == "error"

    def test_value_below_minimum(self) -> None:
        """Test value below minimum triggers error."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=0.5,
        )
        assert not result.is_valid
        assert result.severity == "error"

    def test_unknown_industry_passes(self) -> None:
        """Test that unknown industry returns ok (no benchmark)."""
        result = validate_against_benchmark(
            industry_code="unknown_xyz",
            metric_name="revenue_multiple",
            value=100.0,
        )
        assert result.is_valid
        assert result.severity == "ok"

    def test_unknown_metric_passes(self) -> None:
        """Test that unknown metric returns ok."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="unknown_metric",
            value=100.0,
        )
        assert result.is_valid
        assert result.severity == "ok"
