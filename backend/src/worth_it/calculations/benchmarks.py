"""Industry benchmark data for valuation parameters.

Provides sector-specific benchmarks for validating valuation inputs
and suggesting reasonable parameter ranges.

Phase 4: Industry Benchmarks Implementation
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


@dataclass(frozen=True)
class BenchmarkMetric:
    """A single benchmark metric with range values.

    Attributes:
        name: Metric identifier (e.g., "revenue_multiple", "discount_rate")
        min_value: Absolute minimum (anything below is an error)
        typical_low: Lower bound of typical range (25th percentile)
        median: Industry median value (50th percentile)
        typical_high: Upper bound of typical range (75th percentile)
        max_value: Absolute maximum (anything above is an error)
        unit: Display unit (e.g., "x", "%", "$")
    """

    name: str
    min_value: float
    typical_low: float
    median: float
    typical_high: float
    max_value: float
    unit: str


@dataclass(frozen=True)
class IndustryBenchmark:
    """Benchmark data for a specific industry.

    Attributes:
        code: Unique identifier (e.g., "saas", "fintech")
        name: Display name (e.g., "SaaS / Software")
        description: Brief description of the industry
        metrics: Dictionary of metric name to BenchmarkMetric
    """

    code: str
    name: str
    description: str
    metrics: dict[str, BenchmarkMetric]


@dataclass(frozen=True)
class ValidationResult:
    """Result of validating a value against benchmarks.

    Attributes:
        is_valid: Whether the value is within acceptable range
        severity: "ok", "warning", or "error"
        message: Human-readable explanation
        benchmark_median: The benchmark median for comparison
        suggested_range: Tuple of (typical_low, typical_high)
    """

    is_valid: bool
    severity: Literal["ok", "warning", "error"]
    message: str
    benchmark_median: float
    suggested_range: tuple[float, float] | None = None


# Module-level cache for benchmark data
_BENCHMARKS: dict[str, IndustryBenchmark] = {}


def _load_benchmarks() -> None:
    """Load benchmark data from JSON file."""
    global _BENCHMARKS
    if _BENCHMARKS:
        return

    data_path = Path(__file__).parent.parent / "data" / "industry_benchmarks.json"
    with open(data_path) as f:
        data = json.load(f)

    for industry in data["industries"]:
        metrics = {
            m["name"]: BenchmarkMetric(
                name=m["name"],
                min_value=m["min_value"],
                typical_low=m["typical_low"],
                median=m["median"],
                typical_high=m["typical_high"],
                max_value=m["max_value"],
                unit=m["unit"],
            )
            for m in industry["metrics"]
        }
        _BENCHMARKS[industry["code"]] = IndustryBenchmark(
            code=industry["code"],
            name=industry["name"],
            description=industry.get("description", ""),
            metrics=metrics,
        )


def get_benchmark(industry_code: str) -> IndustryBenchmark | None:
    """Get benchmark for an industry by code.

    Args:
        industry_code: Industry identifier (e.g., "saas")

    Returns:
        IndustryBenchmark or None if not found
    """
    _load_benchmarks()
    return _BENCHMARKS.get(industry_code)


def get_all_industries() -> list[IndustryBenchmark]:
    """Get all available industry benchmarks.

    Returns:
        List of all IndustryBenchmark objects
    """
    _load_benchmarks()
    return list(_BENCHMARKS.values())


def validate_against_benchmark(
    industry_code: str,
    metric_name: str,
    value: float,
) -> ValidationResult:
    """Validate a value against industry benchmarks.

    Args:
        industry_code: Industry to compare against
        metric_name: Metric being validated
        value: The value to validate

    Returns:
        ValidationResult with severity and message
    """
    benchmark = get_benchmark(industry_code)
    if not benchmark:
        return ValidationResult(
            is_valid=True,
            severity="ok",
            message="No benchmark data available for this industry",
            benchmark_median=0,
        )

    metric = benchmark.metrics.get(metric_name)
    if not metric:
        return ValidationResult(
            is_valid=True,
            severity="ok",
            message=f"No benchmark for {metric_name} in {industry_code}",
            benchmark_median=0,
        )

    suggested_range = (metric.typical_low, metric.typical_high)

    # Check ranges
    if value < metric.min_value:
        return ValidationResult(
            is_valid=False,
            severity="error",
            message=f"Value {value}{metric.unit} is below minimum ({metric.min_value}{metric.unit}) for {benchmark.name}",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    if value > metric.max_value:
        return ValidationResult(
            is_valid=False,
            severity="error",
            message=f"Value {value}{metric.unit} is above maximum ({metric.max_value}{metric.unit}) for {benchmark.name}",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    if value < metric.typical_low:
        return ValidationResult(
            is_valid=True,
            severity="warning",
            message=f"Value {value}{metric.unit} is below typical range ({metric.typical_low}-{metric.typical_high}{metric.unit})",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    if value > metric.typical_high:
        return ValidationResult(
            is_valid=True,
            severity="warning",
            message=f"Value {value}{metric.unit} is above typical range ({metric.typical_low}-{metric.typical_high}{metric.unit})",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    return ValidationResult(
        is_valid=True,
        severity="ok",
        message="Value is within typical industry range",
        benchmark_median=metric.median,
        suggested_range=suggested_range,
    )
