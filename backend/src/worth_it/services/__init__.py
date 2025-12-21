"""
Services package for business logic orchestration.

This package provides service classes that encapsulate business logic,
separating it from API endpoint handlers. Services handle:
- Data transformation (request → domain types → response)
- Column mapping between backend and frontend formats
- Complex multi-step business operations

Services import from calculations/ for core logic but add:
- Request/response transformation
- Error handling and validation
- Business rules and orchestration
"""

from worth_it.services.cap_table_service import CapTableService
from worth_it.services.serializers import (
    ResponseMapper,
    convert_sim_param_configs_to_internal,
    convert_typed_base_params_to_internal,
    convert_typed_startup_params_to_internal,
)
from worth_it.services.startup_service import StartupService

__all__ = [
    "StartupService",
    "CapTableService",
    "ResponseMapper",
    "convert_typed_base_params_to_internal",
    "convert_sim_param_configs_to_internal",
    "convert_typed_startup_params_to_internal",
]
