"""
Dilution calculation engine using fluent pipeline pattern.

This module provides a composable, immutable pipeline for calculating
dilution schedules from funding rounds. It handles:
- Historical (completed) dilution applied from day 0
- Future dilution applied at round year
- SAFE note conversion timing (converts at next priced round)
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class DilutionResult:
    """Immutable result from dilution pipeline."""

    yearly_factors: np.ndarray
    total_dilution: float
    historical_factor: float = 1.0
    round_factors: list[float] = field(default_factory=list)
    """Cumulative stake-remaining factor immediately after each round is
    fully priced in, parallel to (same length and order as) the `rounds`
    list passed to the pipeline. This is what a per-round table renders
    instead of recomputing its own cumulative product - see `build()`."""


@dataclass(frozen=True)
class DilutionPipeline:
    """
    Fluent pipeline for calculating dilution schedules.

    Each method returns a new immutable instance, allowing chaining.

    Usage:
        result = (
            DilutionPipeline(years)
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
    """

    years: pd.Index | range
    rounds: list[dict[str, Any]] = field(default_factory=list)
    _completed: list[dict[str, Any]] = field(default_factory=list)
    _upcoming: list[dict[str, Any]] = field(default_factory=list)
    _historical_factor: float = 1.0
    _safe_conversions: dict[int, int | None] = field(default_factory=dict)
    _yearly_factors: np.ndarray | None = None

    def with_rounds(self, rounds: list[dict[str, Any]] | None) -> DilutionPipeline:
        """Add funding rounds to the pipeline."""
        return dataclasses.replace(self, rounds=rounds or [])

    def with_simulated_dilution(self, dilution: float) -> DilutionResult:
        """Shortcut: apply pre-computed dilution and return result immediately."""
        factor = 1 - dilution
        factors = np.full(len(self.years), factor)
        return DilutionResult(
            yearly_factors=factors,
            total_dilution=dilution,
            historical_factor=factor,
        )

    def classify(self) -> DilutionPipeline:
        """Separate rounds into completed (historical) vs upcoming (future).

        Classification logic:
        - Rounds with status='completed' go to completed list
        - Rounds with status='upcoming' go to upcoming list
        - If no status: negative years are completed, year >= 0 are upcoming
        """
        completed = [
            r
            for r in self.rounds
            if r.get("status") == "completed" or (r.get("status") is None and r.get("year", 0) < 0)
        ]
        upcoming = [
            r
            for r in self.rounds
            if r.get("status") == "upcoming" or (r.get("status") is None and r.get("year", 0) >= 0)
        ]
        return dataclasses.replace(self, _completed=completed, _upcoming=upcoming)

    def apply_historical(self) -> DilutionPipeline:
        """Calculate and store historical dilution factor.

        Multiplies together (1 - dilution) for each completed round.
        This factor represents the cumulative dilution from all
        historical rounds, applied from day 0.
        """
        factor = 1.0
        for r in self._completed:
            factor *= 1 - r.get("dilution", 0)
        return dataclasses.replace(self, _historical_factor=factor)

    def apply_safe_conversions(self) -> DilutionPipeline:
        """Map SAFE notes to their conversion year (next priced round).

        SAFE notes don't dilute immediately - they convert when a priced
        round occurs at or after their year. This method:
        1. Sorts upcoming rounds by year
        2. For each SAFE, finds the next priced round at or after its year
        3. Maps SAFE round id -> conversion year (or None if no priced round)
        """
        sorted_upcoming = sorted(self._upcoming, key=lambda r: r["year"])
        safe_map: dict[int, int | None] = {}

        for r in sorted_upcoming:
            if r.get("is_safe_note", False):
                # Find next priced round at or after this SAFE
                conversion_year = None
                for future in sorted_upcoming:
                    if not future.get("is_safe_note", False) and future["year"] >= r["year"]:
                        conversion_year = future["year"]
                        break
                safe_map[id(r)] = conversion_year

        return dataclasses.replace(
            self,
            _upcoming=sorted_upcoming,
            _safe_conversions=safe_map,
        )

    def _factor_at_year(self, year: int) -> float:
        """Cumulative stake-remaining factor at a given year, honoring SAFE
        conversion timing:
        - Start with the historical factor (from completed rounds)
        - Apply priced rounds that occur at or before the year
        - Apply SAFEs at their conversion year (next priced round)

        Factored out of `apply_future_rounds()` so the per-round breakdown
        (`build()`'s `round_factors`) can reuse this exact formula instead of
        a second implementation that could drift from it.
        """
        cumulative = self._historical_factor
        for r in self._upcoming:
            dilution = r.get("dilution", 0)
            if r.get("is_safe_note", False):
                # SAFE: only dilutes at conversion year
                conv_year = self._safe_conversions.get(id(r))
                if conv_year is not None and year >= conv_year:
                    cumulative *= 1 - dilution
            elif r["year"] <= year:
                # Priced round: dilutes at its own year
                cumulative *= 1 - dilution
        return cumulative

    def apply_future_rounds(self) -> DilutionPipeline:
        """Calculate yearly factors applying future dilution at correct years.

        Returns new pipeline instance with _yearly_factors populated.
        """
        factors = [self._factor_at_year(year) for year in self.years]
        return dataclasses.replace(self, _yearly_factors=np.array(factors))

    def _round_stake_factors(self) -> dict[int, float]:
        """Cumulative stake-remaining factor immediately after each round is
        fully priced in, keyed by `id(round)`.

        Completed rounds compound sequentially in year order (their order
        relative to each other isn't otherwise observable, since the backend
        applies them all from day 0 as a single `historical_factor`).
        Upcoming rounds reuse `_factor_at_year()` - the exact formula
        `apply_future_rounds()` uses - so a SAFE's own row shows no change and
        the round that triggers its conversion carries both dilutions at
        once, in agreement with `yearly_factors` at that year by construction.
        """
        factors: dict[int, float] = {}
        completed_factor = 1.0
        for r in sorted(self._completed, key=lambda x: x["year"]):
            completed_factor *= 1 - r.get("dilution", 0)
            factors[id(r)] = completed_factor
        for r in self._upcoming:
            factors[id(r)] = self._factor_at_year(r["year"])
        return factors

    def build(self) -> DilutionResult:
        """Finalize pipeline and return DilutionResult.

        Handles the case where apply_future_rounds() wasn't called
        by returning an array of ones (no dilution).

        Total dilution is calculated as 1 - final yearly factor.
        """
        if self._yearly_factors is not None:
            factors = self._yearly_factors
        else:
            factors = np.ones(len(self.years))

        total = 1 - factors[-1] if len(factors) > 0 else 0.0

        round_stake_factors = self._round_stake_factors()
        round_factors = [round_stake_factors.get(id(r), 1.0) for r in self.rounds]

        return DilutionResult(
            yearly_factors=factors,
            total_dilution=total,
            historical_factor=self._historical_factor,
            round_factors=round_factors,
        )


def calculate_dilution_schedule(
    years: pd.Index | range,
    rounds: list[dict[str, Any]] | None = None,
    simulated_dilution: float | None = None,
) -> DilutionResult:
    """Convenience wrapper for common dilution calculations.

    Provides a simple function API for the fluent pipeline. Use this
    when you don't need to inspect intermediate pipeline states.

    Args:
        years: Timeline of years (range or pandas Index)
        rounds: List of funding round dicts with year, dilution, etc.
        simulated_dilution: If provided, bypasses round calculation
            and applies uniform dilution across all years.

    Returns:
        DilutionResult with yearly_factors, total_dilution, historical_factor
    """
    pipeline = DilutionPipeline(years)

    if simulated_dilution is not None:
        return pipeline.with_simulated_dilution(simulated_dilution)

    return (
        pipeline.with_rounds(rounds)
        .classify()
        .apply_historical()
        .apply_safe_conversions()
        .apply_future_rounds()
        .build()
    )
