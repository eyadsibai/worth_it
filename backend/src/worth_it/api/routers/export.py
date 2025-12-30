"""Export endpoints for valuation reports."""

from __future__ import annotations

import csv
import json
from io import BytesIO, StringIO

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from worth_it.models import FirstChicagoExportRequest, PreRevenueExportRequest
from worth_it.reports import (
    build_first_chicago_report,
    build_pre_revenue_report,
    generate_pdf_report,
)

router = APIRouter(prefix="/api/export", tags=["export"])


def _create_file_response(
    content: bytes | str,
    filename: str,
    media_type: str,
) -> StreamingResponse:
    """Create a streaming file response for downloads.

    Args:
        content: File content (bytes or string)
        filename: Name for the downloaded file
        media_type: MIME type for the response

    Returns:
        StreamingResponse with download headers
    """
    if isinstance(content, str):
        content = content.encode("utf-8")
    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _safe_filename(name: str) -> str:
    """Create a safe filename from company name.

    Args:
        name: Original name

    Returns:
        Sanitized filename-safe string
    """
    return name.replace(" ", "_").replace("/", "-").replace("\\", "-")


@router.post("/first-chicago")
async def export_first_chicago(
    request: FirstChicagoExportRequest,
) -> StreamingResponse:
    """Export First Chicago valuation in various formats.

    Supports PDF, JSON, and CSV export formats.
    """
    safe_name = _safe_filename(request.company_name)

    if request.format == "pdf":
        report_data = build_first_chicago_report(
            company_name=request.company_name,
            result=request.result,
            params=request.params,
            industry=request.industry,
            monte_carlo_result=request.monte_carlo_result,
        )
        pdf_bytes = generate_pdf_report(report_data)
        return _create_file_response(
            pdf_bytes,
            f"{safe_name}_valuation.pdf",
            "application/pdf",
        )

    elif request.format == "json":
        json_data = {
            "company_name": request.company_name,
            "method": "First Chicago",
            "valuation": request.result,
            "parameters": request.params,
            "monte_carlo": request.monte_carlo_result,
        }
        return _create_file_response(
            json.dumps(json_data, indent=2),
            f"{safe_name}_valuation.json",
            "application/json",
        )

    elif request.format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", request.company_name])
        writer.writerow(["Method", "First Chicago"])
        writer.writerow(["Present Value", request.result.get("present_value", 0)])
        writer.writerow(["Weighted Value", request.result.get("weighted_value", 0)])
        for name, value in request.result.get("scenario_values", {}).items():
            writer.writerow([f"{name} Exit Value", value])
        return _create_file_response(
            output.getvalue(),
            f"{safe_name}_valuation.csv",
            "text/csv",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")


@router.post("/pre-revenue")
async def export_pre_revenue(request: PreRevenueExportRequest) -> StreamingResponse:
    """Export pre-revenue valuation in various formats.

    Supports PDF, JSON, and CSV export formats.
    """
    safe_name = _safe_filename(request.company_name)
    method_slug = request.method_name.lower().replace(" ", "_")

    if request.format == "pdf":
        report_data = build_pre_revenue_report(
            company_name=request.company_name,
            method_name=request.method_name,
            result=request.result,
            params=request.params,
            industry=request.industry,
        )
        pdf_bytes = generate_pdf_report(report_data)
        return _create_file_response(
            pdf_bytes,
            f"{safe_name}_{method_slug}_valuation.pdf",
            "application/pdf",
        )

    elif request.format == "json":
        json_data = {
            "company_name": request.company_name,
            "method": request.method_name,
            "valuation": request.result,
            "parameters": request.params,
        }
        return _create_file_response(
            json.dumps(json_data, indent=2),
            f"{safe_name}_valuation.json",
            "application/json",
        )

    elif request.format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Company", request.company_name])
        writer.writerow(["Method", request.method_name])
        writer.writerow(["Valuation", request.result.get("valuation", 0)])
        # Add factors if present
        for factor in request.result.get("factors", []):
            writer.writerow([factor.get("name", "Unknown"), factor.get("value", 0)])
        return _create_file_response(
            output.getvalue(),
            f"{safe_name}_valuation.csv",
            "text/csv",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
