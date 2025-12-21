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
            if r.get("status") == "completed"
            or (r.get("status") is None and r.get("year", 0) < 0)
        ]
        upcoming = [
            r
            for r in self.rounds
            if r.get("status") == "upcoming"
            or (r.get("status") is None and r.get("year", 0) >= 0)
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
                    if (
                        not future.get("is_safe_note", False)
                        and future["year"] >= r["year"]
                    ):
                        conversion_year = future["year"]
                        break
                safe_map[id(r)] = conversion_year

        return dataclasses.replace(
            self,
            _upcoming=sorted_upcoming,
            _safe_conversions=safe_map,
        )
