"""
Dilution calculation engine using fluent pipeline pattern.

This module provides a composable, immutable pipeline for calculating
dilution schedules from funding rounds. It handles:
- Historical (completed) dilution applied from day 0
- Future dilution applied at round year
- SAFE note conversion timing (converts at next priced round)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class DilutionResult:
    """Immutable result from dilution pipeline."""

    yearly_factors: np.ndarray
    total_dilution: float
    historical_factor: float = 1.0
