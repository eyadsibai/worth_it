"""Pytest configuration for backend tests.

This file is loaded before test modules, allowing us to configure
the test environment before any application code is imported.
"""

import os

# Disable rate limiting during tests to prevent test interference
os.environ["RATE_LIMIT_ENABLED"] = "false"
