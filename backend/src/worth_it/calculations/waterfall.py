"""
Waterfall analysis calculation functions.

This module handles exit proceeds distribution calculations,
respecting liquidation preferences and participation rights.

NOTE: This module is a compatibility shim. The actual implementation
now lives in waterfall_engine.py using the fluent pipeline pattern.
"""

from __future__ import annotations

# Re-export the convenience function for backward compatibility
from worth_it.calculations.waterfall_engine import calculate_waterfall

__all__ = ["calculate_waterfall"]
