"""Custom exceptions for the Worth It application.

These exceptions provide semantic meaning to errors and allow for
proper error handling without exposing implementation details.
"""


class WorthItError(Exception):
    """Base exception for all Worth It application errors."""

    pass


class CalculationError(WorthItError):
    """Raised when a financial calculation fails.

    This is typically due to invalid input parameters or edge cases
    in the calculation logic (e.g., division by zero, negative values).
    """

    pass


class ValidationError(WorthItError):
    """Raised when input validation fails.

    This is raised when the input data doesn't meet the expected
    format or constraints, separate from Pydantic validation.
    """

    pass
